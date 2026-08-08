// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./EscrowVault.sol";
import "./StakingManager.sol";
import "./interfaces/IZKVerifier.sol";

/// @title InferenceManager
/// @notice Core protocol contract implementing the inference request lifecycle
///         state machine defined in whitepaper Section 7:
///         STATE_IDLE -> STATE_REQUEST_SUBMITTED -> STATE_PROCESSING ->
///         STATE_PROOF_SUBMITTED -> STATE_VERIFIED -> STATE_SETTLED
///                                      \-> STATE_FAILED (timeout / slashing)
contract InferenceManager is AccessControl {
    enum State {
        IDLE,
        REQUEST_SUBMITTED,
        PROCESSING,
        PROOF_SUBMITTED,
        VERIFIED,
        SETTLED,
        FAILED
    }

    struct Request {
        address client;
        address assignedNode;
        uint256 maxFee;
        bytes32 promptHash;
        State state;
        uint256 submittedAt;
    }

    EscrowVault public immutable escrowVault;
    StakingManager public immutable stakingManager;
    IZKVerifier public zkVerifier; // swappable: MockZKVerifier today, real verifier post-Section-4 implementation

    uint256 public processingTimeout; // seconds before an unprocessed request can be marked FAILED

    mapping(bytes32 => Request) public requests;

    event RequestSubmitted(bytes32 indexed requestId, address indexed client, uint256 maxFee, bytes32 promptHash);
    event NodeAssigned(bytes32 indexed requestId, address indexed node);
    event ProofSubmitted(bytes32 indexed requestId, address indexed node);
    event RequestVerified(bytes32 indexed requestId);
    event RequestSettled(bytes32 indexed requestId, address indexed node, uint256 nodePayment);
    event RequestFailed(bytes32 indexed requestId, string reason);

    constructor(address escrowVaultAddr, address stakingManagerAddr, address zkVerifierAddr, uint256 _processingTimeout) {
        require(escrowVaultAddr != address(0) && stakingManagerAddr != address(0) && zkVerifierAddr != address(0), "zero address");
        escrowVault = EscrowVault(escrowVaultAddr);
        stakingManager = StakingManager(stakingManagerAddr);
        zkVerifier = IZKVerifier(zkVerifierAddr);
        processingTimeout = _processingTimeout;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @notice Step 1 (Section 2.2): Client submits a prompt and escrows the max fee.
    function submitRequest(bytes32 requestId, uint256 maxFee, bytes32 promptHash) external {
        require(requests[requestId].state == State.IDLE, "request already exists");
        requests[requestId] = Request({
            client: msg.sender,
            assignedNode: address(0),
            maxFee: maxFee,
            promptHash: promptHash,
            state: State.REQUEST_SUBMITTED,
            submittedAt: block.timestamp
        });
        escrowVault.escrow(requestId, msg.sender, maxFee);
        emit RequestSubmitted(requestId, msg.sender, maxFee, promptHash);
    }

    /// @notice Step 2 (Section 2.2): An eligible, staked Compute Node picks up the work unit.
    function assignNode(bytes32 requestId) external {
        Request storage r = requests[requestId];
        require(r.state == State.REQUEST_SUBMITTED, "wrong state");
        require(stakingManager.isEligible(msg.sender), "node not eligible: insufficient stake or jailed");
        r.assignedNode = msg.sender;
        r.state = State.PROCESSING;
        emit NodeAssigned(requestId, msg.sender);
    }

    /// @notice Step 3 (Section 2.2, 4.1): Node submits its ZK proof of the forward pass.
    /// @param proof The SNARK proof bytes.
    /// @param publicInputs ABI-encoded public inputs bound to this request (prompt hash, output commitment).
    function submitProof(bytes32 requestId, bytes calldata proof, bytes calldata publicInputs) external {
        Request storage r = requests[requestId];
        require(r.state == State.PROCESSING, "wrong state");
        require(msg.sender == r.assignedNode, "not assigned node");
        r.state = State.PROOF_SUBMITTED;
        emit ProofSubmitted(requestId, msg.sender);

        bool valid = zkVerifier.verifyProof(proof, publicInputs);
        if (valid) {
            r.state = State.VERIFIED;
            emit RequestVerified(requestId);
        } else {
            r.state = State.FAILED;
            stakingManager.slash(r.assignedNode, 10_000, "invalid ZK proof submission"); // full compute-collateral forfeiture per Section 3.2
            escrowVault.refund(requestId, r.client);
            emit RequestFailed(requestId, "invalid proof");
        }
    }

    /// @notice Step 4 (Section 2.2): Settle payment to the compute node once verified.
    ///         Royalty distribution to data creators is handled separately by
    ///         RoyaltyManager, which the caller funds from the same escrow release.
    function settle(bytes32 requestId, uint256 nodePayment) external {
        Request storage r = requests[requestId];
        require(r.state == State.VERIFIED, "wrong state");
        require(nodePayment <= r.maxFee, "payment exceeds escrow");
        r.state = State.SETTLED;
        escrowVault.release(requestId, r.assignedNode, nodePayment);
        emit RequestSettled(requestId, r.assignedNode, nodePayment);
    }

    /// @notice Anyone can trigger a timeout failure if a node never processes the request.
    function failOnTimeout(bytes32 requestId) external {
        Request storage r = requests[requestId];
        require(r.state == State.REQUEST_SUBMITTED || r.state == State.PROCESSING, "wrong state");
        require(block.timestamp >= r.submittedAt + processingTimeout, "timeout not reached");
        r.state = State.FAILED;
        escrowVault.refund(requestId, r.client);
        emit RequestFailed(requestId, "processing timeout");
    }

    /// @notice Governance-gated: swap the verifier implementation, e.g. MockZKVerifier -> real Halo2/Plonky3 verifier.
    function setZKVerifier(address newVerifier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newVerifier != address(0), "zero address");
        zkVerifier = IZKVerifier(newVerifier);
    }
}
