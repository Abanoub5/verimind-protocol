# Attack Scenarios

**Status: Analysis document.** Worked examples of the highest-severity items from `threat-model.md`, written against the actual contract code in this repository so each scenario can be reproduced in a Hardhat test if desired.

## 1. Royalty Score Manipulation

**Ref: T6 in threat-model.md**

**Setup:** An address holding `RoyaltyManager.SETTLER_ROLE` calls `distributeRoyalties()` with an arbitrary `creators[]` array — for example, an address it controls — and `scoresBps[]` summing to `10000`, claiming 100% attribution.

**Why current code allows it:** `distributeRoyalties()` only validates internal arithmetic consistency (`sumBps == 10_000`) and non-zero addresses. It has no way to verify that the submitted scores were actually produced by running `attribution.py`'s cosine-similarity computation against real creator embeddings for a real inference output — that check would require either an on-chain commitment to the embeddings/scores at an earlier step, or a networked, staked, slashable Attribution Node whose output can be disputed.

```solidity
// contracts/RoyaltyManager.sol — the only checks performed today:
require(creators.length == scoresBps.length, "length mismatch");
require(sumBps == 10_000, "scores must sum to 10000 bps");
```

**Impact:** Total redirection of a royalty pool away from legitimate data creators.

**Mitigation status:** Not mitigated in this repo. This is the same gap noted in whitepaper §8 ("Oracle & Vector Manipulation: Multi-node consensus required on top-K vector retrieval results") — the whitepaper already identifies the need for multi-node consensus; this repo has not yet implemented it.

## 2. Governance Flash-Loan Voting

**Ref: T8 in threat-model.md**

**Setup:** An attacker borrows a large amount of `$VMIND` (e.g., via a flash loan from a liquidity pool, once one exists), calls `Governance.vote()` within the same transaction while holding the borrowed balance, then repays the loan.

**Why current code allows it:** `Governance.vote()` reads `vmind.balanceOf(msg.sender)` at the moment of voting:

```solidity
// contracts/Governance.sol
uint256 weight = vmind.balanceOf(msg.sender);
```

There is no snapshot/checkpoint mechanism, so voting power is not tied to sustained token ownership.

**Impact:** A well-capitalized attacker could pass a proposal (e.g., `setZKVerifier` on `InferenceManager`, if `Governance` is later granted that authority) without genuinely holding the token or bearing its price risk.

**Mitigation status:** Not mitigated. `Governance.sol` is explicitly documented in its own header comment as a minimal skeleton, not a production module — see `contracts/Governance.sol`'s NatSpec. A production version should use checkpointed voting power (e.g. `ERC20Votes`-style snapshots) and likely a timelock between proposal passage and execution.

## 3. Mock Verifier Deployed to a Live Network

**Ref: T3 in threat-model.md**

**Setup:** `MockZKVerifier.sol` is deployed as the production `zkVerifier` address in `InferenceManager` (accidentally, or because the real verifier is not ready and a team decides to "launch anyway").

**Why current code allows it:** Nothing in the Solidity code prevents this — `MockZKVerifier` is a normal contract from the EVM's perspective; the "test-only" designation is enforced only by convention (NatSpec comments) and by this documentation, not by any technical guardrail like a chain-ID check or an expiry.

**Impact:** Total collapse of the "verifiable inference" guarantee — any Compute Node could submit any non-empty bytes as a "proof" and have it accepted, since `MockZKVerifier.verifyProof()` returns `proof.length > 0`.

**Mitigation status:** Not mitigated in code. Recommended before any non-test deployment: (a) a deployment script assertion that refuses to deploy `MockZKVerifier` outside a designated test network/chain ID, and (b) a real verifier landing before `InferenceManager.setZKVerifier()` is ever called with a production intent. See [`zk-security.md`](./zk-security.md).

## 4. Settlement Griefing (Minor)

**Ref: state-machine.md limitations**

**Setup:** `InferenceManager.settle()` is callable by any address once a request is `VERIFIED`, not just the client or assigned node.

**Why current code allows it:** No `require(msg.sender == r.client || msg.sender == r.assignedNode)` guard exists on `settle()`.

**Impact:** Low severity — the function's only effect is releasing the agreed `nodePayment` to the already-assigned node, which is the intended outcome anyway. The main risk is a third party settling at a moment inconvenient to the client (e.g., before the client wanted to review something), not fund theft. Flagged here for completeness rather than as a critical finding.

**Mitigation status:** Open design question, not yet resolved either way — see `docs/architecture/state-machine.md`.

## 5. Fixed Prior to Release: Slashing Evasion via Pending Unstake

**Status: FIXED.** Identified during pre-release review, not by any deployed exploit.

**Original issue:** `StakingManager.slash()` computed its penalty only against `stakes[node].amount` (active stake). `requestUnstake()` moves collateral out of `amount` and into `pendingUnstake`. A node could therefore call `requestUnstake()` for its full stake, commit misconduct, and have a subsequent `slash()` compute a penalty against an active balance of zero — leaving the collateral withdrawable in full once the (unaffected) cooldown elapsed.

**Fix:** `slash()` now computes its penalty against the node's **total** collateral (`amount + pendingUnstake`), draining `amount` first and taking any remainder from `pendingUnstake`. The cooldown mechanism, `withdrawUnstaked()`, and `isEligible()` (which only ever read `amount`) are unchanged. See `contracts/StakingManager.sol` and `test/VeriMind.security-fixes.test.js`.

## 6. Fixed Prior to Release: Royalty Settlement Replay

**Status: FIXED.** Identified during pre-release review, not by any deployed exploit.

**Original issue:** `RoyaltyManager.distributeRoyalties()` had no mechanism preventing the same `requestId` from being settled more than once. A `SETTLER_ROLE` holder (or a compromised/buggy caller of one) could call it twice for the same request, paying out the associated pool multiple times.

**Fix:** A `mapping(bytes32 => bool) public settled` now tracks completed settlements; `distributeRoyalties()` reverts with `"requestId already settled"` on any repeat call for the same `requestId`, and only marks a request settled after all validation (length/creator/score checks) has passed — so a reverted attempt does not block a subsequent valid one. The public API signature, the attribution algorithm, and the off-chain scoring computation are all unchanged. See `contracts/RoyaltyManager.sol` and `test/VeriMind.security-fixes.test.js`.
