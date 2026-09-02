# System Architecture

**Status:** MVP Architecture — Existing EVM Infrastructure
**Long-Term Vision:** Verifiable AI Attribution → Decentralized Compute → VeriMind Network

---

## 1. Overview

VeriMind is an AI Attribution & Programmable Royalty Infrastructure designed to connect AI usage with transparent attribution and programmable royalty settlement.

The current MVP intentionally focuses on the attribution and royalty layer rather than operating a new blockchain or decentralized AI compute network.

The MVP architecture is built around the following flow:

```
AI / Application
       │
       ▼
Attribution Engine
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

This architecture allows VeriMind to validate its core attribution and royalty mechanism using existing blockchain infrastructure before introducing the complexity of a dedicated network.

---

## 2. Architectural Principles

The architecture follows several principles:

### 2.1 Existing-chain first

The MVP does not require a new Layer-1 blockchain.

Smart contracts are designed to operate on an existing EVM-compatible network, allowing the system to validate its core functionality without requiring validators, consensus infrastructure, or a native network.

### 2.2 Attribution before infrastructure

The primary objective is to establish a reliable mechanism for determining contribution attribution and converting those attribution results into programmable royalty allocations.

### 2.3 Separation of computation and settlement

Attribution computation occurs outside the blockchain.

The blockchain is responsible for recording the resulting attribution data and executing royalty settlement through smart contracts.

### 2.4 Modular expansion

The MVP is designed so that future components can be introduced without changing the fundamental attribution and royalty model.

Future components may include:

- Verifiable AI inference
- Zero-Knowledge proofs
- Decentralized compute
- Distributed Attribution Nodes
- Network-level consensus
- Cosmos SDK infrastructure
- A dedicated VeriMind appchain / Layer-1

---

## 3. MVP Architecture

The current architecture consists of four primary layers.

```
┌─────────────────────────────────────────────┐
│              AI / Application               │
│                                             │
│   AI applications / datasets / creators     │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│             Attribution Engine              │
│                                             │
│   Embeddings → Similarity → Attribution     │
│                                             │
│   Current implementation: local/reference   │
│   attribution scoring engine                │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│             Attribution Records             │
│                                             │
│   Creator / Contributor → Attribution BPS   │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│              Royalty Layer                  │
│                                             │
│              RoyaltyManager                 │
│                                             │
│   Attribution → Royalty Allocation         │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│          Existing EVM-Compatible Chain      │
│                                             │
│   Smart Contracts + On-chain Settlement     │
└─────────────────────────────────────────────┘
```

---

## 4. Application Layer

The application layer represents AI applications and other systems that use AI-generated outputs.

Examples may include:

- AI applications
- AI agents
- Dataset-driven applications
- Creator platforms
- AI inference interfaces

The application layer is responsible for initiating AI usage and providing the information required by the attribution workflow.

The MVP does not require the application itself to operate on the VeriMind blockchain.

Instead, VeriMind acts as an attribution and royalty infrastructure layer that can integrate with existing applications.

---

## 5. Attribution Engine

The Attribution Engine is the primary computational component of the MVP.

Its purpose is to determine the relative contribution of registered creators or data sources to an AI interaction.

The current implementation uses vector-based similarity calculations.

Conceptually:

```
Input / Query
      │
      ▼
Embedding
      │
      ▼
Similarity Calculation
      │
      ▼
Top-K Contributors
      │
      ▼
Normalized Attribution Scores
      │
      ▼
Basis-Point Allocation
```

The current implementation includes:

- Cosine similarity
- Top-K attribution
- Score normalization
- Attribution allocation in basis points
- A 10,000 basis-point total invariant

For example:

```
Creator A → 4,500 BPS
Creator B → 3,200 BPS
Creator C → 2,300 BPS
                   ─────
                   10,000 BPS
```

The attribution engine is currently implemented as a computational/reference component rather than a decentralized network.

---

## 6. Attribution Records

Attribution results are represented as structured attribution records.

A conceptual attribution record contains:

```
Attribution Record
├── Inference / Usage Reference
├── Contributor / Creator
├── Attribution Score
├── Attribution BPS
└── Timestamp / Metadata
```

The purpose of the record is to provide a deterministic representation of the contribution allocation that can be used by the royalty layer.

The current MVP does not claim decentralized consensus over attribution records.

That functionality belongs to the future Attribution Node architecture.

---

## 7. Royalty Layer

The Royalty Layer converts attribution results into programmable financial settlement.

The primary contract responsible for this functionality is:

```
RoyaltyManager
```

The conceptual flow is:

```
Attribution Scores
       │
       ▼
Basis-Point Allocation
       │
       ▼
RoyaltyManager
       │
       ▼
