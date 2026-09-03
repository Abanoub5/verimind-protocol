```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title VMINDToken
/// @notice Fixed-supply ERC-20 utility token for the VeriMind Protocol.
contract VMINDToken is ERC20, ERC20Burnable, AccessControl {
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10 ** 18;

    uint256 public constant COMMUNITY_DEPIN_ALLOCATION =
        (TOTAL_SUPPLY * 40) / 100;

    uint256 public constant ECOSYSTEM_GRANTS_ALLOCATION =
        (TOTAL_SUPPLY * 20) / 100;

    uint256 public constant SEED_INVESTORS_ALLOCATION =
        (TOTAL_SUPPLY * 15) / 100;

    uint256 public constant CORE_TEAM_ALLOCATION =
        (TOTAL_SUPPLY * 15) / 100;

    uint256 public constant TREASURY_LIQUIDITY_ALLOCATION =
        (TOTAL_SUPPLY * 10) / 100;

    constructor(
        address communityRewardsPool,
        address ecosystemGrantsPool,
        address seedInvestorsVesting,
        address coreTeamVesting,
        address treasury
    ) ERC20("VeriMind", "VMIND") {
        require(
            communityRewardsPool != address(0) &&
            ecosystemGrantsPool != address(0) &&
            seedInvestorsVesting != address(0) &&
            coreTeamVesting != address(0) &&
            treasury != address(0),
            "zero address"
        );

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        _mint(
            communityRewardsPool,
            COMMUNITY_DEPIN_ALLOCATION
        );

        _mint(
            ecosystemGrantsPool,
            ECOSYSTEM_GRANTS_ALLOCATION
        );

        _mint(
            seedInvestorsVesting,
            SEED_INVESTORS_ALLOCATION
        );

        _mint(
            coreTeamVesting,
            CORE_TEAM_ALLOCATION
        );

        _mint(
            treasury,
            TREASURY_LIQUIDITY_ALLOCATION
        );
    }
}
