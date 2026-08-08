// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title RoyaltyManager
/// @notice Routes micro-royalty payments to data creators based on the normalized
///         attribution score vector S = [s_1, ..., s_k] computed off-chain by
///         Attribution Nodes (whitepaper Section 5.1). The off-chain cosine-similarity
///         + softmax computation is reference-implemented in attribution-engine/attribution.py;
///         this contract only trusts and settles the resulting scores on-chain.
/// @dev Scores are submitted in basis points (sum must equal 10_000 = 100%) to avoid
///      fixed-point math on-chain — the softmax normalization itself happens off-chain.
contract RoyaltyManager is AccessControl, ReentrancyGuard {
    bytes32 public constant SETTLER_ROLE = keccak256("SETTLER_ROLE");

    IERC20 public immutable vmind;

    /// @notice Tracks which requestIds have already had royalties distributed,
    ///         preventing the same request from being settled more than once.
    mapping(bytes32 => bool) public settled;

    event RoyaltyDistributed(bytes32 indexed requestId, address indexed creator, uint256 amount, uint256 scoreBps);
    event RoyaltyBatchSettled(bytes32 indexed requestId, uint256 totalAmount, uint256 creatorCount);

    constructor(address vmindToken) {
        require(vmindToken != address(0), "zero address");
        vmind = IERC20(vmindToken);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @notice Distribute a royalty pool across data creators according to their
    ///         normalized attribution scores. Each requestId may only be settled once.
    /// @param requestId The inference request this royalty payment corresponds to.
    /// @param totalAmount Total VMIND already transferred to this contract for distribution
    ///        (typically released from EscrowVault by InferenceManager beforehand).
    /// @param creators Addresses of the top-K attributed data creators (Section 5.1).
    /// @param scoresBps Basis-point attribution scores per creator; must sum to 10_000.
    function distributeRoyalties(
        bytes32 requestId,
        uint256 totalAmount,
        address[] calldata creators,
        uint256[] calldata scoresBps
    ) external onlyRole(SETTLER_ROLE) nonReentrant {
        require(!settled[requestId], "requestId already settled");
        require(creators.length == scoresBps.length, "length mismatch");
        require(creators.length > 0, "no creators");

        uint256 sumBps;
        for (uint256 i = 0; i < scoresBps.length; i++) {
            sumBps += scoresBps[i];
        }
        require(sumBps == 10_000, "scores must sum to 10000 bps");

        settled[requestId] = true;

        uint256 distributed;
        for (uint256 i = 0; i < creators.length; i++) {
            require(creators[i] != address(0), "zero address creator");
            uint256 amount = (totalAmount * scoresBps[i]) / 10_000;
            distributed += amount;
            if (amount > 0) {
                require(vmind.transfer(creators[i], amount), "transfer failed");
                emit RoyaltyDistributed(requestId, creators[i], amount, scoresBps[i]);
            }
        }

        emit RoyaltyBatchSettled(requestId, distributed, creators.length);
    }
}
