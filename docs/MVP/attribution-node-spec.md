# Attribution Engine & Node Specification

**Status:** MVP Implementation (scoring engine), Planned (networked Attribution Node)

## 1. Purpose

The VeriMind attribution layer determines how an AI inference or generated output can be attributed across a set of creators or data contributors.

The current MVP implements the attribution scoring engine as a standalone reference module. It calculates contribution scores from embedding similarity and converts those scores into basis-point allocations suitable for on-chain royalty settlement.

A future version may extend this engine into a network of decentralized Attribution Nodes responsible for distributed retrieval, attribution computation, and automated submission of attribution results.

The current repository does not implement a production Attribution Node network.

---

## 2. Current MVP: Attribution Engine

The current implementation is located under:

```
attribution-engine/
```

The engine operates as a standalone reference implementation and does not currently require a networked node, vector database service, or consensus layer.

### Current Input

The engine accepts an in-memory collection of creators:

```
Creator(address, embedding)
```

along with a query or activation embedding.

### Current Output

The engine produces attribution scores that can be converted into basis points and passed to the royalty settlement layer.

Conceptually:

```
AI / Application
       ↓
Query / Activation Embedding
       ↓
Attribution Engine
       ↓
Contribution Scores
       ↓
Basis-Point Attribution
       ↓
RoyaltyManager
       ↓
Existing EVM Chain
```

---

## 3. Implemented Attribution Functions

### 3.1 `cosine_similarity(x, d)`

Computes cosine similarity between the query embedding and a creator/data embedding.

Conceptually:

```
Sim(x, d_i)
```

This corresponds to the similarity component described in the VeriMind attribution model.

**Status:** Implemented and tested.

---

### 3.2 `top_k_attribution(query, creators, k, tau)`

Performs the current attribution pipeline:

1. Compare the query embedding against creator embeddings.
2. Select the relevant top-K contributors.
3. Convert similarity values into normalized scores.
4. Produce attribution scores suitable for downstream royalty allocation.

The implementation uses a softmax-based scoring step.

**Status:** Implemented and tested.

---

## 4. Attribution Data Model

The current implementation operates on creator records supplied directly to the Python module.

A simplified representation is:

```
Creator(
    address=<creator address>,
    embedding=<creator embedding>
)
```

The current engine does not:

- fetch embeddings from an external service;
- persist embeddings in a vector database;
- maintain a distributed creator registry;
- run as a network service;
- receive network messages from Compute Nodes.

These capabilities are outside the current MVP scope.

---

## 5. Attribution-to-Royalty Interface

The attribution engine produces normalized contribution scores that can be represented as Solidity-compatible basis points.

The required invariant is:

```
sum(attribution_bps) = 10,000
```

The reference implementation preserves this invariant by correcting rounding drift after converting normalized scores into basis points.

```python
bps = [round(s * 10_000) for s in softmax_scores]

drift = 10_000 - sum(bps)

if bps:
    bps[0] += drift
```

The resulting values are intended to be compatible with the royalty settlement layer.

The corresponding Solidity-side invariant is:

```solidity
require(sumBps == 10_000, "scores must sum to 10000 bps");
```

Any future implementation of the attribution layer must preserve this exact allocation invariant before submitting royalty distributions.

---

## 6. Royalty Settlement Integration

The attribution engine is designed to operate upstream of the royalty settlement contracts.

Current conceptual flow:

```
Attribution Engine
       ↓
Attribution Scores
       ↓
Basis-Point Allocation
       ↓
RoyaltyManager
       ↓
Royalty Distribution
```

The attribution engine determines who receives what proportion of an allocation.

The royalty contract is responsible for executing the corresponding programmable settlement on-chain.

This separation allows the attribution logic to evolve independently from the settlement mechanism.

---

## 7. Future: Networked Attribution Nodes

The current attribution engine can later be extended into a decentralized Attribution Node layer.

A future networked architecture may look like:

```
Compute / AI Application
          ↓
   Activation Embedding
          ↓
  Attribution Node Network
          ↓
 Distributed Retrieval
          ↓
 Attribution Computation
          ↓
 Multi-Node Agreement
          ↓
 Attribution Record
          ↓
   RoyaltyManager
          ↓
 Existing EVM Chain
```

This is a future architecture, not a claim about the current implementation.

---

## 8. Planned Attribution Node Components

The following components are planned extensions of the current attribution engine.

