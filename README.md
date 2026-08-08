VeriMind Protocol

A Modular Layer-1 Architecture for Verifiable Zero-Knowledge AI Inference, Vector-Based Royalty Attribution, and DePIN Compute Orchestration

""License: Apache 2.0" (https://img.shields.io/badge/License-Apache%202.0-blue.svg)" (LICENSE)
""Status" (https://img.shields.io/badge/status-early--development-orange.svg)"

«Technical Specification v2.0 · August 2026 · Founder: AbanoubRajaey»

Overview

VeriMind Protocol addresses three structural gaps in the generative AI economy:

1. No Proof of Origin — AI-generated content cannot be cryptographically verified or traced to a specific model run.
2. No Attribution or Payment — Data creators receive no automatic recognition or compensation when their work shapes a model's output.
3. Compute Concentration — A small number of hyperscale providers control the GPU/TPU compute AI systems depend on.

VeriMind is an early-stage modular Layer-1 architecture designed to combine three protocol pillars. The current repository implements and prototypes selected protocol components using EVM/Hardhat; the Cosmos SDK application-chain and consensus layer are planned components of the target architecture.

Pillar| Description
ZK Proof of Inference| Planned cryptographic verification of model inference using Halo2/Plonky3 proofs verified on-chain. The current prototype uses a test-only mock verifier; real ZK circuits are not yet implemented.
Vector Attribution & Micro-Royalties| A working reference implementation matches output embeddings against indexed creator datasets using cosine similarity and softmax-based scoring, producing royalty allocations for on-chain settlement.
DePIN Compute Mesh| The target architecture allows independent GPU/TPU operators to stake collateral and participate as Compute Nodes. The current repository prototypes the associated staking, escrow, inference, and slashing components; the production decentralized compute network is planned.

Full architecture, consensus model, and cryptographic specification: ""docs/VeriMind_Whitepaper_v2.0.pdf"" (docs/VeriMind_Whitepaper_v2.0.pdf).

Repository Structure

verimind-protocol/
├── contracts/               # Solidity smart contracts (protocol core)
│   ├── VMINDToken.sol
│   ├── InferenceManager.sol
│   ├── RoyaltyManager.sol
│   ├── StakingManager.sol
│   ├── EscrowVault.sol
│   └── Governance.sol
├── attribution-engine/      # Working reference implementation of the
│   │                          vector attribution & royalty-scoring engine
│   ├── attribution.py
│   ├── requirements.txt
│   └── README.md
├── demo/                    # Isolated end-to-end prototype demo using
│   │                          existing contracts + attribution engine
│   ├── run-demo.js
│   ├── attribution_bridge.py
│   └── README.md
├── docs/                    # Whitepaper and protocol design documentation
│                              (architecture, security, benchmarks, specs)
├── scripts/                 # Deployment / development scripts
├── test/                    # Solidity contract test suites
└── hardhat.config.js

Current Development Status

This project is in early development. The repository contains an open-source functional prototype of selected VeriMind protocol components.

Implemented / Prototyped

- [x] Protocol architecture and technical specification covering the target consensus, slashing, ZK, and tokenomics designs
- [x] Smart contract interfaces and core protocol logic across 6 contracts, with Solidity test suites in "test/" awaiting local runtime verification
- [x] Working reference implementation of the vector attribution and royalty-scoring algorithm
- [x] Automated Python tests for the attribution engine
- [x] Isolated end-to-end prototype demo of the currently implemented flow (see "demo/") using a test-only mock ZK verifier rather than real cryptographic proofs
- [x] On-chain royalty settlement and request-level settlement protection
- [x] Staking/slashing prototype with collateral handling and associated test coverage

Planned / Not Yet Implemented

- [ ] Production ZK circuit implementation (Halo2/Plonky3) — not started (see ""docs/security/zk-security.md"" (docs/security/zk-security.md))
- [ ] On-chain token vesting/cliff enforcement — not started (see ""docs/specs/tokenomics-spec.md"" (docs/specs/tokenomics-spec.md)); the current "VMINDToken" implementation mints allocations as immediately liquid
- [ ] Cosmos SDK application-chain / consensus layer — not started (see ""docs/specs/network-overview.md"" (docs/specs/network-overview.md))
- [ ] Decentralized production Compute Node network and network-level orchestration
- [ ] Production RPC/API layer
- [ ] Public testnet deployment
- [ ] Independent security audit

See ""docs/ROADMAP.md"" (docs/ROADMAP.md) for the phased plan toward a production network and eventual mainnet.

Quickstart

Smart Contracts

npm install
npx hardhat compile
npx hardhat test

End-to-End Prototype Demo

The repository includes an isolated demo that connects the currently implemented attribution flow with the existing protocol contracts.

npx hardhat run demo/run-demo.js --network hardhat

Runtime verification of the Hardhat compile, Solidity test suite, deployment flow, and end-to-end demo remains pending local environment validation.

Attribution Engine (Reference Implementation)

cd attribution-engine
pip install -r requirements.txt
python attribution.py

The attribution engine implements the reference vector-scoring flow, including cosine similarity, Top-K selection, softmax scoring, and basis-point normalization.

Contributing

Contributions are welcome — see ""CONTRIBUTING.md"" (CONTRIBUTING.md).

This is an early-stage protocol. Areas of interest include research and implementation work toward the planned ZK circuit layer (Halo2/Plonky3), Cosmos SDK chain modules, decentralized compute orchestration, and additional protocol testing and security research.

License

Apache License 2.0 — see ""LICENSE"" (LICENSE).

This is a deliberate choice for a protocol intended to attract ecosystem grants and outside contributors: permissive enough for adoption, with an explicit patent grant.

Links

- Technical Whitepaper: ""docs/VeriMind_Whitepaper_v2.0.pdf"" (docs/VeriMind_Whitepaper_v2.0.pdf)
- Investor/Business Overview: available on request (confidential, not part of this open-source repository)
