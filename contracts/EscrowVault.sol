// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title EscrowVault
/// @notice Holds client inference-gas fees from submission until settlement or refund
///         (whitepaper Section 2.2, Section 6). Only the InferenceManager contract
///         (granted CONTROLLER_ROLE at deployment) can move funds out of escrow.
contract EscrowVault is AccessControl, ReentrancyGuard {
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");

    IERC20 public immutable vmind;

    mapping(bytes32 => uint256) public escrowed; // requestId => amount

    event Escrowed(bytes32 indexed requestId, address indexed client, uint256 amount);
    event Released(bytes32 indexed requestId, address indexed to, uint256 amount);
    event Refunded(bytes32 indexed requestId, address indexed client, uint256 amount);

    constructor(address vmindToken) {
        require(vmindToken != address(0), "zero address");
        vmind = IERC20(vmindToken);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @notice Escrow a client's max fee for a given inference request.
    function escrow(bytes32 requestId, address client, uint256 amount) external onlyRole(CONTROLLER_ROLE) nonReentrant {
        require(escrowed[requestId] == 0, "already escrowed");
        require(vmind.transferFrom(client, address(this), amount), "transfer failed");
        escrowed[requestId] = amount;
        emit Escrowed(requestId, client, amount);
    }

    /// @notice Release escrowed funds to a recipient (compute node, royalty manager, etc.)
    ///         after settlement. Called by InferenceManager once a proof is verified.
    function release(bytes32 requestId, address to, uint256 amount) external onlyRole(CONTROLLER_ROLE) nonReentrant {
        require(amount <= escrowed[requestId], "exceeds escrowed amount");
        escrowed[requestId] -= amount;
        require(vmind.transfer(to, amount), "transfer failed");
        emit Released(requestId, to, amount);
    }

    /// @notice Refund the remaining escrow to the client, e.g. on STATE_FAILED (timeout).
    function refund(bytes32 requestId, address client) external onlyRole(CONTROLLER_ROLE) nonReentrant {
        uint256 amount = escrowed[requestId];
        require(amount > 0, "nothing escrowed");
        escrowed[requestId] = 0;
        require(vmind.transfer(client, amount), "transfer failed");
        emit Refunded(requestId, client, amount);
    }
}
