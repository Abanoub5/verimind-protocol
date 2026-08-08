# Zero-Knowledge Proof Security

**Status: Not implemented — this document specifies requirements for work that has not started, and documents the current mock's limitations in detail.**

## 1. Current State

`contracts/mocks/MockZKVerifier.sol` implements `IZKVerifier` with a single line of logic:

```solidity
function verifyProof(bytes calldata proof, bytes calldata /* publicInputs */) external pure override returns (bool valid) {
    return proof.length > 0;
}
```

This performs **zero cryptographic verification**. It exists only so `test/VeriMind.test.js` can exercise both the success path (`VERIFIED`) and failure path (`FAILED` + slashing) of `InferenceManager` without a real circuit. It is functionally equivalent to "always trust the Compute Node."

## 2. What the Real Verifier Must Do (Whitepaper §4)

| Requirement | Whitepaper reference | Status |
|---|---|---|
| Verify a Halo2 or Plonky3 SNARK proof of a neural network forward pass | §4.1 | Not implemented |
| Operate over a Goldilocks field ($p = 2^{64} - 2^{32} + 1$) | §4.1 | Not implemented |
| Support PLOOKUP-based lookup arguments for ReLU/GELU activations | §4.1 | Not implemented |
| Accept proofs of ~1.5KB–12KB (compressed, recursively aggregated) | §4.1 | Not implemented — `MockZKVerifier` accepts arbitrary-length bytes with no size constraint |
| Verify on-chain in <10ms via an EVM precompile or equivalent | §4.1 | Not implemented — not applicable to a mock |
| Bind the proof to public inputs (prompt hash, model ID, output commitment) | Implied by §2.2, §4.1 | **Partially specified**: `IZKVerifier.verifyProof(bytes proof, bytes publicInputs)` already takes a `publicInputs` parameter so the real verifier can slot in without changing the interface, but `MockZKVerifier` ignores that parameter entirely |

## 3. Interface Design Rationale

`IZKVerifier` was deliberately kept minimal:

```solidity
function verifyProof(bytes calldata proof, bytes calldata publicInputs) external view returns (bool valid);
```

A single `view` function returning a `bool` was chosen so that:
1. `InferenceManager` never needs to change when the real verifier lands — only `setZKVerifier()` needs to be called with the new address.
2. The interface stays agnostic to the specific proving system (Halo2 vs. Plonky3 vs. a future replacement) — that complexity is fully encapsulated behind the interface boundary.

This is a standard "swap the implementation behind an interface" pattern and does not by itself provide any security guarantee — it only ensures the *integration point* is ready.

## 4. Known Gap: Research Status of Attribution Depth

The whitepaper itself flags (§5, "Theoretical Research Status Note") that deep activation-layer micro-royalties are an active research area, with only top-level embedding cosine similarity currently specified as implementable. This repo's `attribution-engine/attribution.py` implements exactly that top-level version — it does not attempt deep activation mapping, consistent with the whitepaper's own caveat.

## 5. Recommended Sequencing Before Any Production Deployment

1. Implement and independently audit the Halo2/Plonky3 circuit for at least one reference model architecture.
2. Implement the corresponding on-chain verifier (precompile or Solidity-generated verifier contract).
3. Replace `MockZKVerifier` in `InferenceManager` via `setZKVerifier()`, gated by multisig or `Governance`, not a single EOA (see `../security/trust-assumptions.md`).
4. Add a deployment-time guard (e.g., a `require(block.chainid != MAINNET_CHAIN_ID)` check inside `MockZKVerifier`'s constructor, or simply excluding it from any non-test deployment script) so it cannot be mistakenly wired into a live network — see `attack-scenarios.md`, scenario 3.
5. Only after the above: remove or clearly quarantine `MockZKVerifier.sol` from any deployment path outside `test/`.

None of steps 1–2 exist in this repository yet. This document exists so that gap is explicit rather than discovered later.
