// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title StakingManager
/// @notice Manages Compute Node and Attribution Node collateral staking, unstaking
///         with a cooldown period, and slashing execution (whitepaper Section 3.2).
contract StakingManager is AccessControl, ReentrancyGuard {
    bytes32 public constant SLASHER_ROLE = keccak256("SLASHER_ROLE");

    IERC20 public immutable vmind;
    uint256 public immutable minStake;
    uint256 public immutable unstakeCooldown;

    struct Stake {
        uint256 amount;
        uint256 unstakeRequestedAt;
        uint256 pendingUnstake;
        bool jailed;
        uint256 jailedUntil;
    }

    mapping(address => Stake) public stakes;

    event Staked(address indexed node, uint256 amount);
    event UnstakeRequested(address indexed node, uint256 amount, uint256 availableAt);
    event UnstakeWithdrawn(address indexed node, uint256 amount);
    event Slashed(address indexed node, uint256 amount, string reason);
    event Jailed(address indexed node, uint256 until);

    constructor(address vmindToken, uint256 _minStake, uint256 _unstakeCooldown) {
        require(vmindToken != address(0), "zero address");
        vmind = IERC20(vmindToken);
        minStake = _minStake;
        unstakeCooldown = _unstakeCooldown;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(SLASHER_ROLE, msg.sender);
    }

    /// @notice Stake VMIND collateral to become an eligible Compute or Attribution Node.
    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "amount must be > 0");
        require(!stakes[msg.sender].jailed, "node is jailed");
        require(vmind.transferFrom(msg.sender, address(this), amount), "transfer failed");
        stakes[msg.sender].amount += amount;
        emit Staked(msg.sender, amount);
    }

    /// @notice Whether a node currently meets the minimum collateral requirement and is not jailed.
    function isEligible(address node) external view returns (bool) {
        Stake storage s = stakes[node];
        return s.amount >= minStake && !s.jailed;
    }

    /// @notice Begin the unstake cooldown for a given amount of collateral.
    function requestUnstake(uint256 amount) external {
        Stake storage s = stakes[msg.sender];
        require(amount > 0 && amount <= s.amount, "invalid amount");
        s.amount -= amount;
        s.pendingUnstake += amount;
        s.unstakeRequestedAt = block.timestamp;
        emit UnstakeRequested(msg.sender, amount, block.timestamp + unstakeCooldown);
    }

    /// @notice Withdraw collateral after the cooldown period has elapsed.
    function withdrawUnstaked() external nonReentrant {
        Stake storage s = stakes[msg.sender];
        require(s.pendingUnstake > 0, "nothing pending");
        require(block.timestamp >= s.unstakeRequestedAt + unstakeCooldown, "cooldown active");
        uint256 amount = s.pendingUnstake;
        s.pendingUnstake = 0;
        require(vmind.transfer(msg.sender, amount), "transfer failed");
        emit UnstakeWithdrawn(msg.sender, amount);
    }

    /// @notice Slash a node's staked collateral. Restricted to the SLASHER_ROLE
    ///         (granted to InferenceManager / Governance in deployment).
    /// @dev Applies against the node's TOTAL collateral — active stake (`amount`)
    ///      plus any collateral already mid-cooldown (`pendingUnstake`) — so that
    ///      calling requestUnstake() beforehand cannot reduce or evade a slash.
    ///      Active stake is reduced first, with any remainder taken from
    ///      pendingUnstake; withdrawUnstaked() still enforces the unchanged
    ///      cooldown on whatever pendingUnstake remains afterward.
    /// @param bps Basis points of the node's total collateral to slash (e.g. 500 = 5%, per Section 3.2 double-signing penalty).
    function slash(address node, uint256 bps, string calldata reason) external onlyRole(SLASHER_ROLE) {
        require(bps <= 10_000, "bps out of range");
        Stake storage s = stakes[node];
        uint256 total = s.amount + s.pendingUnstake;
        uint256 penalty = (total * bps) / 10_000;

        uint256 fromActive = penalty > s.amount ? s.amount : penalty;
        s.amount -= fromActive;

        uint256 remaining = penalty - fromActive;
        if (remaining > 0) {
            uint256 fromPending = remaining > s.pendingUnstake ? s.pendingUnstake : remaining;
            s.pendingUnstake -= fromPending;
        }

        emit Slashed(node, penalty, reason);
    }

    /// @notice Jail a node for a fixed period following a safety violation (Section 3.2: 30 days for double-signing).
    function jail(address node, uint256 duration) external onlyRole(SLASHER_ROLE) {
        Stake storage s = stakes[node];
        s.jailed = true;
        s.jailedUntil = block.timestamp + duration;
        emit Jailed(node, s.jailedUntil);
    }

    /// @notice Release a node from jail once its jail period has elapsed.
    function unjail() external {
        Stake storage s = stakes[msg.sender];
        require(s.jailed, "not jailed");
        require(block.timestamp >= s.jailedUntil, "jail period active");
        s.jailed = false;
    }
}
