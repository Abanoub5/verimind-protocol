# Attack Scenarios

Status: Analysis document. Worked examples of the highest-severity security risks identified in "threat-model.md", written against the current contract implementation in this repository. These scenarios describe risks that remain possible in the current MVP/PoC architecture or risks associated with future components that are not yet implemented.

## 1. Royalty Score Manipulation

Ref: T6 in threat-model.md

**Setup:** An address holding `RoyaltyManager.SETTLER_ROLE` calls `distributeRoyalties()` with an arbitrary `creators[]` array — for example, an address it controls — and `scoresBps[]` summing to `10000`, claiming 100% attribution.

**Why current code allows it:** `distributeRoyalties()` validates structural and accounting properties such as matching array lengths, non-zero creators, duplicate creators, sufficient token balance, and `sumBps == 10_000`. However, it has no cryptographic or protocol-level mechanism to prove that the submitted scores were actually produced by running the attribution algorithm against authentic creator embeddings and a genuine inference output.

That verification would require a stronger attribution trust model, such as committed inputs, verifiable computation, or a networked/staked Attribution Node system with dispute and slashing mechanisms.

```solidity
// contracts/RoyaltyManager.sol
require(creators.length == scoresBps.length, "length mismatch");
require(sumBps == 10_000, "scores must sum to 10000 bps");
```

**Impact:** Total redirection of a royalty pool away from legitimate data creators.

**Mitigation status:** Not mitigated in the current MVP. The current implementation relies on the trusted `SETTLER_ROLE`. A future permissionless attribution network must establish how attribution results are independently verified before royalty settlement.

This remains consistent with the broader architecture described in the whitepaper, where multi-node consensus and verifiable attribution are future components.

---

## 2. Governance Flash-Loan Voting

Ref: T8 in threat-model.md

**Setup:** An attacker obtains a large amount of `$VMIND` (for example, through a flash loan if suitable liquidity exists), calls `Governance.vote()` while holding the borrowed tokens, and then returns them.

**Why current code allows it:** `Governance.vote()` reads the current token balance of the voter:

```solidity
// contracts/Governance.sol
uint256 weight = vmind.balanceOf(msg.sender);
```

There is no historical snapshot/checkpoint mechanism, so voting power is based on the balance at the time of voting.

The current Governance contract also uses an explicit target allowlist for proposals, which limits where governance calls can be directed, but it does not prevent temporary token-balance-based voting power.

**Impact:** A sufficiently capitalized attacker could acquire temporary voting power and influence a proposal without maintaining long-term token exposure.

**Mitigation status:** Not mitigated.

`Governance.sol` remains a minimal governance skeleton rather than a production governance system. A production implementation should use checkpointed voting power, such as an `ERC20Votes`-style mechanism, and should introduce a timelock between successful voting and execution.

---

## 3. Mock Verifier Deployed to a Live Network

Ref: T3 in threat-model.md

**Setup:** `MockZKVerifier.sol` is configured as the `zkVerifier` used by `InferenceManager` on a production network.

**Why current code allows it:** From the EVM's perspective, `MockZKVerifier` is a valid contract implementing `IZKVerifier`. The TEST-ONLY designation is currently enforced by documentation and deployment discipline rather than by an on-chain technical restriction.

```solidity
function verifyProof(
    bytes calldata proof,
    bytes calldata
) external pure returns (bool) {
    return proof.length > 0;
}
```

Therefore, any non-empty byte sequence can be accepted as a valid proof.

**Impact:** Complete loss of the verifiable-inference security guarantee if the mock verifier is used in a production deployment.

**Mitigation status:** Not mitigated in code.

The current repository explicitly treats `MockZKVerifier` as a test-only placeholder. Before any production deployment involving verifiable inference:

- a real cryptographic verifier must replace the mock;
- the deployment process must explicitly prevent accidental production use of the mock verifier;
- the production verifier implementation must be independently reviewed before relying on it for security.

See ["zk-security.md"](./zk-security.md).

---

## 4. Settlement Griefing / Premature Settlement

Ref: state-machine.md limitations

**Setup:** `InferenceManager.settle()` is callable by any address once a request reaches `VERIFIED`.

**Why current code allows it:** The settlement function does not require the caller to be the original client or the assigned compute node.

**Impact:** Low severity. The function releases the agreed payment to the already-assigned compute node. It does not allow an arbitrary caller to redirect the payment or change the recipient.

The main concern is that a third party can trigger settlement at any time after verification rather than the client or compute node explicitly initiating it.

**Mitigation status:** Open design decision.

This behavior can be intentional if settlement is designed as a permissionless state transition. If the product requires client-controlled settlement timing, an authorization check should be added.

---

## 5. Fixed Prior to Release: Slashing Evasion via Pending Unstake

Status: FIXED. Identified during pre-release review, not by any deployed exploit.

**Original issue:** `StakingManager.slash()` previously calculated penalties only against `stakes[node].amount` (active stake).

`requestUnstake()` moves collateral from `amount` into `pendingUnstake`. A node could therefore request withdrawal of its full stake before misconduct was detected and potentially leave no active stake available for slashing.

**Fix:** `slash()` now calculates the penalty against the node's total collateral:

```
total collateral = amount + pendingUnstake
```

The penalty is taken from the active amount first, with any remaining penalty taken from `pendingUnstake`.

The cooldown mechanism, `withdrawUnstaked()`, and `isEligible()` remain based on the active stake as intended.

See:

- `contracts/StakingManager.sol`
- `test/VeriMind.security-fixes.test.js`

---

## 6. Fixed Prior to Release: Royalty Settlement Replay

Status: FIXED. Identified during pre-release review, not by any deployed exploit.

**Original issue:** `RoyaltyManager.distributeRoyalties()` previously had no mechanism preventing the same `requestId` from being settled more than once.

A repeated settlement could therefore distribute the associated royalty pool multiple times if sufficient tokens were available.

**Fix:** The current implementation includes:

```solidity
mapping(bytes32 => bool) public settled;
```

`distributeRoyalties()` rejects a previously settled request:

```solidity
require(!settled[requestId], "requestId already settled");
```

The request is marked as settled only after the required validation checks have passed. Therefore, a failed validation attempt does not permanently consume the `requestId`.

See:

- `contracts/RoyaltyManager.sol`
- `test/VeriMind.security-fixes.test.js`

---

## 7. MVP Trust Boundary: Trusted Royalty Settlement

Status: OPEN — architectural limitation of the current MVP.

The current MVP does not implement a permissionless Attribution Node network.

`RoyaltyManager.distributeRoyalties()` is protected by `SETTLER_ROLE`, meaning the system currently trusts whoever controls that role to submit correct attribution results.

This is an intentional limitation of the existing-chain MVP rather than a claim of decentralized attribution.

**Impact:** Compromise or misuse of the authorized settlement role could result in incorrect royalty distributions.

**Mitigation:** Future versions should replace the trusted settlement path with verifiable attribution results, multi-node agreement, dispute mechanisms, or other cryptographically enforceable attribution guarantees.

Until then, `SETTLER_ROLE` should be treated as a privileged operational role and secured accordingly.

---

## Security Scope

The current MVP should not be interpreted as implementing the full security model of the long-term VeriMind architecture.

The following remain future components:

- Production ZK inference verification
- Networked Attribution Nodes
- Attribution consensus
- Permissionless royalty settlement
- Decentralized compute validation
- Validator consensus
- Cosmos SDK / appchain infrastructure
- Production governance with checkpointed voting and timelocks

The current implementation should therefore be evaluated primarily as an existing-chain attribution and programmable royalty PoC, with the future security model documented separately.
