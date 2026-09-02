# Contract Interactions

Status: MVP Contract Architecture — Existing EVM Infrastructure
Future: Verifiable AI → Decentralized Compute → VeriMind Network

---

## 1. Overview

VeriMind's current smart-contract architecture provides the on-chain settlement layer for attribution and programmable royalties.

The MVP is designed to operate on an existing EVM-compatible blockchain.

The primary contract interaction is centered around:

```
Attribution Allocation
        │
        ▼
   RoyaltyManager
        │
        ▼
Existing EVM Chain
        │
        ▼
Royalty Settlement
```

The repository also contains additional contracts that support the broader protocol prototype and future verifiable AI architecture.

These contracts should not be interpreted as evidence that the complete decentralized AI network is currently operational.

---

## 2. Contract Inventory

The current Solidity repository contains the following primary contracts:

| Contract | Role | Current Status |
|---|---|---|
| `RoyaltyManager` | Royalty allocation and settlement | Implemented |
| `InferenceManager` | Inference request and state workflow | Implemented / Prototype |
| `EscrowVault` | Escrowed funds | Implemented |
| `StakingManager` | Stake and collateral primitives | Implemented |
| `VMINDToken` | Protocol token | Implemented |
| `Governance` | Governance primitives | Implemented |

The current MVP focuses primarily on `RoyaltyManager` and its relationship to attribution data.

The remaining contracts provide supporting infrastructure for the existing prototype and future protocol expansion.

---

## 3. MVP Contract Interaction

The primary MVP interaction is:

```
Off-chain Attribution Engine
           │
           │ Attribution BPS
           ▼
┌──────────────────────┐
│    RoyaltyManager    │
└──────────┬───────────┘
           │
           ▼
  Royalty Settlement
           │
           ▼
Contributor Distribution
```

The Attribution Engine performs the computational attribution process outside the blockchain.

`RoyaltyManager` is responsible for the blockchain-side royalty settlement.

---

## 4. Attribution-to-Royalty Boundary

The current architecture separates attribution computation from financial settlement.

```
OFF-CHAIN
─────────────────────────────
Attribution Engine
      │
      ├── Embeddings
      ├── Similarity
      ├── Top-K Selection
      └── Attribution BPS
              │
              ▼
       Attribution Record
              │
              │
ON-CHAIN      ▼
─────────────────────────────
RoyaltyManager
      │
      ▼
Royalty Settlement
```

The blockchain does not perform the vector similarity calculation.

The attribution result is passed into the settlement layer as structured allocation data.

---

## 5. Attribution Allocation

The MVP represents attribution as basis points.

```
10,000 BPS = 100%
```

Example:

```
Creator A → 4,500 BPS
Creator B → 3,200 BPS
Creator C → 2,300 BPS
                   ─────
                  10,000
```

The primary allocation invariant is:

```
Σ Attribution BPS = 10,000
```

The Attribution Engine is responsible for producing the normalized allocation.

The settlement layer consumes the resulting allocation.

---

## 6. RoyaltyManager

`RoyaltyManager` is the central royalty contract in the MVP architecture.

Its conceptual responsibilities are:

- Receive royalty allocation information
- Validate settlement conditions
- Maintain royalty-related state
- Account for contributor allocations
- Execute or support royalty distribution

Conceptually:

```
Attribution BPS
      │
      ▼
RoyaltyManager
      │
      ├── Allocation Validation
      │
      ├── Settlement State
      │
      └── Distribution
```

The exact behavior is defined by the Solidity implementation.

---

## 7. RoyaltyManager Funding Model

The current prototype requires the royalty pool to be funded for settlement.

The present implementation does not automatically enforce that:

```
InferenceManager.settle()
        │
        ▼
RoyaltyManager Funding
```

are the same atomic operation.

In the current prototype, royalty settlement may require the caller or integration layer to provide the necessary funds to `RoyaltyManager`.

This is an important integration boundary for future production deployment.

A production design may instead connect escrow release directly to royalty settlement so that eligible royalty funds flow atomically into the royalty mechanism.

That behavior should be treated as a future integration improvement unless implemented in the deployed contract version.

---

## 8. InferenceManager

`InferenceManager` represents the current inference-oriented contract workflow.

Its primary role in the prototype is to manage inference request state.

Conceptually:

```
Client
  │
  ▼
InferenceManager
  │
  ├── Request Creation
  ├── Processing State
  ├── Proof Submission
  ├── Verification Result
  └── Settlement
```

