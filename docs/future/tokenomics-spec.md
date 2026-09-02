# Tokenomics Specification

**Status: Mixed.** Fixed-supply allocation minting is **IMPLEMENTED**. Cliff/vesting enforcement is **PLANNED** — no vesting logic exists anywhere in this repository. This document exists specifically to make that gap unambiguous before the prototype is demonstrated to anyone.

## 1. What `VMINDToken.sol` Actually Does (IMPLEMENTED)

`contracts/VMINDToken.sol` is a standard OpenZeppelin `ERC20` + `ERC20Burnable` + `AccessControl` token. At deployment, its constructor mints the **entire fixed supply in one transaction**, split across five recipient addresses passed as constructor arguments:

```solidity
// contracts/VMINDToken.sol — constructor, unmodified, quoted for reference
_mint(communityRewardsPool, COMMUNITY_DEPIN_ALLOCATION);   // 40%
_mint(ecosystemGrantsPool, ECOSYSTEM_GRANTS_ALLOCATION);   // 20%
_mint(seedInvestorsVesting, SEED_INVESTORS_ALLOCATION);    // 15%
_mint(coreTeamVesting, CORE_TEAM_ALLOCATION);              // 15%
_mint(treasury, TREASURY_LIQUIDITY_ALLOCATION);            // 10%
```

| Allocation | % of 1,000,000,000 fixed supply | Recipient parameter | Whitepaper §9.1 target schedule |
|---|---|---|---|
| Community & DePIN Node Rewards | 40% | `communityRewardsPool` | Emitted over 10 years via logarithmic decay |
| Ecosystem & Creator Grants | 20% | `ecosystemGrantsPool` | Linear vesting over 4 years |
| Seed & Strategic Investors | 15% | `seedInvestorsVesting` | 1-year cliff, 24-month linear vesting |
| Core Team & Contributors | 15% | `coreTeamVesting` | 1-year cliff, 36-month linear vesting |
| Protocol Treasury & Liquidity | 10% | `treasury` | Unlocked at TGE for market stability |

## 2. The Gap: Naming vs. Behavior (Read This Carefully)

The constructor parameter names — `seedInvestorsVesting`, `coreTeamVesting`, `communityRewardsPool`, `ecosystemGrantsPool` — **describe the whitepaper's intent**, not the contract's actual behavior. `VMINDToken.sol`'s own NatSpec comment says this explicitly:

> "Vesting/cliff logic for investor and team allocations is handled by a separate vesting contract (**not yet implemented**) — this contract only mints to the designated allocation addresses."

In concrete terms:

| What the whitepaper describes | What `VMINDToken.sol` actually does today |
|---|---|
| Seed investors: 1-year cliff, then 24-month linear vesting | **Not enforced.** Whatever address is passed as `seedInvestorsVesting` receives its full 15% allocation as immediately transferable ERC-20 balance, the moment the constructor runs. If that address is an EOA or multisig with no lock, the tokens can be moved/sold instantly. |
| Core team: 1-year cliff, then 36-month linear vesting | **Not enforced.** Same as above — `coreTeamVesting` receives its full 15% immediately and unconditionally. |
| Community/DePIN rewards: emitted over 10 years, logarithmic decay | **Not enforced.** The full 40% is minted in one transaction at deployment to `communityRewardsPool`. There is no emission schedule contract, no decay curve, and no time-locking anywhere in this repo. |
| Ecosystem grants: linear vesting over 4 years | **Not enforced.** Full 20% minted immediately to `ecosystemGrantsPool`. |
| Treasury: unlocked at TGE | **Matches.** This is the one allocation where "immediately liquid" is the actual whitepaper-specified behavior, so this case has no gap. |

**Plain statement for anyone reviewing this repo or a grant application built on it:** if `VMINDToken` were deployed exactly as written today with EOA addresses for the five parameters, **100% of the 1B supply would be liquid and transferable from block one**, regardless of the vesting schedules described in the whitepaper. Achieving the whitepaper's actual vesting/emission behavior requires building the "separate vesting contract" the NatSpec comment refers to — this does not exist in this repository.

## 3. Why This Was Built This Way (Sequencing, Not Oversight)

Per the explicit scope of this task, vesting implementation is intentionally deferred:

- The prototype's priority so far has been proving the **settlement-layer mechanics** (escrow, staking/slashing, attribution-weighted royalty payout, state machine) work correctly — see `docs/architecture/system-architecture.md`.
- Token distribution and vesting is a **separate, well-understood engineering problem** (time-locked/cliff vesting contracts are a common, mostly-solved pattern — e.g. OpenZeppelin's `VestingWallet`) that does not need to be built before the harder, protocol-specific mechanics are validated.
- Building vesting now, before the rest of the settlement flow was demonstrable, would not have added confidence in the parts of the protocol that are actually novel.

This is recorded here as a deliberate sequencing decision per current task instructions, not as a claim that vesting is unimportant or unnecessary before any real token deployment.

## 4. What "Implementing Vesting" Would Require (PLANNED, Not Started)

None of the following exist in this repository:

| Component | Status |
|---|---|
| Time-locked vesting contract (cliff + linear release) for seed investors | PLANNED |
| Time-locked vesting contract (cliff + linear release) for core team | PLANNED |
| Logarithmic-decay emission schedule contract for community/DePIN rewards | PLANNED |
| Linear-vesting contract for ecosystem/creator grants | PLANNED |
| Any modification to `VMINDToken.sol`'s constructor to mint into vesting contracts instead of directly to EOAs | PLANNED — **explicitly out of scope for the current task** |

## 5. Non-Claims

This document does not claim, and no code in this repository implements:
- Any on-chain cliff period
- Any on-chain linear or logarithmic release schedule
- Any lock-up enforced by a smart contract on any of the five allocations
- Any distinction, at the smart-contract level, between the treasury allocation (correctly immediately liquid) and the other four allocations (which the whitepaper specifies as time-locked but which are, in the current code, equally immediately liquid)

## 6. Related Documents

- [`../architecture/system-architecture.md`](../architecture/system-architecture.md) — overall implemented-vs-planned component inventory
- [`../security/trust-assumptions.md`](../security/trust-assumptions.md) — trust assumptions for other actors in the system
