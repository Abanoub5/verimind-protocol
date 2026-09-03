# Trust Assumptions

**Status:** Analysis document. This document defines the trust assumptions made by the current VeriMind MVP/PoC and distinguishes enforced guarantees from trusted actors and future trust-minimized mechanisms.

## 1. Summary Table

| Actor | Assumed honest about | Currently enforced by | Enforced trust-minimally? | Status |
|---|---|---|---|---|
| Client | Nothing security-critical — clients can only risk their own escrowed funds | `EscrowVault.escrow()` pulls the exact `maxFee` via `transferFrom` | Yes | IMPLEMENTED |
| Compute Node | Submitting a genuine ZK proof | Current verifier interface is enforced through `InferenceManager`, but `MockZKVerifier` only accepts non-empty proof bytes | No | PLANNED — real cryptographic verification is not implemented |
| Compute Node | Being staked before claiming work | `StakingManager.isEligible()` check in `assignNode()` | Yes | IMPLEMENTED |
| Attribution Node / Settler | Submitting correct attribution scores | `RoyaltyManager.distributeRoyalties()` trusts the `SETTLER_ROLE` holder | No | PROTOTYPE — scoring math is implemented in `attribution.py`; consensus/dispute enforcement is planned |
| Validator (consensus) | N/A — no validator set exists in the current MVP | N/A | N/A | PLANNED / OUT OF SCOPE |
| Contract admin (`DEFAULT_ADMIN_ROLE`) | Not replacing the verifier maliciously or granting roles to malicious accounts | Role administration is controlled by `DEFAULT_ADMIN_ROLE`; current deployment uses a deployer-controlled key | No | IMPLEMENTED as a single-key trust model, not a trust-minimized guarantee |
| Governance voters | Holding the voting power they use legitimately rather than acquiring it transiently | `Governance.sol` uses current token balances; no checkpoint/snapshot mechanism exists | No | PROTOTYPE — basic token-weighted voting is implemented; snapshot protection is planned |

## 2. Reading This Table

"Enforced trust-minimally" means that a cryptographic, economic, or deterministic mechanism limits the ability of an actor to behave dishonestly without consequence, rather than relying solely on that actor's good faith.

The current MVP intentionally contains several trusted components. In particular:

- The ZK verifier is currently a test-only mock and provides no cryptographic proof guarantee.
- Attribution scores are calculated off-chain and submitted through a trusted settlement role.
- Governance uses current token balances rather than checkpointed voting power.
- Administrative authority remains concentrated in the configured admin account.

These limitations are explicitly documented because the current repository is a PoC/MVP rather than the final trust-minimized protocol architecture.

## 3. Trust Assumptions That Are Minimized Today

The following guarantees are enforced by the current contract logic:

- **Escrow authorization:** escrowed funds can only be released or refunded through the authorized `InferenceManager` controller. The client deposits the exact requested `maxFee`.
- **Settlement state transitions:** `InferenceManager` restricts settlement to the appropriate request state and requires the node payment to equal the request's `maxFee`.
- **Failure consequences:** when a request fails through the defined failure path, the contract logic can trigger the configured slashing/refund consequences without requiring an external human decision.
- **Unstake cooldown:** a node cannot immediately withdraw collateral after requesting unstake; `requestUnstake()` and `withdrawUnstaked()` enforce the configured cooldown.
- **Royalty arithmetic correctness:** `RoyaltyManager.distributeRoyalties()` requires attribution basis points to sum to exactly `10,000`, preventing malformed score vectors from being accepted.
- **Royalty replay protection:** a request cannot be settled more than once through `RoyaltyManager`.
- **Staking eligibility:** compute nodes must satisfy the configured staking requirements before being considered eligible for work.

These mechanisms provide deterministic enforcement, but they do not eliminate the trusted attribution and administrative components described above.

## 4. Current MVP Trust Boundaries

The most important trust boundaries in the current implementation are:

### 4.1 ZK Verification

`MockZKVerifier` is TEST-ONLY. It does not verify the correctness of an AI inference or any cryptographic proof. Therefore, the current MVP must not represent the mock verifier as production-grade ZK security.

A production deployment requires a real verifier implementing `IZKVerifier`.

### 4.2 Attribution Settlement

The attribution engine provides a reference implementation for calculating vector-based attribution scores, but the current contracts do not independently prove that the submitted scores are correct.

`RoyaltyManager` therefore trusts the holder of `SETTLER_ROLE` to submit valid attribution results.

### 4.3 Administrative Authority

`DEFAULT_ADMIN_ROLE` can control privileged configuration and role-management operations. In the current deployment model, this authority may remain under a single deployer-controlled account.

Production deployment should move administrative authority to a stronger governance mechanism.

### 4.4 Governance Voting Power

The current governance implementation uses live token balances. It does not provide checkpointed voting power or historical snapshots.

As a result, the current implementation should be treated as a governance PoC rather than production-grade DAO governance.

## 5. Path to Reducing Trust

| Trust gap | What would close it |
|---|---|
| Compute Node proof honesty | Replace `MockZKVerifier` with a production Halo2/Plonky3-compatible verifier implementing `IZKVerifier`, with appropriate security testing |
| Attribution score honesty | Multi-node Attribution consensus plus an on-chain challenge/dispute window before royalty settlement becomes final |
| Admin key concentration | Migrate `DEFAULT_ADMIN_ROLE` to a timelocked multisig or an appropriately secured governance mechanism |
| Governance vote borrowing | Introduce checkpoint/snapshot-based voting power, such as an `ERC20Votes`-style mechanism |
| Validator trust | Introduce the future validator/consensus layer when VeriMind evolves beyond the existing-chain MVP |
| Decentralized compute trust | Introduce the future compute-node network, verification, staking, and slashing mechanisms described in the long-term architecture |

## 6. Security Position of the Current MVP

The current VeriMind MVP should therefore be understood as a partially trust-minimized attribution and programmable royalty PoC.

Its current security model provides deterministic enforcement for escrow authorization, request state transitions, staking requirements, cooldowns, royalty arithmetic, and replay protection.

It does not yet provide trustless attribution authenticity, production ZK proof verification, decentralized validator consensus, or fully decentralized governance.

These are deliberate future milestones rather than claims of functionality already implemented in the current MVP.