The inference workflow is retained in the repository because it provides the foundation for the future verifiable AI architecture.

It is not the primary MVP product flow.

---

## 9. InferenceManager State Interaction

The current state progression is:

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
  ├──────────────┐
  ▼              ▼
VERIFIED        FAILED
  │
  ▼
SETTLED
```

The state machine is implemented at the Solidity prototype level.

The complete decentralized AI execution environment surrounding this state machine is not currently implemented.

---

## 10. EscrowVault

`EscrowVault` provides escrow-related financial infrastructure.

The conceptual interaction is:

```
Client Funds
     │
     ▼
EscrowVault
     │
     ├── Hold Funds
     │
     └── Release / Settlement
```

Escrow provides a mechanism for holding funds associated with protocol operations.

The current architecture does not automatically imply that every escrowed amount becomes a royalty pool.

The relationship between inference fees, escrow, and royalty funding depends on the specific settlement workflow.

---

## 11. Inference and Escrow Interaction

The current inference-oriented contract flow can be represented as:

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
Inference Processing
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

This is the current contract-level prototype flow.

The attribution and royalty workflow is conceptually separate:

```
Attribution Engine
       │
       ▼
Attribution Allocation
       │
       ▼
RoyaltyManager
```

A future production architecture may connect these flows more tightly.

---

## 12. StakingManager

`StakingManager` provides staking and collateral primitives.

Its conceptual role is:

```
Participant
    │
    ▼
StakingManager
    │
    ├── Stake
    ├── Collateral
    └── Related State
```

These primitives are relevant to the future decentralized compute and network architecture.

The presence of staking functionality in the repository does not mean that a decentralized validator or compute network is currently operational.

---

## 13. VMINDToken

`VMINDToken` provides the protocol token contract included in the current repository.

Conceptually:

```
VMINDToken
     │
     ├── Protocol Token
     │
     ├── Future Network Economics
     │
     └── Future Incentive Mechanisms
```

The token contract is part of the broader protocol prototype.

The current MVP does not depend on a dedicated VeriMind network to demonstrate attribution and royalty settlement.

---

## 14. Governance

`Governance` provides governance-related contract primitives.

Conceptually:

```
Governance
    │
    ├── Protocol Configuration
    ├── Future Parameter Management
    └── Future Network Governance
```

Governance becomes more important as the protocol evolves toward a decentralized network.

It is not required for the basic attribution-to-royalty MVP workflow.

---

## 15. Current Contract Call Graph

The current repository contains an inference-oriented interaction graph approximately represented by:

```
Client
  │
  ▼
InferenceManager
  │
  ├──────────────► EscrowVault
  │
  ├──────────────► Mock ZK Verifier
  │
  └──────────────► StakingManager
                         │
                         ▼
                    Stake / Collateral


Attribution Engine
       │
       ▼
Attribution Allocation
       │
       ▼
RoyaltyManager
       │
       ▼
Royalty Settlement
```

The two flows are related conceptually but are not currently one fully automated atomic pipeline.

---

## 16. Access Control

The contracts use role-based and permission-based controls where required by their implementation.

One important integration point is:

```
RoyaltyManager
      │
      └── SETTLER_ROLE
```

The current deployment configuration does not automatically grant `SETTLER_ROLE` to a production settlement actor.

Tests may grant the role to the deployer for testing purposes.

A production deployment therefore requires an explicit decision regarding which trusted integration component or contract is authorized to submit royalty settlements.

---

## 17. MVP Settlement Boundary

The current MVP boundary can be represented as:

```
┌─────────────────────────────────────┐
│          Attribution Layer          │
│                                     │
│ Attribution Engine                  │
│ Similarity                          │
│ Scoring                             │
│ BPS Allocation                      │
└──────────────────┬──────────────────┘
                   │
                   │ Attribution Data
                   ▼
┌─────────────────────────────────────┐
│          Settlement Layer           │
│                                     │
│ RoyaltyManager                      │
│ Existing EVM Chain                  │
└──────────────────┬──────────────────┘
                   │
                   ▼
            Royalty Distribution
```

This is the most important contract boundary for the current MVP.

---

## 18. Future ZK Interaction

The current prototype contains mock ZK verification.

The future architecture replaces this with production cryptographic verification.

Current:

```
Proof Data
    │
    ▼
Mock Verifier
    │
    ▼
Verification Result
```

Future:

```
AI Inference
    │
    ▼
