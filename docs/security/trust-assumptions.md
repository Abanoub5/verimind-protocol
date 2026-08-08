# Trust Assumptions

**Status: Analysis document.** Lists what this repository's contracts assume about each actor's behavior. Where the current code deviates from an eventual trust-minimized design, that is called out explicitly.

## 1. Summary Table

| Actor | Assumed honest about | Currently enforced by | Enforced trust-minimally? | Status |
|---|---|---|---|---|
| Client | Nothing security-critical — clients can only lose their own escrowed funds | `EscrowVault.escrow()` pulls exact `maxFee` via `transferFrom` | Yes | **IMPLEMENTED** |
| Compute Node | Submitting a genuine ZK proof | **Not enforced** — `MockZKVerifier` accepts any non-empty bytes | **No** — this is the central open item, see [`zk-security.md`](./zk-security.md) | **PLANNED** (real verifier not built; mock is not a security mechanism) |
| Compute Node | Being staked before claiming work | `StakingManager.isEligible()` check in `assignNode()` | Yes | **IMPLEMENTED** |
| Attribution Node / Settler | Submitting correct, honest attribution scores | **Not enforced on-chain** — `distributeRoyalties` trusts the `SETTLER_ROLE` holder completely | **No**, trusted role by design in this PoC | **PROTOTYPE** (scoring math implemented in `attribution.py`; consensus/dispute enforcement is PLANNED) |
| Validator (consensus) | N/A — no validator set exists in this repo | N/A | N/A, out of scope | **PLANNED** |
| Contract admin (`DEFAULT_ADMIN_ROLE`) | Not swapping in a malicious `IZKVerifier`, not misusing role grants | **Not enforced** — single-key admin authority in the deployment script | **No**, single point of trust in current deployment | **IMPLEMENTED** (as a single-key trust model — not a security guarantee) |
| Governance voters | Holding tokens they intend to vote with, not borrowing them transiently | **Not enforced** — no snapshot voting | **No**, see `attack-scenarios.md` | **PROTOTYPE** (basic voting IMPLEMENTED in `Governance.sol`; snapshot protection PLANNED) |

## 2. Reading This Table

"Enforced trust-minimally" means: does a cryptographic or economic mechanism (staking, slashing, proof verification) make dishonesty costly or infeasible, as opposed to the system simply trusting a role-holder to behave correctly?

Several rows are marked "No" — this is not a defect being hidden; it reflects the actual, current state of a PoC where the highest-value trust-minimization work (the real ZK verifier, an automated consensus-checked Attribution Node) has not been built yet. Each "No" row has a corresponding entry in [`threat-model.md`](./threat-model.md) and, where useful, a worked scenario in [`attack-scenarios.md`](./attack-scenarios.md).

## 3. Trust Assumptions That *Are* Minimized Today

To be equally clear about what already works without trust:

- **Escrow correctness**: a client's funds cannot be released to anyone except through the `InferenceManager` state machine's logic — verified by `test/VeriMind.test.js`'s adversarial-path test.
- **Slashing on bad proofs**: given the mock verifier's pass/fail signal, the *consequences* of a failing proof (slash + refund) are enforced automatically, not by any human judgment call.
- **Unstake cooldown**: a node cannot instantly withdraw collateral after acting maliciously within the same block — `requestUnstake()` + `withdrawUnstaked()` enforces the configured cooldown unconditionally.
- **Royalty math correctness** (not authenticity): `RoyaltyManager.distributeRoyalties` enforces that submitted basis points sum to exactly 10,000 — it cannot silently under- or over-distribute a pool due to arithmetic — even though it does trust *who* submitted the scores (see above).

## 4. Path to Reducing "No" Rows

| Trust gap | What would close it |
|---|---|
| Compute Node proof honesty | Real Halo2/Plonky3 verifier replacing `MockZKVerifier` (see `zk-security.md`) |
| Attribution score honesty | Multi-node Attribution consensus + on-chain challenge/dispute window before `distributeRoyalties` finalizes, per whitepaper §8 |
| Admin key concentration | Migrate `DEFAULT_ADMIN_ROLE` to a timelocked multisig or the `Governance` contract itself |
| Governance vote borrowing | Snapshot-based voting (e.g. checkpointed balances, as in OpenZeppelin `ERC20Votes`) instead of live `balanceOf` |
