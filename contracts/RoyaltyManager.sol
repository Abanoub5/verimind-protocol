// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title RoyaltyManager
/// @notice Routes micro-royalty payments to data creators based on normalized
/// attribution scores submitted off-chain in basis points.
contract RoyaltyManager is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant SETTLER_ROLE = keccak256("SETTLER_ROLE");

    IERC20 public immutable vmind;

    mapping(bytes32 => bool) public settled;

    event RoyaltyDistributed(
        bytes32 indexed requestId,
        address indexed creator,
        uint256 amount,
        uint256 scoreBps
    );

    event RoyaltyBatchSettled(
        bytes32 indexed requestId,
        uint256 totalAmount,
        uint256 creatorCount
    );

    constructor(address vmindToken) {
        require(vmindToken != address(0), "zero address");
        vmind = IERC20(vmindToken);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function distributeRoyalties(
        bytes32 requestId,
        uint256 totalAmount,
        address[] calldata creators,
        uint256[] calldata scoresBps
    ) external onlyRole(SETTLER_ROLE) nonReentrant {
        require(!settled[requestId], "requestId already settled");
        require(totalAmount > 0, "zero amount");
        require(creators.length == scoresBps.length, "length mismatch");
        require(creators.length > 0, "no creators");
        require(
            vmind.balanceOf(address(this)) >= totalAmount,
            "insufficient balance"
        );

        uint256 sumBps;

        for (uint256 i = 0; i < scoresBps.length; i++) {
            require(creators[i] != address(0), "zero address creator");

            for (uint256 j = 0; j < i; j++) {
                require(
                    creators[i] != creators[j],
                    "duplicate creator"
                );
            }

            sumBps += scoresBps[i];
        }

        require(sumBps == 10_000, "scores must sum to 10000 bps");

        settled[requestId] = true;

        uint256 distributed;

        for (uint256 i = 0; i < creators.length; i++) {
            uint256 amount =
                (totalAmount * scoresBps[i]) / 10_000;

            distributed += amount;

            if (amount > 0) {
                vmind.safeTransfer(creators[i], amount);

                emit RoyaltyDistributed(
                    requestId,
                    creators[i],
                    amount,
                    scoresBps[i]
                );
            }
        }

        emit RoyaltyBatchSettled(
            requestId,
            distributed,
            creators.length
        );
    }
}