ZK Prover
    │
    ▼
Cryptographic Proof
    │
    ▼
On-chain Verifier
    │
    ▼
Verified Result
```

Production ZK proof generation and verification are future components.

---

## 19. Future Compute Node Interaction

In the future decentralized compute architecture, Compute Nodes may interact with the protocol through an inference and verification layer.

Conceptually:

```
Inference Request
      │
      ▼
Compute Node
      │
      ├── Execute AI Workload
      │
      ├── Produce Result
      │
      └── Generate ZK Proof
                 │
                 ▼
           Proof Verification
                 │
                 ▼
             Attribution
                 │
                 ▼
            RoyaltyManager
```

Compute Nodes are not part of the current MVP contract interaction path.

---

## 20. Future Attribution Node Interaction

A future decentralized Attribution Node network may submit agreed attribution results to the settlement layer.

Conceptually:

```
Attribution Request
       │
       ▼
Attribution Nodes
       │
       ▼
Node Results
       │
       ▼
Network Agreement
       │
       ▼
Attribution Record
       │
       ▼
RoyaltyManager
```

The current MVP uses a computational Attribution Engine rather than a decentralized Attribution Node network.

---

## 21. Future Network Interaction

If VeriMind evolves into a dedicated network, contract interactions may eventually be replaced or supplemented by native protocol modules.

The long-term architecture may include:

```
Application
     │
     ▼
VeriMind Protocol
     │
     ├── Attribution
     ├── Compute
     ├── ZK Verification
     ├── Staking
     └── Governance
             │
             ▼
      VeriMind Network
             │
             ▼
        Consensus
```

The current EVM contracts should therefore be viewed as the settlement/prototype foundation for this longer-term architecture.

---

## 22. Current vs Future Contract Interactions

| Interaction | Current MVP | Future |
|---|---|---|
| Attribution Engine → RoyaltyManager | Core path | Core path |
| Royalty settlement on EVM | Core path | Supported |
| InferenceManager workflow | Prototype | Expanded |
| EscrowVault | Implemented | Expanded |
| StakingManager | Primitive | Network security |
| VMINDToken | Implemented | Network economics |
| Governance | Primitive | Protocol governance |
| Mock ZK verification | Prototype | Replaced by real ZK |
| Compute Node → Protocol | ❌ | Planned |
| Attribution Node → Protocol | ❌ | Planned |
| Validator → Consensus | ❌ | Planned |
| Cosmos SDK | ❌ | Planned |
| VeriMind Appchain / L1 | ❌ | Long-term |

---

## 23. Important Architectural Limitations

The current contract architecture has several boundaries that should remain explicit:

### 23.1 Attribution is not currently trustless

The MVP attribution calculation occurs off-chain.

There is no production cryptographic proof that the calculated attribution is correct.

### 23.2 Royalty funding is not automatically coupled to inference settlement

The current prototype does not enforce an atomic relationship between inference escrow release and royalty pool funding.

### 23.3 No decentralized Attribution Node consensus

The current Attribution Engine is not a distributed node network.

### 23.4 No production ZK verification

The current ZK component is a mock verifier.

### 23.5 No native validator network

The current contracts do not constitute a VeriMind consensus network.

These limitations define the boundary between the MVP and the future protocol.

---

## 24. Production Evolution

The intended evolution of the contract architecture is:

```
MVP
 │
 ├── Attribution Engine
 │
 └── RoyaltyManager
          │
          ▼
    Existing EVM Chain
          │
          ▼
     Product Validation
          │
          ▼
Verifiable Attribution
          │
          ▼
ZK Verification
          │
          ▼
Decentralized Compute
          │
          ▼
Distributed Attribution
          │
          ▼
VeriMind Network
```

Each stage adds infrastructure only when the previous stage has been validated.

---

## 25. Summary

The current VeriMind contract architecture is centered on programmable royalty settlement.

The primary MVP interaction is:

```
Attribution Engine
       │
       ▼
Attribution Allocation
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

The repository also contains supporting contract primitives for:

- Inference workflows
- Escrow
- Staking
- Token economics
- Governance
- Prototype ZK verification

These components provide a foundation for future protocol expansion but should not be interpreted as a completed decentralized AI network.

The long-term architecture extends the contract layer with:

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

The architectural principle remains:

**Use existing EVM infrastructure to validate attribution and programmable royalties first, then progressively introduce verifiability, decentralization, and network-level infrastructure.**
