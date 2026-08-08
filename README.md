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

VeriMind's target architecture combines three pillars into one modular Layer-1 (Cosmos SDK application-chain + EVM execution). **The Cosmos SDK application-chain and consensus layer are PLANNED and not yet implemented.** This repository currently implements/prototypes selected protocol components — smart contracts and the attribution reference engine — on EVM via Hardhat; it does not contain a running Layer-1 chain. See [`docs/specs/network-overview.md`](docs/specs/network-overview.md) for the current-vs-planned network topology.

| Pillar | Description | Status |
|---|---|---|
| **ZK Proof of Inference** | Target architecture: every model forward pass accompanied by a Halo2/Plonky3 zero-knowledge proof, verified on-chain. | **PLANNED** — not implemented. The current prototype uses a TEST-ONLY `MockZKVerifier` that performs no cryptographic verification (see [`docs/security/zk-security.md`](docs/security/zk-security.md)). |
| **Vector Attribution & Micro-Royalties** | Output embeddings are matched against indexed creator datasets via cosine similarity, routing royalty payments automatically. | Off-chain attribution scoring is implemented as a reference engine (`attribution-engine/`); on-chain royalty settlement is implemented in `RoyaltyManager.sol`. |
| **DePIN Compute Mesh** | Independent GPU/TPU operators stake collateral to join as Compute Nodes. | Staking/collateral logic implemented in `StakingManager.sol`; networked Compute Node software is PLANNED. |

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

- [x] Protocol architecture and technical specification (consensus, slashing, ZK circuit design, tokenomics)
- [x] Smart contract interfaces and core logic scaffolding (6 contracts), with Solidity test suites written in `test/` — **local compile/test execution (`npx hardhat compile` / `npx hardhat test`) is still pending in this repository; see Quickstart below**
- [x] Working reference implementation of the vector attribution & royalty-scoring algorithm
- [x] Isolated end-to-end demo implementation of the currently implemented flow (see `demo/`) — uses a test-only mock ZK verifier, not real cryptographic proof
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

> Solidity test suites exist in `test/`. Local compile/test execution has not yet been runtime-verified in this repository (network access was unavailable in the environment used to author it) — run the commands above to verify locally before relying on them.

### End-to-End Demo

```bash
npx hardhat run demo/run-demo.js --network hardhat
```

> Drives the existing contracts and attribution engine through the full flow (escrow → inference lifecycle → attribution → mock ZK verification → royalty settlement) using the TEST-ONLY `MockZKVerifier` — no real ZK proof is generated or verified. This command has not been runtime-verified in the authoring environment; see [`demo/README.md`](demo/README.md) for details.

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
- 
