# VeriMind

**AI Attribution & Programmable Royalty Infrastructure**

VeriMind is an early-stage infrastructure project for attributing AI-generated outputs to contributing datasets and creators, and enabling programmable royalty settlement through smart contracts.

The current MVP focuses on the attribution and royalty layer, designed to operate on an existing EVM-compatible blockchain rather than requiring a new Layer-1 network.

> Technical Specification v2.1 · August 2026 · Founder: AbanoubRajaey

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-early--development-orange.svg)]()

---

## Overview

Generative AI creates a growing gap between the systems that produce outputs and the creators or datasets that contribute to those outputs.

VeriMind focuses on two core problems:

1. **Attribution** — identifying and scoring the contribution of indexed creator datasets to an AI output.
2. **Royalty Settlement** — translating attribution results into programmable royalty distributions through smart contracts.

The current MVP separates the attribution computation from on-chain settlement:

```
AI / Application
       │
       ▼
Attribution Engine
       │
       │ Contribution Scores
       ▼
Attribution Records
       │
       ▼
Royalty Engine
       │
       ▼
Smart Contracts
       │
       ▼
Existing EVM Chain
       │
       ▼
Programmable Royalty Distribution
```

This approach allows VeriMind to validate the core attribution and royalty model before introducing additional protocol infrastructure.

---

## Current MVP

The current development focus is:

### 1. Vector-Based Attribution

The reference attribution engine compares AI output embeddings against indexed creator datasets using vector similarity and produces contribution scores.

The implementation is located in:

```
attribution-engine/
```

The current reference implementation includes:

- Vector-based similarity scoring
- Attribution calculation
- Creator contribution scoring
- A bridge between the attribution engine and the Solidity layer

### 2. Programmable Royalty Settlement

Attribution results can be connected to on-chain royalty settlement through the Solidity contracts.

The core royalty logic is implemented in:

```
contracts/RoyaltyManager.sol
```

The objective is to provide programmable settlement logic that can distribute royalties according to recorded attribution results.

### 3. End-to-End Demonstration

The repository contains an isolated demonstration connecting the implemented components:

```
demo/
```

The demo illustrates the currently implemented attribution-to-royalty settlement workflow. The inference, escrow, staking, and mock ZK components are prototype/future-oriented primitives and are not required for the current MVP.

The ZK component used in this demonstration is a test-only mock verifier and does not represent production cryptographic proof verification.

---

## Repository Structure

```
verimind-protocol/
│
├── contracts/
│   ├── VMINDToken.sol
│   ├── InferenceManager.sol
│   ├── RoyaltyManager.sol
│   ├── StakingManager.sol
│   ├── EscrowVault.sol
│   └── Governance.sol
│
├── attribution-engine/
│   ├── attribution.py
│   ├── requirements.txt
│   └── README.md
│
├── demo/
│   ├── run-demo.js
│   ├── attribution_bridge.py
│   └── README.md
│
├── docs/
│   ├── mvp/
│   │   └── attribution-node-spec.md
│   │
│   ├── future/
│   │   ├── compute-node-spec.md
│   │   ├── network-overview.md
│   │   ├── protocol-messages.md
│   │   ├── rpc-spec.md
│   │   ├── tokenomics-spec.md
│   │   └── validator-spec.md
│   │
│   ├── architecture/
│   ├── benchmarks/
│   ├── security/
│   └── ROADMAP.md
│
├── scripts/
├── test/
├── hardhat.config.js
├── CONTRIBUTING.md
└── LICENSE
```

---

## Development Status

VeriMind is currently in early development, with the MVP centered on attribution and programmable royalty infrastructure.

### Implemented

- [x] Vector-based attribution reference implementation
- [x] Attribution scoring engine
- [x] Solidity contract architecture and core logic scaffolding
- [x] Royalty settlement logic
- [x] Integration between attribution results and the Solidity layer
- [x] Isolated end-to-end demonstration
- [x] Contract test suite

### In Progress / Planned

