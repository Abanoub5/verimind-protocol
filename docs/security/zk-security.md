# Zero-Knowledge Proof Security

**Status:** Planned — not implemented in the current MVP.
This document defines the security requirements and limitations for the future Zero-Knowledge Proof (ZK) layer. The current repository contains only a test-only mock verifier used to exercise the inference lifecycle.

## 1. Current State

`contracts/mocks/MockZKVerifier.sol` implements `IZKVerifier` with a minimal test-only check:

```solidity
function verifyProof(
    bytes calldata proof,
    bytes calldata /* publicInputs */
) external pure override returns (bool valid) {
    return proof.length > 0;
}
```

This performs zero cryptographic verification.

The mock exists only to allow `InferenceManager` tests to exercise both successful and failed verification paths without implementing a production ZK circuit.

It must therefore never be treated as a production security mechanism or proof of AI inference correctness.

## 2. Current MVP Security Boundary

The current VeriMind MVP focuses on AI attribution and programmable royalty infrastructure on an existing EVM-compatible chain.

ZK verification is not required for the current MVP's core attribution functionality and remains a future protocol component.

The current ZK-related implementation consists of:

- `IZKVerifier.sol` — the verifier interface.
- `MockZKVerifier.sol` — a test-only mock implementation.
- `InferenceManager.sol` — the integration point that can call a verifier.

The presence of these components does not mean that production ZK verification has been implemented.

## 3. What the Real Verifier Must Do

The future production verifier is expected to satisfy the requirements described in the whitepaper.

| Requirement | Whitepaper reference | Status |
|---|---|---|
| Verify a Halo2 or Plonky3 SNARK proof of a neural-network forward pass | §4.1 | Not implemented |
| Operate over the specified Goldilocks field ($p = 2^{64} - 2^{32} + 1$) | §4.1 | Not implemented |
| Support PLOOKUP-based lookup arguments for ReLU/GELU activations | §4.1 | Not implemented |
| Support the intended compressed/recursively aggregated proof sizes | §4.1 | Not implemented |
| Provide efficient on-chain verification through a suitable EVM mechanism | §4.1 | Not implemented |
| Bind the proof to the required public inputs, including prompt hash, model ID, and output commitment | §2.2, §4.1 | Not implemented — the interface accepts `publicInputs`, but the mock ignores them |

These requirements belong to the future verifiable-inference architecture and should not be represented as implemented MVP functionality.

## 4. Interface Design

`IZKVerifier` currently exposes:

```solidity
function verifyProof(
    bytes calldata proof,
    bytes calldata publicInputs
) external view returns (bool valid);
```

The interface provides a clean integration boundary between `InferenceManager` and a future verifier implementation.

The intended architecture is:

```
InferenceManager
       │
       ▼
   IZKVerifier
       │
       ▼
Production ZK Verifier
       │
       ├── Halo2
       └── Plonky3
```

The interface itself provides no cryptographic security guarantee. Security depends entirely on the implementation connected to it.

A future verifier may require additional validation or a more specialized interface if the final proving system needs functionality that cannot be safely represented by the current abstraction.

## 5. Public-Input Binding

A production verifier must ensure that the cryptographic proof is bound to the exact public inputs associated with the inference request.

These may include, according to the protocol specification:

- Prompt/input hash
- Model identifier
- Output commitment
- Other circuit-defined public parameters

The current `MockZKVerifier` does not perform this binding because it does not perform cryptographic verification at all.

Therefore:

> A successful verification result from `MockZKVerifier` must not be interpreted as proof that the submitted inference corresponds to the requested public inputs.

## 6. Attribution Research Boundary

The ZK layer should remain conceptually separate from the current attribution reference implementation.

The whitepaper identifies deep activation-layer micro-royalties as an active research area. The current repository implements the specified top-level embedding-based attribution approach in:

`attribution-engine/attribution.py`

It does not implement cryptographic proofs of deep activation-level attribution.

This is consistent with the current research status described by the whitepaper.

## 7. Production Readiness Requirements

Before production deployment of a ZK-based inference system, the following work is required:

1. Define and implement a concrete ZK circuit for at least one supported reference model architecture.
2. Establish the exact public-input and output-commitment format.
3. Implement the corresponding production verifier.
4. Validate proof generation and verification against independent test vectors.
5. Perform appropriate security review/audit of the circuit and verifier implementation.
6. Integrate the production verifier with `InferenceManager`.
7. Ensure verifier configuration cannot be changed by an unsecured single EOA in production.
8. Keep `MockZKVerifier` strictly within testing/development environments.

## 8. Deployment Safety

`MockZKVerifier.sol` must not be included in a production deployment path.

The preferred approach is to keep it exclusively in the test/mock area and ensure production deployment scripts instantiate and configure only the real verifier once it exists.

Until a production verifier is implemented, the repository should make the following distinction explicit:

```
MockZKVerifier
      │
      └── Testing only
          No cryptographic guarantee

Production ZK Verifier
      │
      └── Future
          Cryptographic verification required
```

## 9. Security Position

The current repository provides no production ZK security guarantee.

The ZK components currently serve as an integration and testing scaffold for the future verifiable-inference architecture.

Accordingly:

- `MockZKVerifier` is not production-safe.
- `publicInputs` are not cryptographically validated by the mock.
- No Halo2/Plonky3 circuit is implemented.
- No production on-chain verifier is implemented.
- No ZK performance claim is currently demonstrated.
- Production ZK verification remains a future milestone.

This limitation is intentional and is documented so that the current MVP's implemented attribution and royalty functionality is not confused with the future ZK-based trust-minimized protocol.
