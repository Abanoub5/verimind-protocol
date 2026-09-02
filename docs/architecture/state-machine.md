# InferenceManager State Machine

Status: Implemented — Inference Prototype

This document describes the implemented state machine of `contracts/InferenceManager.sol`.

> **MVP positioning:** `InferenceManager` represents the current inference prototype and is not the primary state machine of the current VeriMind MVP.
> The current MVP is centered on AI attribution and programmable royalty settlement on an existing EVM-compatible blockchain.
>
> The primary MVP flow is documented in:
>
> - `docs/architecture/protocol-flow.md`
> - `docs/architecture/data-flow.md`
> - `docs/architecture/contract-interactions.md`
> - `docs/mvp/attribution-node-spec.md`
>
> The inference workflow documented here remains part of the broader VeriMind architecture and provides a foundation for future verifiable AI inference integration.

---

## 1. Overview

`InferenceManager` implements the lifecycle of an AI inference request from request creation through processing, proof submission, verification, failure, and settlement.

The current implementation is a Solidity prototype designed to model the on-chain lifecycle of an inference request.

The state machine is:

```
                    ┌─────────────────────┐
                    │                     │
                    ▼                     │
              REQUEST_SUBMITTED          │
                    │                     │
                    ▼                     │
                 PROCESSING              │
                    │                     │
          ┌─────────┴─────────┐           │
          │                   │           │
          ▼                   ▼           │
   PROOF_SUBMITTED         TIMEOUT        │
          │                   │            │
          ▼                   ▼            │
       VERIFIED             FAILED ────────┘
          │
          ▼
       SETTLED
```

The proof submission path is intentionally modeled as a transient state. In the current implementation, submitting a proof immediately invokes the configured verifier and transitions the request to either `VERIFIED` or `FAILED`.

---

## 2. State Definitions

### `IDLE`

The request does not yet exist.

This is the conceptual initial state before `submitRequest()` creates the request.

---

### `REQUEST_SUBMITTED`

An inference request has been created and is awaiting processing.

At this stage, the request contains the parameters required by the `InferenceManager` implementation, including the request creator and associated request data.

The request may subsequently be assigned to a processing node.

---

### `PROCESSING`

The inference request has been assigned for processing.

The implementation allows a compute/processing node to be associated with the request through the assignment flow.

The actual AI inference computation is not performed by `InferenceManager` itself.

---

### `PROOF_SUBMITTED`

A proof has been submitted for the inference request.

This is a transient state in the current implementation.

`submitProof()` immediately passes the submitted proof to the configured verifier. The request therefore proceeds directly to either:

```
PROOF_SUBMITTED → VERIFIED
```

or:

```
PROOF_SUBMITTED → FAILED
```

There is no persistent period in which a request remains in `PROOF_SUBMITTED` in the current implementation.

---

### `VERIFIED`

The configured verifier has accepted the submitted proof.

A verified request can subsequently proceed to settlement.

The current implementation does not claim that the verifier performs production-grade ZK verification unless the configured verifier itself provides that functionality.

---

### `FAILED`

The inference request has failed verification or has been marked as failed because its processing deadline has expired.

Failure may therefore occur through:

1. failed proof verification; or
2. timeout handling.

---

### `SETTLED`

The inference request has completed the implemented inference lifecycle and has been marked as settled.

Settlement is performed through the `settle()` flow after successful verification.

The current implementation does not automatically invoke the separate `RoyaltyManager.distributeRoyalties()` function as part of `InferenceManager.settle()`.

---

## 3. Transition Flow

### 3.1 Request Submission

```
IDLE
  │
  │ submitRequest()
  ▼
REQUEST_SUBMITTED
```

A user creates an inference request through `submitRequest()`.

The request becomes part of the on-chain state managed by `InferenceManager`.

---

### 3.2 Node Assignment

```
REQUEST_SUBMITTED
  │
  │ assignNode()
  ▼
PROCESSING
```

A processing node is assigned to the request.

The request then enters the `PROCESSING` state.

The current contract models the assignment and lifecycle on-chain but does not implement a decentralized compute network or validator consensus.

---

### 3.3 Successful Proof Verification

```
PROCESSING
  │
  │ submitProof()
  ▼
PROOF_SUBMITTED
  │
  │ verifier returns true
  ▼
VERIFIED
```

A proof is submitted for the inference request.

`InferenceManager` invokes the configured verifier.

If verification succeeds, the request becomes `VERIFIED`.

---

### 3.4 Failed Proof Verification

```
PROCESSING
  │
  │ submitProof()
  ▼
PROOF_SUBMITTED
  │
  │ verifier returns false
  ▼
FAILED
```

If the configured verifier rejects the proof, the request becomes `FAILED`.

---

### 3.5 Timeout

A request can fail if its processing deadline has expired.

Conceptually:

```
REQUEST_SUBMITTED ─────┐
                       │ timeout
                       ▼
                     FAILED
```

and:

```
PROCESSING ────────────┐
                       │ timeout
                       ▼
                     FAILED
```

The current implementation allows `failOnTimeout()` to be called once the configured timeout condition has been reached.

The timeout mechanism does not itself perform inference verification.

---

### 3.6 Settlement

```
VERIFIED
   │
   │ settle()
   ▼
SETTLED
```

A successfully verified inference request can be settled using `settle()`.

Settlement represents completion of the `InferenceManager` inference lifecycle.

It should not be interpreted as automatic royalty distribution.

Royalty settlement is handled by the separate royalty infrastructure described elsewhere in the repository.