- [ ] Production-ready deployment on an existing EVM-compatible network
- [ ] Production integration between applications, attribution records, and royalty settlement
- [ ] Production cryptographic ZK proof system
- [ ] Decentralized compute node network
- [ ] Cosmos SDK application chain
- [ ] Native VeriMind network / Layer-1
- [ ] Testnet deployment
- [ ] Independent security audit

The distinction between the current MVP and the long-term protocol architecture is intentional.

---

## Long-Term Architecture

The long-term VeriMind vision extends the attribution and royalty layer with verifiable AI inference and decentralized compute infrastructure.

```
                VeriMind Long-Term Architecture

                       AI Applications
                              │
                              ▼
                    Attribution Layer
                              │
                              ▼
                     Royalty Settlement
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
        ZK Proof of Inference        Contribution Records
                │                           │
                └─────────────┬─────────────┘
                              │
                              ▼
                    Decentralized Compute
                              │
                              ▼
                    VeriMind Network
                              │
                              ▼
                    Future Appchain / L1
```

The following components are therefore maintained as future architecture, rather than being represented as part of the current MVP:

- Zero-knowledge proof of AI inference
- Decentralized compute orchestration
- Validator and network infrastructure
- Cosmos SDK application chain
- Native VeriMind Layer-1
- Extended tokenomics and network incentives

Relevant future specifications are maintained under:

```
docs/future/
```

---

## Smart Contracts

The repository currently contains Solidity contracts covering the broader protocol architecture and the implemented royalty flow.

Key components include:

| Contract | Purpose |
|---|---|
| `RoyaltyManager.sol` | Royalty settlement logic |
| `InferenceManager.sol` | Inference lifecycle and related protocol state |
| `EscrowVault.sol` | Escrow functionality |
| `StakingManager.sol` | Staking-related protocol logic |
| `VMINDToken.sol` | VMIND token implementation |
| `Governance.sol` | Governance-related protocol scaffolding |

The MVP does not require deployment of a new Layer-1. The intended initial deployment model is to use an existing EVM-compatible blockchain.

---

## Attribution Engine

The attribution engine provides the current reference implementation for vector-based attribution.

Location:

```
attribution-engine/
```

Basic usage:

```bash
cd attribution-engine
pip install -r requirements.txt
python attribution.py
```

The engine is currently a reference implementation and should not be interpreted as a production-scale decentralized attribution network.

---

## Demo

The repository includes an isolated end-to-end demonstration:

```
demo/
```

Run:

```bash
npm install
node demo/run-demo.js
```

The demonstration connects the currently implemented components and illustrates the intended attribution-to-royalty workflow.

The ZK verification step in the demo uses a mock verifier for testing purposes and does not provide real zero-knowledge security.

---

## Smart Contract Development

Install dependencies:

```bash
npm install
```

Compile:

```bash
npx hardhat compile
```

Run tests:

```bash
npx hardhat test
```

---

## Documentation

### MVP

The current MVP-specific documentation is located under:

```
docs/mvp/
```

### Future Architecture

Long-term protocol specifications are located under:

```
docs/future/
```

These documents describe the planned evolution toward verifiable inference, decentralized compute, and a future VeriMind application chain.

Additional architectural, benchmark, security, and roadmap documentation is available under:

```
docs/
```

---

## Roadmap

VeriMind is being developed incrementally.

The immediate objective is to validate the attribution and programmable royalty layer on existing blockchain infrastructure.

Future phases can progressively introduce:

1. Existing-chain MVP deployment
2. Real application integrations
3. Production-grade attribution infrastructure
4. Cryptographically verifiable AI inference
5. Decentralized compute coordination
6. VeriMind application-chain infrastructure
7. Long-term Layer-1 architecture

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the broader development roadmap.

---

## Contributing

Contributions are welcome.

The project is currently focused on validating the attribution and programmable royalty infrastructure before expanding into the broader protocol architecture.

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for contribution guidelines.

---

## License

Apache License 2.0 — see [`LICENSE`](LICENSE).

This project uses a permissive open-source license intended to support ecosystem adoption, experimentation, and external contributions.

---

## Links

- Technical Whitepaper: [`docs/VeriMind_Whitepaper_v2.1.pdf`](docs/VeriMind_Whitepaper_v2.1.pdf)
- Investor / Business Overview: Available on request
