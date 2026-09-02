# Protocol Flow

**Status:** MVP Architecture — Attribution & Programmable Royalty Flow
**Future:** Verifiable AI Inference → Decentralized Compute → VeriMind Network

---

## 1. Overview

VeriMind's current MVP focuses on connecting AI usage with contributor attribution and programmable royalty settlement.

The primary MVP flow is:

```
AI / Application
       │
       ▼
Attribution Engine
       │
       ▼
Attribution Scores
       │
       ▼
Attribution Record
       │
       ▼
RoyaltyManager
       │
       ▼
Existing EVM Chain
       │
       ▼
Royalty Distribution
```

The MVP does not require:

- A dedicated VeriMind blockchain
- Network validators
- Decentralized compute nodes
- Production Zero-Knowledge proofs
- Distributed Attribution Nodes
- Cosmos SDK infrastructure

These components belong to the future protocol architecture.

---

## 2. Core MVP Flow

The MVP workflow consists of the following stages:

```
1. AI / Application
        │
        ▼
2. Attribution Input
        │
        ▼
3. Attribution Engine
        │
        ▼
4. Contribution Scoring
        │
        ▼
5. Attribution Normalization
        │
        ▼
6. Attribution Record
        │
        ▼
7. Royalty Allocation
        │
        ▼
8. RoyaltyManager
        │
        ▼
9. On-chain Settlement
        │
        ▼
10. Contributor Distribution
```

The central objective is to transform an AI usage event into a deterministic attribution allocation and then use that allocation for programmable royalty settlement.

---

## 3. Stage 1 — AI / Application

An AI application initiates an interaction or produces an output that may involve contributions from multiple creators, datasets, or other registered sources.

Conceptually:

```
AI Application
      │
      ▼
AI Usage / Inference
      │
      ▼
Attribution Request
```

The MVP does not require the AI application to run on VeriMind infrastructure.

Instead, the application can integrate with the attribution and royalty layer.

---

## 4. Stage 2 — Attribution Input

The Attribution Engine receives the information required to calculate contribution scores.

The current reference implementation is based on vector representations.

Conceptually:

```
Input
  │
  ▼
Embedding / Vector Representation
  │
  ▼
Creator / Contributor Embeddings
```

The current repository models creator embeddings in memory for the attribution calculation.

Persistent distributed vector infrastructure is not part of the current MVP.

---

## 5. Stage 3 — Attribution Engine

The Attribution Engine calculates the relative similarity between the input and registered contributor representations.

The current implementation includes:

```
cosine_similarity(x, d)
```

and:

```
top_k_attribution(query, creators, k, tau)
```

The conceptual flow is:

```
Query Vector
     │
     ├──────────────┐
     ▼              ▼
Creator A        Creator B
Embedding        Embedding
     │              │
     ▼              ▼
Similarity       Similarity
     │              │
     └───────┬──────┘
             ▼
       Attribution Scores
```

The engine can select the highest-ranked contributors using the configured top-K attribution process.

---

## 6. Stage 4 — Contribution Scoring

The similarity results are converted into normalized attribution scores.

Conceptually:

```
Similarity Scores
       │
       ▼
Normalization
       │
       ▼
Contribution Weights
```

The purpose of normalization is to produce a deterministic allocation that can be represented and consumed by the royalty layer.

---

## 7. Stage 5 — Attribution Basis Points

The normalized scores are converted into basis points.

The system uses:

```
10,000 BPS = 100%
```

For example:

```
Creator A → 4,500 BPS
Creator B → 3,200 BPS
Creator C → 2,300 BPS
                   ─────
                  10,000 BPS
```

The core invariant is:

```
Σ Attribution BPS = 10,000
```

The implementation compensates for rounding drift so that the final allocation remains exactly 10,000 basis points.

---

## 8. Stage 6 — Attribution Record

After the attribution calculation, the resulting allocation is represented as an attribution record.

A conceptual record contains:

```
Attribution Record
├── Usage / Inference Reference
├── Contributor
├── Attribution Score
├── Attribution BPS
└── Metadata
```

The attribution record provides the bridge between the computational attribution layer and the financial settlement layer.

At the MVP stage, this bridge is not backed by decentralized network consensus.

---

## 9. Stage 7 — Royalty Allocation

The attribution allocation is used to determine how a royalty pool should be distributed.

Conceptually:

```
Royalty Pool
     │
     ▼
Attribution BPS
     │
     ├── Creator A → 45%
     ├── Creator B → 32%
     └── Creator C → 23%
```

The attribution percentages therefore become programmable settlement instructions.

---

## 10. Stage 8 — RoyaltyManager

`RoyaltyManager` is the primary smart contract responsible for the royalty settlement layer.