---

## 4. Complete State Transition Table

| Current State | Action | Condition | Next State |
|---|---|---|---|
| `IDLE` | `submitRequest()` | Valid request | `REQUEST_SUBMITTED` |
| `REQUEST_SUBMITTED` | `assignNode()` | Valid node assignment | `PROCESSING` |
| `REQUEST_SUBMITTED` | `failOnTimeout()` | Timeout reached | `FAILED` |
| `PROCESSING` | `submitProof()` | Proof accepted by verifier | `VERIFIED` |
| `PROCESSING` | `submitProof()` | Proof rejected by verifier | `FAILED` |
| `PROCESSING` | `failOnTimeout()` | Timeout reached | `FAILED` |
| `VERIFIED` | `settle()` | Valid settlement | `SETTLED` |

`PROOF_SUBMITTED` is included as a logical/transient state because the implementation records the proof submission step before immediately evaluating the configured verifier result.

---

## 5. Contract Guards

The state machine is enforced through Solidity `require` checks in `InferenceManager.sol`.

These guards prevent invalid lifecycle transitions.

Examples of the implemented transition logic include:

```
submitRequest()
    → creates a new request

assignNode()
    → requires the request to be in an assignable state

submitProof()
    → requires the request to be in processing
    → invokes the configured verifier
    → moves to VERIFIED or FAILED

failOnTimeout()
    → requires the timeout condition to be satisfied
    → moves the request to FAILED

settle()
    → requires successful verification
    → moves the request to SETTLED
```

The exact authorization and validation rules are enforced by the contract implementation and its associated tests.

---

## 6. Relationship to Attribution and Royalty MVP

The inference state machine is related to the broader VeriMind architecture but is intentionally separated from the current MVP core.

The current MVP focuses on:

```
AI / Application
       │
       ▼
Attribution Engine
       │
       ▼
Contribution Scores
       │
       ▼
Attribution Records
       │
       ▼
RoyaltyManager
       │
       ▼
Existing EVM Chain
       │
       ▼
Programmable Royalty Distribution
```

The `InferenceManager` workflow represents a separate inference lifecycle:

```
Inference Request
       │
       ▼
Processing
       │
       ▼
Proof Submission
       │
       ▼
Verification
       │
       ▼
Settlement
```

The two flows are designed to become increasingly integrated as VeriMind evolves toward verifiable AI inference.

For the current MVP, however, attribution and royalty settlement remain the primary product scope.

---

## 7. Royalty Settlement Boundary

`InferenceManager.settle()` and `RoyaltyManager.distributeRoyalties()` are separate operations in the current implementation.

Therefore:

```
InferenceManager
      │
      │ settle()
      ▼
Inference → SETTLED
```

does not currently imply:

```
InferenceManager
      │
      └──────► RoyaltyManager.distributeRoyalties()
```

The royalty infrastructure exists as a separate component.

This separation keeps inference lifecycle management independent from programmable royalty settlement and allows the current MVP to focus on attribution and royalty functionality without requiring the full future inference network.

---

## 8. Timeout Model

The current timeout model is intentionally simple.

A request contains a processing deadline, and once that deadline has passed, `failOnTimeout()` can be used to transition the request to `FAILED`.

Current behavior:

```
Deadline not reached
        │
        ▼
  Request continues

Deadline reached
        │
        ▼
failOnTimeout()
        │
        ▼
     FAILED
```

The current implementation does not include a decentralized dispute-resolution mechanism for timeout decisions.

---

## 9. Current Implementation Scope

The current `InferenceManager` implementation provides:

- On-chain inference request lifecycle management
- Request submission
- Processing-node assignment
- Proof submission
- Configurable proof verification
- Successful verification state
- Failed verification state
- Timeout-based failure
- Settlement after verification
- Explicit state-transition guards

These capabilities form the current inference prototype.

---

## 10. Current Limitations

The following capabilities are not represented as production functionality by this state machine:

- Decentralized compute-node consensus
- Validator consensus
- Distributed proof generation
- Production ZK proof generation
- Decentralized proof verification network
- Dispute resolution
- On-chain inference execution
- Automatic royalty distribution from `InferenceManager`
- Distributed attribution-node consensus
- Staking/slashing for inference processing
- A production VeriMind appchain/L1

These capabilities belong to later stages of the VeriMind architecture.

---

## 11. Future Evolution

The current state machine provides a foundation for future verifiable inference infrastructure.

The long-term direction is:

```
Current Inference Prototype
            │
            ▼
Verifiable AI Inference
            │
            ▼
Decentralized Compute
            │
            ▼
Distributed Attribution
            │
            ▼
VeriMind Network / Appchain
            │
            ▼
Long-Term VeriMind L1 Architecture
```

Future implementations may introduce additional states and transitions for:

- distributed execution
- proof generation
- proof aggregation
- proof verification
- challenge/dispute periods
- node reputation
- staking
- slashing
- decentralized consensus
- automated attribution submission
- automated royalty settlement

Such functionality is outside the current implementation described in this document.

---

## 12. Design Principle

The `InferenceManager` state machine is intentionally kept separate from the current MVP's primary attribution and royalty flow.

The current product strategy is:

> "Validate attribution and programmable royalty infrastructure before building the full decentralized inference network."

This allows the existing EVM-based MVP to demonstrate a focused product while preserving a clear technical path toward verifiable AI inference, decentralized compute, and the future VeriMind network architecture,rather than as a claim that the future decentralized inference network is already operational.
