# Contributing to VeriMind Protocol

Thanks for your interest in contributing to VeriMind.

VeriMind is currently focused on building an AI attribution and programmable royalty infrastructure layer on existing EVM-compatible networks.

## Priority areas

1. **Attribution engine** — improvements to vector-based attribution, scoring, validation, and benchmarking.
2. **Smart contracts** — testing, security improvements, gas optimization, and integration work for the MVP contracts.
3. **Royalty infrastructure** — improving creator attribution, royalty settlement, accounting, and edge-case handling.
4. **Application integration** — integrating the attribution and royalty infrastructure with real AI applications and workflows.
5. **Future research** — ZK inference, decentralized compute, and appchain/L1 development are welcome as experimental/future contributions.

## How to contribute

1. Fork the repository and create a feature branch.
2. For contract changes, run:

```bash
npx hardhat test
```

3. For attribution-engine changes, include appropriate test coverage.
4. Keep MVP changes focused on the existing-chain attribution and royalty architecture.
5. Open a PR describing the change and its relationship to the relevant documentation or roadmap section.

## Reporting issues

Use GitHub Issues for general bugs and feature requests.

For security-sensitive findings, please do not open a public issue. Contact the maintainer privately through the repository owner's GitHub profile.

## Code of Conduct

Be respectful and constructive.

VeriMind is an early-stage open-source project. Some components are experimental or incomplete, while ZK inference, decentralized compute, validators, and the VeriMind appchain/L1 remain future development areas.