The conceptual interaction is:

```
Attribution Record
       │
       ▼
Attribution BPS
       │
       ▼
RoyaltyManager
       │
       ▼
Contributor Allocations
```

The contract provides the on-chain mechanism for recording and executing royalty-related allocations.

The current architecture keeps the attribution calculation outside the blockchain while using the blockchain for settlement.

---

## 11. Stage 9 — On-Chain Settlement

Once the royalty allocation is submitted to the settlement layer, the corresponding royalty distribution can be executed through the EVM-compatible blockchain.

```
Off-chain Attribution
        │
        ▼
Attribution Allocation
        │
        ▼
EVM Smart Contract
        │
        ▼
On-chain Royalty Settlement
```

The blockchain therefore acts as the settlement and transparency layer rather than performing the vector attribution calculation itself.

---

## 12. Stage 10 — Contributor Distribution

The final stage distributes the available royalty according to the attribution allocation.

Example:

```
Royalty Pool = 1,000 units

Creator A → 45% → 450
Creator B → 32% → 320
Creator C → 23% → 230
                    ───
                   1,000
```

The exact asset and funding mechanism depend on the deployment and application integration.

---

## 13. MVP End-to-End Example

A complete conceptual MVP interaction can be represented as:

```
┌─────────────────────┐
│   AI Application    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Attribution Input   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Attribution Engine  │
│                     │
│ Vector Similarity   │
│ Top-K Attribution   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Attribution Scores  │
│                     │
│ 10,000 BPS Total    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Attribution Record  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   RoyaltyManager    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Existing EVM Chain  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Royalty Distribution│
└─────────────────────┘
```

This is the primary flow that the MVP is intended to demonstrate.

---

## 14. Current Contract-Level Flow

The repository also contains an inference-oriented Solidity workflow.

That workflow is currently separate from the primary attribution/royalty MVP flow.

The implemented contract architecture includes:

```
Client
  │
  ▼
InferenceManager
  │
  ▼
EscrowVault
  │
  ▼
Inference / Request State
  │
  ▼
Proof Submission
  │
  ▼
Mock ZK Verification
  │
  ▼
Settlement
```

This flow demonstrates the existing Solidity prototype and its state-management primitives.

It should not be interpreted as the primary MVP product flow.

---

## 15. Inference State Flow

The current `InferenceManager` state machine follows:

```
IDLE
  │
  ▼
REQUEST_SUBMITTED
  │
  ▼
PROCESSING
  │
  ▼
PROOF_SUBMITTED
  │
  ├───────────────┐
  ▼               ▼
VERIFIED         FAILED
  │
  ▼
SETTLED
```

The `PROOF_SUBMITTED` state is a transient state associated with the existing inference prototype.

The state machine is retained because it represents an existing contract-level workflow and may become relevant to the future verifiable AI architecture.

---

## 16. Relationship Between Inference and Attribution

In the long-term architecture, attribution may occur as part of a verified AI inference workflow.

The intended future relationship is:

```
AI Request
    │
    ▼
Inference
    │
    ▼
Proof Generation
    │
    ▼
Proof Verification
    │
    ▼
Attribution
    │
    ▼
Royalty Settlement
```

However, the current MVP does not require the complete inference-to-proof pipeline.

The attribution and royalty layer can be validated independently.

---

## 17. Future Verifiable AI Flow

The future architecture introduces production Zero-Knowledge verification.

The intended flow is:

```
AI Application
       │
       ▼
Inference Request
       │
       ▼
Compute Node
       │
       ├──────────────► ZK Proof Generation
       │                         │
       │                         ▼
       │                  Proof Verification
       │                         │
       └───────────────┬─────────┘
                       ▼
                Verified Result
                       │
                       ▼
               Attribution Engine
                       │
                       ▼
                Attribution Record
                       │
                       ▼
                  RoyaltyManager
                       │
                       ▼
                Royalty Distribution
```

Real production ZK verification is not currently implemented.

The existing repository contains a mock verification component for prototype purposes.

---

## 18. Future Decentralized Compute Flow

A future version of VeriMind may distribute AI computation across independent compute providers.

The intended flow is:

```
AI Request
     │
     ▼
Compute Coordination
     │
     ├──────────────┐
     ▼              ▼
Compute Node A   Compute Node B
     │              │
     ▼              ▼
AI Inference     AI Inference
     │              │
     ▼              ▼
ZK Proof         ZK Proof
     │              │
     └───────┬──────┘
             ▼
       Verified Result
             │
             ▼
        Attribution
             │
             ▼
      Royalty Settlement
```

This is a future network capability and is not required for the current MVP.

---

## 19. Future Distributed Attribution Flow

