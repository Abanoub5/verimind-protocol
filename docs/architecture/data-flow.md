# Data Flow

Status: MVP Architecture — Attribution & Programmable Royalty Flow
Future: Verifiable AI Data → Decentralized Compute → VeriMind Network

---

## 1. Overview

VeriMind separates computational data processing from blockchain settlement.

The current MVP focuses on the flow of attribution information from an AI/application context into programmable royalty settlement on an existing EVM-compatible blockchain.

The primary data flow is:

```
AI / Application
       │
       ▼
Attribution Input
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
Royalty Allocation
       │
       ▼
RoyaltyManager
       │
       ▼
On-chain Settlement
       │
       ▼
Royalty Distribution
```

The blockchain is not responsible for performing vector similarity calculations.

Instead:

- Attribution computation occurs off-chain.
- Attribution results are represented as structured data.
- Royalty settlement occurs on-chain.
- Blockchain events provide an on-chain record of settlement activity.

---

## 2. Data Flow Boundaries

The current architecture can be divided into two primary data domains:

```
┌────────────────────────────────────────────┐
│                OFF-CHAIN                   │
│                                            │
│ AI / Application                           │
│ Attribution Input                          │
│ Embeddings                                  │
│ Similarity Calculation                      │
│ Attribution Scores                          │
│ Attribution Record Preparation              │
└──────────────────────┬─────────────────────┘
                       │
                       │ Attribution / Settlement Data
                       ▼
┌────────────────────────────────────────────┐
│                 ON-CHAIN                   │
│                                            │
│ RoyaltyManager                             │
│ Escrow / Settlement Contracts              │
│ Contract State                             │
│ Events                                     │
└────────────────────────────────────────────┘
```

This boundary is intentional.

Computationally intensive or application-specific data remains outside the blockchain, while financial settlement and relevant state are handled by smart contracts.

---

## 3. MVP Data Flow

The complete MVP data flow is:

```
┌─────────────────────┐
│   AI / Application  │
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
│ Embeddings          │
│ Similarity          │
│ Top-K Selection     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Attribution Scores  │
│                     │
│ Normalized to       │
│ 10,000 BPS          │
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

---

## 4. AI / Application Data

The application layer may generate or reference an AI usage event.

The application can provide the attribution layer with the data required to determine contributor relationships.

The current MVP does not require raw prompts, model weights, or other large AI artifacts to be stored on-chain.

Conceptually:

```
Application
    │
    ├── Usage / Inference Reference
    │
    ├── Attribution Input
    │
    └── Contributor References
            │
            ▼
      Attribution Engine
```

Application-specific data may remain off-chain.

---

## 5. Embedding Data

The current attribution implementation uses vector representations for similarity-based attribution.

Conceptually:

```
Input
  │
  ▼
Input Embedding
  │
  ├──────────────┐
  ▼              ▼
Creator A      Creator B
Embedding      Embedding
  │              │
  └──────┬───────┘
         ▼
Similarity Calculation
```

The current implementation uses in-memory creator representations.

A persistent or distributed vector database is not required for the current MVP.

Future versions may introduce persistent vector infrastructure.

---

## 6. Attribution Calculation Data

The Attribution Engine processes the input vector against available contributor representations.

The current reference implementation includes:

```
cosine_similarity(x, d)
```

and:

```
top_k_attribution(query, creators, k, tau)
```

The resulting data can be represented conceptually as:

```
Contributor
    │
    ├── Similarity Score
    │
    └── Attribution Weight
```

These values are then normalized before being passed to the royalty layer.

---

## 7. Attribution Score Normalization

Attribution scores are normalized into a deterministic allocation.

The final allocation uses basis points:

```
10,000 BPS = 100%
```

Example:

```
Raw / normalized contribution
           │
           ▼
┌─────────────────────────┐
│ Attribution Allocation  │
├─────────────────────────┤
│ Creator A → 4,500 BPS   │
│ Creator B → 3,200 BPS   │
│ Creator C → 2,300 BPS   │
└─────────────────────────┘
```

The core invariant is:

```
Σ Attribution BPS = 10,000
```

Rounding adjustment is applied so that the final allocation remains exactly 10,000 BPS.

---

## 8. Attribution Record

The Attribution Record acts as the bridge between off-chain computation and on-chain royalty settlement.

A conceptual record contains:

```
Attribution Record
├── Usage / Inference Reference
├── Contributor Identifier
├── Attribution Score
├── Attribution BPS
└── Metadata
```

The record does not require storing the underlying embedding vectors on-chain.

The MVP focuses on the resulting attribution allocation rather than blockchain storage of the complete computational dataset.

---

## 9. Royalty Allocation Data

The attribution record is transformed into royalty allocation instructions.

Conceptually:

```
Attribution Record
       │
       ▼
