// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./EscrowVault.sol";
import "./StakingManager.sol";
import "./interfaces/IZKVerifier.sol";

/// @title InferenceManager
/// @notice Core protocol contract implementing the inference request lifecycle.
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
    IZKVerifier public zkVerifier;

    uint256 public processingTimeout;

    mapping(bytes32 => Request) public requests;

    event RequestSubmitted(
        bytes32 indexed requestId,
        address indexed client,
        uint256 maxFee,
        bytes32 promptHash
    );
    event NodeAssigned(bytes32 indexed requestId, address indexed node);
    event ProofSubmitted(bytes32 indexed requestId, address indexed node);
    event RequestVerified(bytes32 indexed requestId);
    event RequestSettled(
        bytes32 indexed requestId,
        address indexed node,
        uint256 nodePayment
    );
    event RequestFailed(bytes32 indexed requestId, string reason);

    constructor(
        address escrowVaultAddr,
        address stakingManagerAddr,
        address zkVerifierAddr,
        uint256 _processingTimeout
    ) {
        require(
            escrowVaultAddr != address(0) &&
            stakingManagerAddr != address(0) &&
            zkVerifierAddr != address(0),
            "zero address"
        );

        escrowVault = EscrowVault(escrowVaultAddr);
        stakingManager = StakingManager(stakingManagerAddr);
        zkVerifier = IZKVerifier(zkVerifierAddr);
        processingTimeout = _processingTimeout;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function submitRequest(
        bytes32 requestId,
        uint256 maxFee,
        bytes32 promptHash
    ) external {
        require(
            requests[requestId].state == State.IDLE,
            "request already exists"
        );
        require(maxFee > 0, "zero fee");

        requests[requestId] = Request({
            client: msg.sender,
            assignedNode: address(0),
            maxFee: maxFee,
            promptHash: promptHash,
            state: State.REQUEST_SUBMITTED,
            submittedAt: block.timestamp
        });

        escrowVault.escrow(requestId, msg.sender, maxFee);

        emit RequestSubmitted(
            requestId,
            msg.sender,
            maxFee,
            promptHash
        );
    }

    function assignNode(bytes32 requestId) external {
        Request storage r = requests[requestId];

        require(
            r.state == State.REQUEST_SUBMITTED,
            "wrong state"
        );
        require(
            stakingManager.isEligible(msg.sender),
            "node not eligible"
        );

        r.assignedNode = msg.sender;
        r.state = State.PROCESSING;

        emit NodeAssigned(requestId, msg.sender);
    }

    function submitProof(
        bytes32 requestId,
        bytes calldata proof,
        bytes calldata publicInputs
    ) external {
        Request storage r = requests[requestId];

        require(
            r.state == State.PROCESSING,
            "wrong state"
        );
        require(
            msg.sender == r.assignedNode,
            "not assigned node"
        );

        r.state = State.PROOF_SUBMITTED;

        emit ProofSubmitted(requestId, msg.sender);

        bool valid = zkVerifier.verifyProof(
            proof,
            publicInputs
        );

        if (valid) {
            r.state = State.VERIFIED;
            emit RequestVerified(requestId);
        } else {
            r.state = State.FAILED;

            stakingManager.slash(
                r.assignedNode,
                10_000,
                "invalid ZK proof submission"
            );

            escrowVault.refund(
                requestId,
                r.client
            );

            emit RequestFailed(
                requestId,
                "invalid proof"
            );
        }
    }

    /// @notice Settles the full escrow amount to prevent funds
    ///         from remaining permanently locked.
    function settle(
        bytes32 requestId,
        uint256 nodePayment
    ) external {
        Request storage r = requests[requestId];

        require(
            r.state == State.VERIFIED,
            "wrong state"
        );
        require(
            nodePayment == r.maxFee,
            "payment must equal max fee"
        );

        r.state = State.SETTLED;

        escrowVault.release(
            requestId,
            r.assignedNode,
            nodePayment
        );

        emit RequestSettled(
            requestId,
            r.assignedNode,
            nodePayment
        );
    }

    function failOnTimeout(bytes32 requestId) external {
        Request storage r = requests[requestId];

        require(
            r.state == State.REQUEST_SUBMITTED ||
            r.state == State.PROCESSING,
            "wrong state"
        );

        require(
            block.timestamp >=
                r.submittedAt + processingTimeout,
            "timeout not reached"
        );

        r.state = State.FAILED;

        escrowVault.refund(
            requestId,
            r.client
        );

        emit RequestFailed(
            requestId,
            "processing timeout"
        );
    }

    function setZKVerifier(
        address newVerifier
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            newVerifier != address(0),
            "zero address"
        );

        zkVerifier = IZKVerifier(newVerifier);
    }
}