Royalty Distribution
```

The royalty system allows attribution results to determine how an available royalty pool is distributed among contributors.

The MVP therefore separates:

1. Attribution calculation
2. Royalty allocation
3. On-chain settlement

This separation allows attribution logic to evolve independently from the settlement contracts.

---

## 8. Smart Contract Settlement Layer

The current repository contains the Solidity settlement layer used to model the protocol's financial and inference-related workflows.

The implemented contracts include:

| Contract | Current Role |
|---|---|
| `RoyaltyManager` | Royalty allocation and settlement |
| `InferenceManager` | Inference request state and workflow |
| `EscrowVault` | Escrowed funds |
| `StakingManager` | Stake and collateral primitives |
| `VMINDToken` | Token contract |
| `Governance` | Governance primitives |

The MVP's primary architectural path is the attribution and royalty workflow.

The other contracts provide supporting or future-oriented protocol primitives and should not be interpreted as evidence that a decentralized compute network or VeriMind Layer-1 is currently operational.

---

## 9. On-Chain vs Off-Chain Responsibilities

The architecture deliberately separates computation-heavy operations from blockchain settlement.

| Component | Location | MVP Status |
|---|---|---|
| Attribution scoring | Off-chain | Implemented |
| Vector similarity | Off-chain | Implemented |
| Attribution normalization | Off-chain | Implemented |
| Attribution records | Application / integration layer | MVP |
| Royalty allocation | Smart contracts | Implemented |
| Royalty settlement | EVM | Implemented |
| Escrow | EVM | Implemented |
| Real ZK proof generation | Off-chain | Future |
| Decentralized compute | Off-chain network | Future |
| Attribution Node network | Distributed | Future |
| Validator consensus | Network layer | Future |
| Cosmos SDK chain | Blockchain layer | Future |

This boundary is intentional.

The MVP demonstrates the economic and attribution mechanism without requiring the infrastructure necessary to operate an independent blockchain.

---

## 10. Current End-to-End MVP Flow

The primary MVP workflow is:

```
1. AI / Application
        │
        ▼
2. Attribution Engine
        │
        ▼
3. Calculate contributor similarity
        │
        ▼
4. Generate normalized attribution scores
        │
        ▼
5. Convert scores to basis points
        │
        ▼
6. Create attribution record
        │
        ▼
7. Submit royalty allocation
        │
        ▼
8. RoyaltyManager
        │
        ▼
9. Distribute royalty according to attribution
```

The important invariant is:

```
Σ Attribution BPS = 10,000
```

This provides a deterministic allocation basis for royalty settlement.

---

## 11. Trust Boundaries

The MVP has a clear trust boundary between off-chain attribution computation and on-chain settlement.

```
             OFF-CHAIN
┌──────────────────────────────┐
│ AI / Application             │
│                              │
│ Attribution Engine           │
│                              │
│ Attribution Calculation      │
└──────────────┬───────────────┘
               │
               │ Attribution Record
               ▼
             ON-CHAIN
┌──────────────────────────────┐
│ Existing EVM Chain           │
│                              │
│ RoyaltyManager               │
│ Escrow / Settlement          │
│                              │
│ Programmable Distribution    │
└──────────────────────────────┘
```

The current MVP does not provide cryptographic proof that an attribution calculation was performed correctly.

That limitation is intentional and is part of the future verifiable-inference architecture.

---

## 12. Future Verifiable AI Architecture

The next architectural stage introduces Zero-Knowledge verification.

The intended future flow is:

```
AI / Application
       │
       ▼
AI Inference
       │
       ▼
Compute Node
       │
       ├──────────────► ZK Proof Generation
       │                         │
       │                         ▼
       │                  Proof Verification
       │                         │
       ▼                         ▼
Attribution Engine ───────► Attribution Record
                                  │
                                  ▼
                            RoyaltyManager
                                  │
                                  ▼
                          Royalty Distribution
```

In this architecture, ZK proofs are intended to provide verifiability for AI computation and/or attribution-related claims.

Real cryptographic ZK verification is not part of the current MVP implementation.

---

## 13. Future Decentralized Compute Architecture

A later phase introduces decentralized compute providers.

The intended model is:

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
Inference + ZK   Inference + ZK
    │              │
    └───────┬──────┘
            ▼
      Verified Result
            │
            ▼
      Attribution
            │
            ▼
       Royalty Layer
```

This allows compute resources to become distributed rather than relying on a centralized infrastructure provider.

This component remains part of the long-term architecture.

---

## 14. Future Attribution Node Network

The current Attribution Engine may eventually evolve into a distributed Attribution Node network.

The intended future model is:

```
                Attribution Request
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
    Attribution    Attribution   Attribution
      Node A         Node B        Node C
          │            │            │
          └────────────┼────────────┘
                       ▼
                Attribution Result
                       │
                       ▼
                 Network Agreement
                       │
                       ▼
                 Royalty Settlement
```

