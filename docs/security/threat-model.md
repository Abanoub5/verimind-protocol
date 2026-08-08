# Threat Model

**Status: Analysis document — no code changes implied.** This threat model covers only the code that exists in this repository today (`contracts/`). It intentionally does not extend claims to the unbuilt consensus, networking, or ZK-circuit layers beyond flagging where those gaps create risk.

## 1. Scope

In scope: `VMINDToken.sol`, `StakingManager.sol`, `EscrowVault.sol`, `InferenceManager.sol`, `RoyaltyManager.sol`, `Governance.sol`, `MockZKVerifier.sol`.

Out of scope (not yet built, see `docs/ROADMAP.md`): consensus/networking layer, real ZK verifier, Compute/Attribution Node client software, RPC/API server.

## 2. Assets

| Asset | Held by | At risk from |
|---|---|---|
| Client escrowed fees | `EscrowVault` | Unauthorized `release()`/`refund()` calls, reentrancy |
| Node staked collateral | `StakingManager` | Unauthorized `slash()` calls, reentrancy on withdrawal |
| Royalty pool funds | `RoyaltyManager` (transiently) | Unauthorized `distributeRoyalties()` calls |
| Governance authority | `Governance`, `DEFAULT_ADMIN_ROLE` holders | Compromised admin key, low-quorum capture |

## 3. Threats and Current Mitigations

| # | Threat | Mitigation in this repo | Residual risk |
|---|---|---|---|
| T1 | Reentrancy on token transfer callbacks | All fund-moving functions in `EscrowVault`, `StakingManager`, `RoyaltyManager` use OpenZeppelin `ReentrancyGuard` | Low, assuming `VMINDToken` itself has no malicious hooks (it is a standard ERC-20 with no `_beforeTokenTransfer` hook to external contracts) |
| T2 | Unauthorized fund movement (e.g. arbitrary address calling `EscrowVault.release`) | `onlyRole(CONTROLLER_ROLE)` restricts `EscrowVault` and `SLASHER_ROLE` restricts `StakingManager` slashing | Depends entirely on correct role assignment at deployment — see T7 |
| T3 | Fake/invalid ZK proof accepted as valid | **Not mitigated** — `MockZKVerifier` accepts any non-empty `proof` bytes with zero cryptographic checking | **High**, by design, until the real verifier (whitepaper §4) replaces it. This repo must never be deployed to a live network with `MockZKVerifier` still wired in. |
| T4 | Compute Node claims a request it cannot fulfill, then stalls | `failOnTimeout()` allows any address to force a `FAILED` state and refund after `processingTimeout` | Low — timeout is a fixed constructor parameter, not governance-adjustable in the current contract |
| T5 | Node submits an invalid proof to grief a client (no intent to complete) | Node forfeits 100% of staked collateral (`slash(node, 10000, ...)`) | Low, assuming `minStake` is set meaningfully above the cost of the fee being griefed |
| T6 | Royalty scores manipulated (e.g. attribution submitted for the wrong creators) | **Not mitigated on-chain.** `RoyaltyManager.distributeRoyalties` trusts whatever `creators[]`/`scoresBps[]` array the caller (a `SETTLER_ROLE` holder) submits | **High** until an automated, consensus-verified Attribution Node process replaces manual/trusted submission — see [`attack-scenarios.md`](./attack-scenarios.md#royalty-score-manipulation) |
| T7 | Deployer/admin key compromise | None beyond standard `AccessControl` — a single `DEFAULT_ADMIN_ROLE` key can `setZKVerifier`, grant/revoke roles | **High** in current form; production deployment should move `DEFAULT_ADMIN_ROLE` to a multisig or the `Governance` contract, not an EOA |
| T8 | Governance quorum capture via flash-loaned or otherwise transient token balance | `Governance.vote()` reads live `balanceOf` at vote time with no snapshot mechanism | **High** — see [`attack-scenarios.md`](./attack-scenarios.md#governance-flash-loan-voting) |

## 4. Explicitly Out of Scope for This Repository's Current Threat Surface

These are real risks for the *protocol as described in the whitepaper*, but there is no code in this repo that implements the relevant mechanism yet, so there is nothing to analyze concretely:

- Validator double-signing / consensus safety (whitepaper §3) — no consensus client exists
- DePIN hardware attestation spoofing — no hardware integration exists
- Cross-node vector retrieval consensus manipulation (whitepaper §8) — no networked Attribution Node exists

These are tracked so they are not forgotten, not because they are currently exploitable in this repository.

## 5. Related Documents

- [`trust-assumptions.md`](./trust-assumptions.md) — what each actor is assumed to do honestly vs. adversarially
- [`attack-scenarios.md`](./attack-scenarios.md) — worked examples of T3, T6, T8 above
- [`zk-security.md`](./zk-security.md) — detail on the mock verifier gap specifically