The current Attribution Engine may eventually become a distributed Attribution Node network.

The intended architecture is:

```
Attribution Request
        │
        ▼
┌────────────────────────────┐
│ Distributed Attribution    │
│ Nodes                      │
└──────────────┬─────────────┘
               │
       ┌───────┼───────┐
       ▼       ▼       ▼
     Node A  Node B  Node C
       │       │       │
       └───────┼───────┘
               ▼
       Attribution Agreement
               │
               ▼
       On-chain Attribution
               │
               ▼
         RoyaltyManager
```

Potential future capabilities include:

- Distributed retrieval
- Persistent vector storage
- Multi-node attribution
- Agreement mechanisms
- Staking
- Slashing
- Automated settlement submission

These are future network capabilities.

---

## 20. Future Validator / Consensus Flow

Validators are not part of the current MVP execution path.

In the future VeriMind network, validators may provide network-level consensus and security.

Conceptually:

```
Application
     │
     ▼
Protocol Transactions
     │
     ▼
Validator Network
     │
     ▼
Consensus
     │
     ▼
VeriMind Network State
     │
     ▼
Attribution / Royalty Settlement
```

The current repository does not contain a production validator network or Cosmos/CometBFT consensus implementation.

---

## 21. Future Full Protocol Flow

The long-term protocol can therefore be represented as:

```
                    AI Application
                          │
                          ▼
                    AI Inference
                          │
                          ▼
                    Compute Nodes
                          │
                    ┌─────┴─────┐
                    ▼           ▼
                  Inference    ZK Proof
                    │           │
                    └─────┬─────┘
                          ▼
                  Verified Result
                          │
                          ▼
                Attribution Network
                          │
                          ▼
                Attribution Agreement
                          │
                          ▼
                  Attribution Record
                          │
                          ▼
                  Royalty Settlement
                          │
                          ▼
                VeriMind Network
                          │
                          ▼
               Contributor Distribution
```

This represents the long-term architecture rather than the current MVP.

---

## 22. Failure and Validation Boundaries

The MVP introduces fewer protocol-level failure points because attribution computation and settlement are separated.

Important boundaries include:

```
Attribution Layer
       │
       ├── Invalid / malformed attribution data
       │
       ▼
Settlement Layer
       │
       ├── Invalid allocation
       ├── Funding issues
       └── Contract validation
```

The attribution layer must produce a valid allocation before the settlement layer can use it.

The core allocation invariant remains:

```
Σ Attribution BPS = 10,000
```

---

## 23. Current vs Future Protocol Flow

| Flow Component | Current MVP | Future |
|---|---|---|
| AI Application | ✅ | ✅ |
| Attribution Engine | ✅ | ✅ |
| Vector Similarity | ✅ | ✅ |
| Top-K Attribution | ✅ | ✅ |
| Basis-Point Allocation | ✅ | ✅ |
| Attribution Record | MVP | ✅ |
| RoyaltyManager | ✅ | ✅ |
| Existing EVM Settlement | ✅ | ✅ |
| Production ZK Verification | ❌ | Planned |
| Compute Nodes | ❌ | Planned |
| Distributed Attribution Nodes | ❌ | Planned |
| Multi-node Agreement | ❌ | Planned |
| Validator Network | ❌ | Planned |
| Cosmos SDK | ❌ | Planned |
| Dedicated VeriMind Network | ❌ | Long-term |

---

## 24. Architectural Interpretation

The protocol should currently be understood as two connected but distinct layers:

```
┌───────────────────────────────────────┐
│       Attribution / Computation       │
│                                       │
│  Vector Similarity                    │
│  Contribution Scoring                 │
│  Attribution Allocation               │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│          Blockchain Settlement         │
│                                       │
│  RoyaltyManager                       │
│  Escrow / Settlement Contracts        │
│  Existing EVM Chain                   │
└───────────────────────────────────────┘
```

The future protocol expands the first layer with verifiable and decentralized infrastructure and eventually introduces a dedicated network.

---

## 25. Summary

The current VeriMind protocol flow is intentionally simple:

```
AI Usage
   ↓
Attribution
   ↓
Attribution Record
   ↓
Royalty Allocation
   ↓
RoyaltyManager
   ↓
Existing EVM Settlement
   ↓
Contributor Distribution
```

This provides the foundation for the long-term protocol.

Future stages add:

```
ZK Verification
      ↓
Decentralized Compute
      ↓
Distributed Attribution
      ↓
Validators / Consensus
      ↓
VeriMind Network
```

The core architectural principle is:

**Start with attribution and programmable royalty settlement, validate the mechanism on existing infrastructure, and progressively introduce verifiability, decentralization, and network-level infrastructure.**