Future responsibilities may include:

- Distributed embedding retrieval
- Persistent vector storage
- Attribution computation
- Multi-node agreement
- Staking
- Slashing
- Automated on-chain submission

None of these should be interpreted as currently operating as a decentralized Attribution Node network.

---

## 15. Future VeriMind Network / Appchain

The final architectural stage is a dedicated VeriMind network.

The long-term architecture is expected to evolve toward:

```
┌─────────────────────────────────────────────┐
│              VeriMind Applications          │
└──────────────────────┬──────────────────────┘
                       ▼
┌─────────────────────────────────────────────┐
│        Attribution & AI Infrastructure      │
│                                             │
│  Attribution Nodes + Compute Nodes + ZK     │
└──────────────────────┬──────────────────────┘
                       ▼
┌─────────────────────────────────────────────┐
│             VeriMind Network                │
│                                             │
│       Consensus / Validators / Staking      │
└──────────────────────┬──────────────────────┘
                       ▼
┌─────────────────────────────────────────────┐
│       VeriMind Appchain / Layer-1           │
│                                             │
│      Cosmos SDK + EVM Execution Target      │
└─────────────────────────────────────────────┘
```

The dedicated network is therefore a future scaling and decentralization layer, not a prerequisite for the current MVP.

---

## 16. Why the MVP Does Not Start With a Layer-1

Operating a dedicated blockchain would introduce substantial infrastructure requirements, including:

- Validator infrastructure
- Consensus
- Network security
- Token economics
- Chain operations
- RPC infrastructure
- Network upgrades
- Staking and slashing
- Cross-component coordination

These components are not necessary to validate the core VeriMind proposition.

The MVP therefore follows:

```
Attribution
     ↓
Royalty Settlement
     ↓
Existing EVM Deployment
     ↓
Product Validation
     ↓
ZK Verification
     ↓
Decentralized Compute
     ↓
Dedicated Network
```

This approach reduces initial infrastructure complexity while preserving the long-term network architecture.

---

## 17. Architecture Evolution

The intended evolution can be summarized as:

```
STAGE 1 — MVP
────────────────────────────
AI Attribution
      +
Programmable Royalties
      +
Existing EVM Chain


STAGE 2 — Verifiable Attribution
────────────────────────────
Attribution
      +
ZK Verification
      +
Existing EVM Chain


STAGE 3 — Decentralized AI
────────────────────────────
Attribution
      +
ZK
      +
Decentralized Compute
      +
Existing EVM Chain


STAGE 4 — VeriMind Network
────────────────────────────
Attribution Nodes
      +
Compute Nodes
      +
ZK
      +
Validators
      +
Consensus
      +
VeriMind Appchain / L1
```

Each stage is intended to build on the previous one rather than requiring the complete network architecture from the beginning.

---

## 18. Current Scope vs Long-Term Scope

| Component | Current MVP | Long-Term |
|---|---|---|
| AI Attribution | ✅ | ✅ |
| Vector-based scoring | ✅ | ✅ |
| Programmable royalties | ✅ | ✅ |
| EVM smart contracts | ✅ | ✅ |
| Existing-chain deployment | Target | — |
| ZK verification | ❌ | Planned |
| Compute Nodes | ❌ | Planned |
| Attribution Node network | ❌ | Planned |
| Distributed vector infrastructure | ❌ | Planned |
| Validator network | ❌ | Planned |
| Cosmos SDK | ❌ | Planned |
| VeriMind Appchain / L1 | ❌ | Long-term |
| Native network consensus | ❌ | Long-term |

---

## 19. Architectural Boundary

The current repository should be understood as a prototype of the attribution and programmable royalty layer, not as a completed decentralized AI network.

The architecture intentionally distinguishes between:

### Implemented / MVP

- Vector-based attribution
- Attribution scoring
- Basis-point allocation
- Royalty settlement
- Solidity contract infrastructure
- Existing-EVM-oriented settlement model

### Future

- Production ZK verification
- Distributed compute
- Networked Attribution Nodes
- Multi-node attribution agreement
- Validator consensus
- Cosmos SDK infrastructure
- Dedicated VeriMind network / Layer-1

This distinction keeps the current implementation aligned with the MVP while preserving the original long-term protocol vision.

---

## 20. Summary

VeriMind's current architecture is centered on one core proposition:

> "AI contribution can be represented as attribution data and converted into programmable royalty settlement."

The MVP validates this mechanism using an off-chain attribution engine and existing EVM smart-contract infrastructure.

The long-term architecture extends the same foundation with:

```
Attribution
     ↓
Verifiable Attribution
     ↓
Decentralized AI Compute
     ↓
Distributed Attribution
     ↓
VeriMind Network
```

The architectural strategy is therefore:

**Validate the product before building the network.**