Attribution BPS
       │
       ▼
Royalty Allocation
       │
       ▼
RoyaltyManager
```

Example:

```
Royalty Pool = 1,000 units

Creator A → 4,500 BPS → 450 units
Creator B → 3,200 BPS → 320 units
Creator C → 2,300 BPS → 230 units
```

The attribution percentages therefore determine the relative distribution of the royalty pool.

---

## 10. On-Chain Data

The blockchain stores data required for contract execution and settlement.

The current contract architecture includes state associated with:

- Inference requests
- Request status
- Escrow
- Stake / collateral
- Royalty settlement
- Contract configuration
- Settlement-related events

The MVP's primary on-chain role is royalty settlement.

---

## 11. RoyaltyManager Data Flow

The "RoyaltyManager" receives the royalty allocation information required for settlement.

Conceptually:

```
Attribution BPS
      │
      ▼
RoyaltyManager
      │
      ├── Validate Allocation
      │
      ├── Record Settlement State
      │
      └── Execute / Account for Distribution
```

The contract enforces allocation-related invariants required by its implementation.

The attribution calculation itself remains outside the contract.

---

## 12. Event Data

Smart-contract events provide an on-chain record of relevant state transitions and settlement activity.

Conceptually:

```
Contract State Change
        │
        ▼
      Event
        │
        ▼
On-chain Event Log
        │
        ▼
External Indexing / Monitoring
```

Event logs can therefore be used as an audit trail for blockchain-side operations.

They do not replace the underlying off-chain attribution computation.

---

## 13. Data That Remains Off-Chain

The following categories are intentionally not required to be stored directly on-chain in the MVP:

| Data | Location | Status |
|---|---|---|
| Raw AI prompt | Off-chain / application | Optional |
| Model weights | Off-chain | Future integration |
| Embeddings | Off-chain | Implemented/reference |
| Vector database | Off-chain | Future |
| Attribution calculation | Off-chain | Implemented |
| Similarity scores | Off-chain | Implemented |
| Attribution allocation preparation | Off-chain | MVP |
| ZK proof generation data | Off-chain | Future |
| Compute workload data | Off-chain | Future |
| Distributed node messages | Off-chain network | Future |

This keeps blockchain storage focused on data required for settlement and protocol state.

---

## 14. Data That Is Stored On-Chain

The current smart-contract architecture stores protocol state necessary for contract execution.

Conceptually:

```
On-chain
├── Request State
├── Escrow State
├── Stake / Collateral State
├── Royalty Settlement State
├── Contract Configuration
└── Event Logs
```

The exact storage fields are defined by the Solidity contract implementations.

---

## 15. Current Inference Data Flow

The repository also contains an inference-oriented contract workflow.

This flow is separate from the primary MVP attribution-to-royalty path.

Conceptually:

```
Client
  │
  ▼
InferenceManager
  │
  ▼
Request State
  │
  ▼
EscrowVault
  │
  ▼
Processing
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

This represents the current Solidity prototype's inference state and settlement primitives.

It should not be interpreted as a production decentralized AI execution pipeline.

---

## 16. ZK Proof Data

The current repository contains a mock ZK verification component.

The current prototype can accept proof-related data for the inference workflow, but it does not implement production cryptographic proof generation and verification.

Therefore:

```
Current:
Proof Data → Mock Verification

Future:
Inference → ZK Proof Generation → Cryptographic Verification
```

Production ZK proof data flows belong to the future verifiable AI architecture.

---

## 17. Future Verifiable AI Data Flow

A future version may introduce cryptographically verifiable AI execution.

The intended data flow is:

```
AI Input
   │
   ▼
Compute Node
   │
   ├── Model / Computation Data
   │
   ├── Inference Result
   │
   └── Witness Data
            │
            ▼
       ZK Prover
            │
            ▼
         ZK Proof
            │
            ▼
      Proof Verifier
            │
            ▼
      Verified Result
            │
            ▼
       Attribution
            │
            ▼
      Royalty Settlement
```

