# Threat Model

Status: Analysis document — current MVP/PoC.

This threat model covers the smart-contract code currently implemented in `contracts/`. It focuses on the existing-chain MVP architecture for attribution, royalty settlement, inference request lifecycle, escrow, staking, and governance.

It does not treat the unbuilt ZK, networking, decentralized compute, validator, or appchain layers as implemented security boundaries. Those components are identified only where their absence creates a current trust assumption or future risk.

## 1. Scope

**In scope**

- `VMINDToken.sol`
- `StakingManager.sol`
- `EscrowVault.sol`
- `InferenceManager.sol`
- `RoyaltyManager.sol`
- `Governance.sol`
- `MockZKVerifier.sol`

**Out of scope**

The following are not implemented in the current repository:

- Production ZK verifier
- Networked Attribution Node software
- Attribution consensus
- Decentralized compute network
- Validator/consensus layer
- Cosmos SDK appchain
- RPC/API infrastructure
- Production token vesting contracts

These are future components described in the project roadmap and whitepaper.

---

## 2. Assets

| Asset | Held / controlled by | At risk from |
|---|---|---|
| Client escrowed fees | `EscrowVault` | Unauthorized controller actions, incorrect settlement/refund logic |
| Node staked collateral | `StakingManager` | Unauthorized slashing, incorrect unstaking/slashing interaction |
| Royalty pool funds | `RoyaltyManager` | Compromised `SETTLER_ROLE`, incorrect attribution data, replay |
| VMIND token supply | `VMINDToken` | Unauthorized token creation or privileged token administration |
| Governance authority | `Governance` | Admin-key compromise, transient voting power, insufficient governance safeguards |
| ZK verification guarantee | `InferenceManager` + verifier | Deployment/configuration of the TEST-ONLY mock verifier |

---

## 3. Threats and Current Mitigations

| # | Threat | Mitigation in this repo | Residual risk |
|---|---|---|---|
| T1 | Reentrancy during token transfers | Fund-moving functions use OpenZeppelin `ReentrancyGuard`; `VMINDToken` is a standard ERC-20 without external token-transfer hooks | Low for the current token implementation |
| T2 | Unauthorized escrow fund movement | `EscrowVault.release()` and `refund()` require `CONTROLLER_ROLE` | Depends on correct role assignment and protection of privileged keys |
| T3 | Fake/invalid ZK proof accepted as valid | Not mitigated. `MockZKVerifier` accepts any non-empty proof and performs no cryptographic verification | High by design. It must remain TEST-ONLY and must not be used as the security boundary for production verifiable inference |
| T4 | Compute Node claims a request and then stalls | `failOnTimeout()` allows the request to be failed and the client's escrow refunded after `processingTimeout` | Low for the current fixed-timeout implementation |
| T5 | Compute Node submits an invalid proof to grief a client | Invalid verification causes the request to fail and the node's collateral can be fully slashed through `StakingManager` | Low, assuming meaningful collateral is required |
| T6 | Royalty attribution is manipulated | `RoyaltyManager` validates array lengths, non-zero creators, duplicate creators, score sum, positive amount, and available balance | High. The contract still trusts the authorized `SETTLER_ROLE` to provide the attribution results |
| T7 | Privileged role/admin key compromise | OpenZeppelin `AccessControl` protects privileged functions; deployment assigns `InferenceManager` the escrow controller and staking slasher roles | High for privileged administration. Production deployment should use multisig/governance-controlled administration rather than a single EOA |
| T8 | Governance voting-power capture using transient token balances | Governance restricts proposal targets through an explicit allowlist | High. Voting weight is still based on the voter's current `VMIND` balance and does not use historical snapshots |
| T9 | Royalty settlement replay | `RoyaltyManager.settled[requestId]` prevents a request from being distributed more than once | Low for the implemented `requestId` replay path |
| T10 | Slashing evasion through pending unstake | `StakingManager.slash()` calculates penalties against `amount + pendingUnstake`, taking the penalty from active stake first and then pending unstake | Low for the reviewed unstake/slashing interaction |
| T11 | Unauthorized governance target execution | `Governance` requires proposed targets to be explicitly allowlisted and checks the target again at execution | Reduced, but governance remains a minimal PoC and lacks production-grade voting snapshots and timelocks |

---

## 4. Detailed Threat Notes

### T1 — Reentrancy

The current contracts use OpenZeppelin `ReentrancyGuard` around relevant fund-moving operations.

The VMIND token itself is a standard ERC-20 implementation and does not introduce arbitrary external callbacks during transfers.

**Status:** Mitigated for the current implementation.

---

### T2 — Unauthorized Escrow Movement

`EscrowVault` restricts fund movement through `CONTROLLER_ROLE`.

In the current architecture, `InferenceManager` is granted this role during deployment.

Therefore, compromise or incorrect assignment of the controller role could allow unauthorized escrow operations.

**Status:** Mitigated at the contract authorization layer; operational key management remains a trust assumption.

---

### T3 — Mock ZK Verifier

`MockZKVerifier` is explicitly TEST-ONLY.

Its verification behavior is intentionally insecure:

```solidity
return proof.length > 0;
```

Consequently, a non-empty arbitrary byte sequence can be accepted as a valid proof.

**Status:** Not mitigated.

This is acceptable only because the current implementation is a PoC. A production verifiable-inference deployment requires a real cryptographic verifier.

See ["zk-security.md"](./zk-security.md).

---

### T4 — Compute Node Stalling

A Compute Node can accept a request and fail to complete it.

