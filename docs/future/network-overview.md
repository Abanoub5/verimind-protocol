# Network Overview

**Status: Planned.** No P2P network, chain, or node discovery mechanism exists in this repository. This document gives a specification-level overview of the target network topology (whitepaper §2.1, §3) and states plainly what currently substitutes for it in testing.

## 1. Target Topology (Planned)

```mermaid
graph TB
    subgraph "Cosmos SDK App-Chain (Planned)"
        VAL1[Validator 1]
        VAL2[Validator 2]
        VAL3[Validator N]
        VAL1 <--> VAL2
        VAL2 <--> VAL3
        VAL1 <--> VAL3
    end

    subgraph "Compute Mesh (Planned - DePIN)"
        CN1[Compute Node]
        CN2[Compute Node]
        CN3[Compute Node]
    end

    subgraph "Attribution Layer (Planned)"
        AN1[Attribution Node]
        AN2[Attribution Node]
    end

    CLIENT[Client / dApp] -->|RPC - Planned| VAL1
    CN1 -->|submit tx| VAL1
    CN2 -->|submit tx| VAL2
    AN1 -->|submit tx| VAL2
    CN1 -.embeddings.-> AN1
    CN2 -.embeddings.-> AN2
    AN1 <-.consensus.-> AN2
```

None of the network edges above exist as running infrastructure. This diagram is a specification target, not a description of deployed infrastructure.

## 2. What Substitutes for This Today: The Hardhat In-Memory EVM

Everything in this repository (`test/VeriMind.test.js`, `scripts/deploy.js`) runs against Hardhat's single-process, in-memory EVM — there is no network at all in the testing environment:

```mermaid
graph LR
    subgraph "Hardhat In-Memory EVM (what this repo actually uses)"
        C[All 6 contracts deployed to<br/>one local, ephemeral chain]
    end
    T[test/VeriMind.test.js] -->|direct calls, no network| C
    D[scripts/deploy.js] -->|direct calls, no network| C
```

This is standard practice for smart contract development and testing — it is not a shortcoming to flag as a bug, but it is worth being explicit that **zero** of the distributed-systems properties described in §1 (multi-validator consensus, node discovery, P2P gossip) are exercised by anything in this repository's test suite.

## 3. Network-Level Components and Status

| Component | Status |
|---|---|
| Cosmos SDK app-chain | Planned |
| CometBFT P2P layer / gossip | Planned |
| Validator peer discovery | Planned |
| Compute Node mesh (DePIN) networking | Planned |
| Attribution Node peer-to-peer consensus | Planned |
| Public testnet | Planned — not started |
| Public mainnet | Planned — not started |
| Local development network (Hardhat) | **Implemented** — this is what `test/` and `scripts/deploy.js` actually run against |

## 4. Explicit Non-Claims

This repository does not contain, and this document does not claim the existence of: any testnet, any mainnet, any multi-node deployment, any P2P networking code, or any chain outside of Hardhat's ephemeral local EVM instance used for testing. Any reference elsewhere in this documentation set to "the chain" in a future-tense or planned context refers to the Cosmos SDK app-chain described in the whitepaper, which has not been built.