| Component | Status |
|---|---|
| Vector database service | Planned |
| Persistent embedding storage | Planned |
| Network listener | Planned |
| Activation embedding ingestion | Planned |
| Distributed retrieval | Planned |
| Multi-node agreement on attribution | Planned |
| Staking / collateral integration | Planned |
| Slashing mechanisms | Planned |
| Automated on-chain submission | Planned |

These components should only be considered part of the implementation after they are independently developed and tested.

---

## 9. Future Vector Database Layer

A networked Attribution Node may maintain access to a vector database containing creator or data-contributor embeddings.

The intended workflow is:

```
Registered Creator / Dataset
          ↓
       Embedding
          ↓
   Vector Database
          ↓
 Similarity Retrieval
          ↓
 Attribution Scores
```

The current repository does not implement this persistent vector database layer.

The MVP instead operates on embeddings provided directly to the attribution engine.

---

## 10. Future Network Listener

A future Attribution Node may expose a network interface capable of receiving attribution requests or activation embeddings generated by Compute Nodes or integrated AI applications.

A conceptual request could contain:

```
Inference / Application Identifier
Activation Embedding
Attribution Parameters
Timestamp / Metadata
```

The node would then perform retrieval and attribution computation before producing an attribution record.

The protocol-level message format and network transport are future concerns and are not required for the current MVP.

---

## 11. Future Multi-Node Agreement

A decentralized Attribution Node network may require multiple nodes to independently calculate or verify attribution results.

A future implementation could compare attribution outputs across nodes before an attribution record is accepted.

Conceptually:

```
             Attribution Request
                     ↓
        ┌────────────┼────────────┐
        ↓            ↓            ↓
      Node A       Node B       Node C
        ↓            ↓            ↓
      Scores       Scores       Scores
        └────────────┼────────────┘
                     ↓
             Agreement Layer
                     ↓
           Accepted Attribution
```

The current MVP does not implement multi-node consensus or agreement.

---

## 12. Future Staking and Incentives

A future Attribution Node network may use staking or collateral mechanisms to provide economic incentives for correct participation.

Potential mechanisms include:

- node staking;
- performance requirements;
- rewards;
- penalties;
- slashing for provably incorrect or malicious behavior.

These mechanisms are not required for the current attribution engine and are therefore outside the MVP implementation.

---

## 13. Future On-Chain Submission

The current MVP treats attribution results as data that can be passed to the royalty settlement layer.

A future networked implementation may automate this process:

```
Attribution Nodes
       ↓
Verified Attribution Record
       ↓
On-Chain Submission
       ↓
RoyaltyManager
       ↓
Programmable Distribution
```

The exact authorization and verification mechanism will be defined when the decentralized Attribution Node architecture is implemented.

---

## 14. Current vs. Future Scope

### Current MVP

The repository currently focuses on:

- vector-based attribution;
- cosine similarity;
- top-K attribution;
- softmax-based scoring;
- basis-point conversion;
- attribution-to-royalty integration;
- programmable royalty settlement.

### Future Extensions

The broader VeriMind architecture may extend this foundation with:

- persistent vector databases;
- networked Attribution Nodes;
- distributed retrieval;
- multi-node agreement;
- staking and slashing;
- automated attribution submission;
- verifiable ZK inference;
- decentralized compute;
- VeriMind network / appchain infrastructure.

The future components are intentionally separated from the current MVP so that the attribution and royalty product can be validated before introducing network-level complexity.

---

## 15. Non-Claims

This specification does not claim that:

- a production Attribution Node network currently exists;
- Attribution Nodes currently operate as independent network participants;
- decentralized consensus currently determines attribution results;
- a distributed vector database is currently deployed;
- staking or slashing currently secures attribution;
- attribution results are automatically submitted on-chain by network nodes;
- current royalty tests represent production economic activity;
- the current system provides cryptographic proof of AI inference.

Current royalty and attribution demonstrations use the repository's implemented components and manually supplied or locally computed inputs.

The current ZK verification flow is test-only and should not be interpreted as production cryptographic verification.

---

## 16. Design Principle

The attribution architecture follows a staged implementation strategy:

```
Attribution Engine
       ↓
Attribution + Royalty MVP
       ↓
Existing EVM Deployment
       ↓
Production Attribution Infrastructure
       ↓
Networked Attribution Nodes
       ↓
Verifiable AI Inference
       ↓
Decentralized Compute
       ↓
VeriMind Network / Appchain
```

The immediate objective is to validate the attribution and programmable royalty layer on existing blockchain infrastructure before introducing the additional complexity of a decentralized network.

This allows the core product and economic model to be tested independently of the long-term VeriMind network architecture.