The current mitigation is `failOnTimeout()`, which allows the request to transition to `FAILED` after the configured processing timeout and refunds the client's escrow.

**Status:** Mitigated for the current request lifecycle.

The timeout is a constructor parameter and is not dynamically adjustable by governance in the current implementation.

---

### T5 — Invalid Proof Griefing

A Compute Node that submits an invalid proof causes the request to fail.

The current inference flow can apply a 100% collateral penalty to the offending node through `StakingManager`.

The revised staking implementation also prevents a node from avoiding the penalty by moving collateral into `pendingUnstake` before the slash.

**Status:** Mitigated subject to the economic assumptions around minimum stake.

---

### T6 — Royalty Attribution Manipulation

The current MVP does not cryptographically prove that royalty scores correspond to genuine creator embeddings or a genuine inference output.

`RoyaltyManager` enforces accounting invariants, including:

- matching creator/score array lengths;
- non-zero creators;
- no duplicate creators;
- positive distribution amount;
- sufficient token balance;
- scores summing to exactly `10,000` basis points;
- one settlement per `requestId`.

These checks prevent malformed or replayed distributions, but they do not establish that the attribution itself is truthful.

The current system therefore relies on the trusted `SETTLER_ROLE`.

**Status:** Not fully mitigated.

A future Attribution Node network, verifiable attribution mechanism, or consensus/dispute system is required to remove this trust assumption.

See ["attack-scenarios.md"](./attack-scenarios.md).

---

### T7 — Privileged Role / Admin Compromise

The contracts use OpenZeppelin `AccessControl` for privileged operations.

The current deployment gives:

- `InferenceManager` → `EscrowVault.CONTROLLER_ROLE`
- `InferenceManager` → `StakingManager.SLASHER_ROLE`

Administrative control remains important because privileged roles can affect security-critical behavior.

The current repository does not implement production-grade multisig administration.

**Status:** Partially mitigated at the authorization layer.

For production deployment, privileged administration should be moved away from a single EOA and protected by an appropriate multisig or governance-controlled process.

---

### T8 — Governance Flash-Loan / Transient Voting Power

`Governance.vote()` determines voting weight using the voter's current VMIND balance.

There is no historical checkpoint or snapshot mechanism.

Therefore, if external liquidity and borrowing infrastructure exist, temporarily acquired VMIND could potentially provide temporary voting power.

The governance target allowlist reduces the set of contracts that governance can call, but it does not solve the voting-power problem.

**Status:** Not mitigated.

A production governance implementation should use checkpointed voting power and a timelock.

---

### T9 — Royalty Settlement Replay

The current `RoyaltyManager` maintains:

```solidity
mapping(bytes32 => bool) public settled;
```

A request that has already been successfully distributed cannot be distributed again.

Validation occurs before the request is marked as settled, so a failed validation does not permanently consume the `requestId`.

**Status:** Mitigated.

See `test/VeriMind.security-fixes.test.js`.

---

### T10 — Slashing Evasion Through Pending Unstake

The reviewed `StakingManager` implementation calculates slashing against total node collateral:

```
total collateral = active amount + pendingUnstake
```

The penalty is taken from active stake first and then from pending unstake if necessary.

This prevents a node from avoiding slashing by requesting withdrawal immediately before misconduct is detected.

**Status:** Mitigated.

See `test/VeriMind.security-fixes.test.js`.

---

### T11 — Governance Target Abuse

The current `Governance` implementation does not permit arbitrary proposal targets by default.

A target must first be added to the explicit `allowedTarget` mapping, and the target must remain allowed when the proposal is executed.

This provides an additional authorization boundary over arbitrary `target.call(callData)` execution.

However, the governance system remains a minimal PoC and does not yet provide production-grade voting snapshots, delegation, or timelocked execution.

**Status:** Partially mitigated.

---

## 5. Explicitly Out of Scope for the Current Repository

These are important risks for the long-term VeriMind architecture, but there is currently no implemented code in this repository that provides the corresponding mechanism:

- Validator double-signing / consensus safety
- CometBFT consensus attacks
- DePIN hardware-attestation spoofing
- Network-level Attribution Node manipulation
- Multi-node attribution consensus attacks
- Peer-to-peer networking attacks
- Production ZK circuit soundness
- Production ZK proving/verifier implementation
- Cross-chain bridge security
- RPC/API authentication and abuse
- Appchain/L1 consensus security

These items are tracked as future security concerns rather than current exploitable surfaces.

---

## 6. Current MVP Trust Boundaries

The current MVP has three important trust boundaries:

**Attribution**

The attribution algorithm is implemented as an off-chain reference implementation.

The current on-chain royalty contract does not independently verify the underlying embeddings or attribution computation.

**Royalty Settlement**

`RoyaltyManager.SETTLER_ROLE` is currently a trusted role.

A compromised settlement authority could submit technically valid but economically incorrect attribution scores.

**ZK Verification**

`MockZKVerifier` provides no cryptographic guarantee.

It exists only for testing the inference state machine and must not be treated as a production verifier.

These limitations are intentional for the current MVP and are expected to be addressed by future protocol components.

---

## 7. Related Documents

- ["trust-assumptions.md"](./trust-assumptions.md) — actor trust assumptions and security boundaries
- ["attack-scenarios.md"](./attack-scenarios.md) — concrete attack scenarios and mitigations
- ["zk-security.md"](./zk-security.md) — ZK verifier security and the TEST-ONLY mock verifier
- ["../ROADMAP.md"](../ROADMAP.md) — phased transition from the current MVP to future protocol components
