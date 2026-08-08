# Protocol Flow

**Status: Implemented (on-chain state machine), Prototype (off-chain actors)**

This document traces one inference request end-to-end through the contracts in this repository, corresponding to whitepaper §2.2. Every step below is exercised by an automated test in `test/VeriMind.test.js`.

## 1. Sequence Diagram — Happy Path

```mermaid
sequenceDiagram
    participant Client
    participant EscrowVault
    participant InferenceManager
    participant ComputeNode
    participant ZKVerifier as ZKVerifier (Mock)
    participant StakingManager

    Client->>InferenceManager: submitRequest(id, maxFee, promptHash)
    InferenceManager->>EscrowVault: escrow(id, client, maxFee)
    EscrowVault-->>InferenceManager: OK
    Note over InferenceManager: state = REQUEST_SUBMITTED

    ComputeNode->>StakingManager: isEligible(node)?
    StakingManager-->>ComputeNode: true (staked >= minStake, not jailed)
    ComputeNode->>InferenceManager: assignNode(id)
    Note over InferenceManager: state = PROCESSING

    ComputeNode->>ComputeNode: execute model forward pass (off-chain, not in this repo)
    ComputeNode->>ComputeNode: generate ZK proof (off-chain, not in this repo)
    ComputeNode->>InferenceManager: submitProof(id, proof, publicInputs)
    Note over InferenceManager: state = PROOF_SUBMITTED
    InferenceManager->>ZKVerifier: verifyProof(proof, publicInputs)
    ZKVerifier-->>InferenceManager: valid = true
    Note over InferenceManager: state = VERIFIED

    InferenceManager->>EscrowVault: release(id, computeNode, nodePayment)
    Note over InferenceManager: state = SETTLED
```

## 2. Sequence Diagram — Invalid Proof (Adversarial Path)

```mermaid
sequenceDiagram
    participant Client
    participant InferenceManager
    participant BadNode
    participant ZKVerifier as ZKVerifier (Mock)
    participant StakingManager
    participant EscrowVault

    BadNode->>InferenceManager: assignNode(id)
    BadNode->>InferenceManager: submitProof(id, badProof, inputs)
    InferenceManager->>ZKVerifier: verifyProof(badProof, inputs)
    ZKVerifier-->>InferenceManager: valid = false
    Note over InferenceManager: state = FAILED
    InferenceManager->>StakingManager: slash(badNode, 10000 bps, "invalid ZK proof submission")
    InferenceManager->>EscrowVault: refund(id, client)
```

## 3. Off-Chain Steps Not Yet Implemented

The attribution and royalty step (whitepaper §2.2, §5) sits between proof verification and final settlement:

```mermaid
sequenceDiagram
    participant ComputeNode
    participant AttributionNode as Attribution Node (Planned)
    participant RoyaltyManager

    Note over ComputeNode: generates activation embeddings during inference (Planned — no embedding export exists yet)
    ComputeNode-->>AttributionNode: activation embeddings
    Note over AttributionNode: top-K cosine similarity + softmax<br/>(reference math implemented in attribution-engine/attribution.py,<br/>but not running as a networked node)
    AttributionNode->>RoyaltyManager: distributeRoyalties(id, amount, creators[], scoresBps[])
```

**Implemented:** the scoring math (`attribution-engine/attribution.py`) and the on-chain settlement (`RoyaltyManager.distributeRoyalties`).
**Not implemented:** the networked Attribution Node that would compute embeddings, run consensus with peer Attribution Nodes on the retrieval result (whitepaper §8, "Oracle & Vector Manipulation"), and submit the transaction automatically. In this repo, `distributeRoyalties` must currently be called by an address holding `SETTLER_ROLE` — there is no automated trigger wiring it to `InferenceManager` settlement yet.

## 4. Step-by-Step Reference

| # | Actor | Action | Contract call | State before → after |
|---|---|---|---|---|
| 1 | Client | Submit prompt, escrow max fee | `InferenceManager.submitRequest` | `IDLE` → `REQUEST_SUBMITTED` |
| 2 | Compute Node | Claim the work unit | `InferenceManager.assignNode` | `REQUEST_SUBMITTED` → `PROCESSING` |
| 3 | Compute Node | Execute model (off-chain, not in repo) | — | — |
| 4 | Compute Node | Generate ZK proof (off-chain, not in repo) | — | — |
| 5 | Compute Node | Submit proof | `InferenceManager.submitProof` | `PROCESSING` → `PROOF_SUBMITTED` → `VERIFIED` or `FAILED` |
| 6 | Attribution Node (planned) | Compute royalty scores | *off-chain, reference math only* | — |
| 7 | Settler | Distribute royalties | `RoyaltyManager.distributeRoyalties` | — |
| 8 | Anyone | Settle node payment | `InferenceManager.settle` | `VERIFIED` → `SETTLED` |
| — | Anyone | Trigger timeout if stuck | `InferenceManager.failOnTimeout` | `REQUEST_SUBMITTED`/`PROCESSING` → `FAILED` |

See [`state-machine.md`](./state-machine.md) for the full state diagram including all transitions and guards.
