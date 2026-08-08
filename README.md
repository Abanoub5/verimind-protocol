# VeriMind Protocol

**A Modular Layer-1 Architecture for Verifiable Zero-Knowledge AI Inference, Vector-Based Royalty Attribution, and DePIN Compute Orchestration**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-early--development-orange.svg)]()

> Technical Specification v2.0 · August 2026 · Founder: AbanoubRajaey

## Overview

VeriMind Protocol addresses three structural gaps in the generative AI economy:

1. **No Proof of Origin** — AI-generated content cannot be cryptographically verified or traced to a specific model run.
2. **No Attribution or Payment** — Data creators receive no automatic recognition or compensation when their work shapes a model's output.
3. **Compute Concentration** — A small number of hyperscale providers control the GPU/TPU compute AI systems depend on.

VeriMind combines three pillars into one modular Layer-1 (Cosmos SDK + EVM execution):

| Pillar | Description |
|---|---|
| **ZK Proof of Inference** | Every model forward pass is accompanied by a Halo2/Plonky3 zero-knowledge proof, verified on-chain. |
| **Vector Attribution & Micro-Royalties** | Output embeddings are matched against indexed creator datasets via cosine similarity, routing royalty payments automatically. |
| **DePIN Compute Mesh** | Independent GPU/TPU operators stake collateral to join as Compute Nodes. |

Full architecture, consensus model, and cryptographic specification: [`docs/VeriMind_Whitepaper_v2.0.pdf`](docs/VeriMind_Whitepaper_v2.0.pdf).

## Repository Structure

```
verimind-protocol/
├── contracts/              # Solidity smart contracts (protocol core)
│   ├── VMINDToken.sol
│   ├── InferenceManager.sol
│   ├── RoyaltyManager.sol
│   ├── StakingManager.sol
│   ├── EscrowVault.sol
│   └── Governance.sol
├── attribution-engine/     # Working reference implementation of the
│   │                         vector attribution & royalty-scoring engine
│   ├── attribution.py
│   ├── requirements.txt
│   └── README.md
├── demo/                    # Isolated end-to-end demo (existing contracts +
│   │                          attribution engine, no new protocol logic)
│   ├── run-demo.js
│   ├── attribution_bridge.py
│   └── README.md
├── docs/                    # Whitepaper and design docs (architecture, security,
│                              benchmarks, specs — see docs/ subfolders)
├── scripts/                  # Deployment / dev scripts
├── test/                     # Contract tests
└── hardhat.config.js
```

## Current Development Status

This project is in **early development**. What exists today:

- [x] Full protocol architecture and specification (consensus, slashing, ZK circuit design, tokenomics)
- [x] Smart contract interfaces and core logic scaffolding (6 contracts), with test coverage in `test/`
- [x] Working reference implementation of the vector attribution & royalty-scoring algorithm
- [x] Isolated end-to-end demo of the currently implemented flow (see `demo/`) — uses a test-only mock ZK verifier, not real cryptographic proof
- [ ] ZK circuit implementation (Halo2/Plonky3) — not started (see `docs/security/zk-security.md`)
- [ ] On-chain token vesting/cliff enforcement — not started (see `docs/specs/tokenomics-spec.md`); current `VMINDToken` mints all allocations as immediately liquid
- [ ] Cosmos SDK app-chain / consensus layer — not started (see `docs/specs/network-overview.md`)
- [ ] Testnet deployment
- [ ] Independent security audit

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the phased plan to mainnet.

## Quickstart

### Smart Contracts

```bash
npm install
npx hardhat compile
npx hardhat test
```

### Attribution Engine (reference implementation)

```bash
cd attribution-engine
pip install -r requirements.txt
python attribution.py
```

## Contributing

Contributions are welcome — see [`CONTRIBUTING.md`](CONTRIBUTING.md). This is an early-stage protocol; the most valuable contributions right now are in ZK circuit implementation (Halo2/Plonky3) and Cosmos SDK chain modules.

## License

Apache License 2.0 — see [`LICENSE`](LICENSE). This is a deliberate choice for a protocol intended to attract ecosystem grants and outside contributors: permissive enough for adoption, with an explicit patent grant.

## Links

- Technical Whitepaper: [`docs/VeriMind_Whitepaper_v2.0.pdf`](docs/VeriMind_Whitepaper_v2.0.pdf)
- Investor/Business Overview: available on request (confidential, not part of this open-source repo)