This architecture is future work.

---

## 18. Future Decentralized Compute Data

Future Compute Nodes may exchange computation-related data through a decentralized network.

Conceptually:

```
Inference Request
       │
       ▼
Compute Coordination
       │
       ├──────────────┐
       ▼              ▼
Compute Node A   Compute Node B
       │              │
       ▼              ▼
Result + Proof    Result + Proof
       │              │
       └──────┬───────┘
              ▼
       Verified Result
```

The current MVP does not implement this distributed data exchange.

---

## 19. Future Distributed Attribution Data

A future Attribution Node network may distribute attribution-related data across independent nodes.

Potential data includes:

- Contributor embeddings
- Retrieval results
- Attribution inputs
- Similarity calculations
- Attribution proposals
- Node signatures
- Agreement data

Conceptually:

```
Attribution Input
       │
       ▼
Distributed Attribution Nodes
       │
       ▼
Independent Attribution Results
       │
       ▼
Network Agreement
       │
       ▼
Final Attribution Record
       │
       ▼
Royalty Settlement
```

Persistent distributed vector storage and multi-node agreement are future components.

---

## 20. Future Validator Data Flow

Validators become relevant only when VeriMind operates its own network.

The intended future flow is:

```
Protocol Transaction
       │
       ▼
Validator Network
       │
       ▼
Consensus
       │
       ▼
Canonical Network State
       │
       ▼
Attribution / Royalty State
```

The current EVM MVP does not have a VeriMind validator set or native consensus layer.

---

## 21. Data Integrity Invariants

The MVP relies on several important data integrity boundaries.

The primary attribution invariant is:

```
Σ Attribution BPS = 10,000
```

This ensures that the complete attribution allocation represents exactly 100% of the distribution.

At the settlement layer, smart contracts validate the conditions required by their respective functions.

Additional validation rules are defined within the Solidity implementation.

---

## 22. Data Lifecycle

The conceptual lifecycle of an attribution record is:

```
Generated
    │
    ▼
Calculated
    │
    ▼
Normalized
    │
    ▼
Recorded
    │
    ▼
Submitted for Settlement
    │
    ▼
Settled
    │
    ▼
Distributed
```

The blockchain portion of this lifecycle provides persistent settlement state and event history.

The attribution computation remains outside the chain.

---

## 23. Data Availability Model

The MVP intentionally avoids putting large AI-related data directly on-chain.

The architecture therefore follows:

```
Large / Computational Data
          │
          ▼
       Off-chain
          │
          │
          ▼
Small / Settlement Data
          │
          ▼
       On-chain
```

This reduces unnecessary blockchain storage and keeps computational workloads outside the settlement layer.

---

## 24. Current Data Flow vs Future Data Flow

| Data Flow Component | Current MVP | Future |
|---|---|---|
| AI Application Input | ✅ | ✅ |
| Embedding-based Attribution | ✅ | ✅ |
| Similarity Calculation | ✅ | ✅ |
| Top-K Attribution | ✅ | ✅ |
| BPS Normalization | ✅ | ✅ |
| Attribution Record | MVP | ✅ |
| Royalty Allocation | ✅ | ✅ |
| On-chain Settlement | ✅ | ✅ |
| Event-based Settlement History | ✅ | ✅ |
| Production ZK Proofs | ❌ | Planned |
| Distributed Compute Data | ❌ | Planned |
| Distributed Vector Storage | ❌ | Planned |
| Attribution Node Network | ❌ | Planned |
| Multi-node Agreement | ❌ | Planned |
| Validator Data Layer | ❌ | Planned |
| Native Network State | ❌ | Long-term |

---

## 25. Data Flow Summary

The current VeriMind data architecture can be summarized as:

```
AI / Application
       │
       ▼
Attribution Input
       │
       ▼
Vector Attribution
       │
       ▼
Attribution Scores
       │
       ▼
10,000 BPS Allocation
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

The long-term data architecture extends this model with:

```
AI Input
   │
   ▼
Decentralized Compute
   │
   ▼
ZK Proof
   │
   ▼
Verified Result
   │
   ▼
Distributed Attribution
   │
   ▼
Attribution Agreement
   │
   ▼
Royalty Settlement
   │
   ▼
VeriMind Network
```

The fundamental design principle remains:

**Keep computationally intensive AI and attribution data off-chain, while using blockchain infrastructure for verifiable settlement and programmable royalty distribution.**
