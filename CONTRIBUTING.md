# Contributing to VeriMind Protocol

Thanks for your interest — this is an early-stage protocol and outside contributions materially move the roadmap forward.

## Priority areas (help most needed)

1. **ZK circuit implementation** — translating the model forward-pass arithmetization (Section 4 of the whitepaper) into working Halo2 / Plonky3 circuits.
2. **Cosmos SDK chain modules** — CometBFT consensus integration, custom modules for `InferenceManager` state transitions.
3. **Smart contract review & tests** — the contracts in `contracts/` are early scaffolding; audits, gas optimization, and test coverage are welcome.
4. **Attribution engine benchmarking** — accuracy/performance testing of the cosine-similarity attribution model in `attribution-engine/` against real embedding datasets.

## How to contribute

1. Fork the repo and create a feature branch.
2. For contract changes: `npx hardhat test` must pass before opening a PR.
3. For the attribution engine: include a test case demonstrating the change.
4. Open a PR describing the change and which whitepaper section it implements.

## Reporting issues

Use GitHub Issues. For security-relevant findings, please do not open a public issue — contact the maintainer directly (see repository owner profile).

## Code of Conduct

Be respectful, be constructive. This is a technical protocol under active early development — expect scaffolding, TODOs, and incomplete pieces.
