// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title VMINDToken
/// @notice ERC-20 compliant utility token for the VeriMind Protocol.
/// @dev Fixed total supply of 1,000,000,000 VMIND, minted at deployment to the
///      allocations defined in the tokenomics spec (whitepaper Section 9.1):
///      40% Community & DePIN Rewards, 20% Ecosystem & Creator Grants,
///      15% Seed & Strategic Investors, 15% Core Team & Contributors,
///      10% Protocol Treasury & Liquidity.
///      Vesting/cliff logic for investor and team allocations is handled by a
///      separate vesting contract (not yet implemented) — this contract only
///      mints to the designated allocation addresses.
contract VMINDToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10 ** 18;

    uint256 public constant COMMUNITY_DEPIN_ALLOCATION = (TOTAL_SUPPLY * 40) / 100;
    uint256 public constant ECOSYSTEM_GRANTS_ALLOCATION = (TOTAL_SUPPLY * 20) / 100;
    uint256 public constant SEED_INVESTORS_ALLOCATION = (TOTAL_SUPPLY * 15) / 100;
    uint256 public constant CORE_TEAM_ALLOCATION = (TOTAL_SUPPLY * 15) / 100;
    uint256 public constant TREASURY_LIQUIDITY_ALLOCATION = (TOTAL_SUPPLY * 10) / 100;

    /// @param communityRewardsPool Address of the DePIN/community rewards emission contract
    /// @param ecosystemGrantsPool Address of the ecosystem & creator grants vesting contract
    /// @param seedInvestorsVesting Address of the seed/strategic investor vesting contract
    /// @param coreTeamVesting Address of the core team vesting contract
    /// @param treasury Address of the protocol treasury (unlocked at TGE)
    constructor(
        address communityRewardsPool,
        address ecosystemGrantsPool,
        address seedInvestorsVesting,
        address coreTeamVesting,
        address treasury
    ) ERC20("VeriMind", "VMIND") {
        require(communityRewardsPool != address(0), "zero address");
        require(ecosystemGrantsPool != address(0), "zero address");
        require(seedInvestorsVesting != address(0), "zero address");
        require(coreTeamVesting != address(0), "zero address");
        require(treasury != address(0), "zero address");

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);

        _mint(communityRewardsPool, COMMUNITY_DEPIN_ALLOCATION);
        _mint(ecosystemGrantsPool, ECOSYSTEM_GRANTS_ALLOCATION);
        _mint(seedInvestorsVesting, SEED_INVESTORS_ALLOCATION);
        _mint(coreTeamVesting, CORE_TEAM_ALLOCATION);
        _mint(treasury, TREASURY_LIQUIDITY_ALLOCATION);
    }

    /// @notice Emergency/administrative mint, restricted to MINTER_ROLE.
    /// @dev Intentionally NOT used at deployment — all TGE supply is minted in
    ///      the constructor. This exists only for governance-approved edge cases
    ///      (e.g. bridging supply). Expected to be renounced or DAO-gated post-launch.
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
}
