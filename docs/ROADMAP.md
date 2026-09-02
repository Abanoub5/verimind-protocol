# Roadmap

A phased path from the current attribution and programmable royalty MVP toward the long-term VeriMind network architecture.

The roadmap intentionally prioritizes validation and deployment on existing EVM infrastructure before introducing zero-knowledge inference, decentralized compute, or a dedicated Layer-1.

---

## Phase 1 — MVP Foundation (Q3–Q4 2026)

**Goal:** Validate the core attribution and royalty model.

- [x] Vector-based attribution reference implementation
- [x] Attribution scoring engine
- [x] Programmable royalty settlement logic
- [x] Attribution-to-Solidity integration
- [x] End-to-end prototype demonstration
- [x] Contract test suite
- [ ] Refine attribution data model and interfaces
- [ ] Harden the MVP smart-contract architecture
- [ ] Define integration interfaces for AI applications and data providers
- [ ] Prepare deployment to an existing EVM-compatible network

---

## Phase 2 — Existing-Chain MVP (Q4 2026–Q1 2027)

**Goal:** Move from an isolated prototype toward a usable on-chain MVP.

- [ ] Deploy MVP contracts to an existing EVM-compatible test network
- [ ] Integrate attribution records with on-chain royalty settlement
- [ ] Build an initial application/integration flow
- [ ] Enable creator and dataset registration
- [ ] Implement royalty distribution workflows
- [ ] Conduct functional and integration testing
- [ ] Establish initial pilot integrations with AI/data ecosystem participants

---

## Phase 3 — Production Attribution Infrastructure (2027)

**Goal:** Validate the system with real users, applications, and data contributors.

- [ ] Production-grade attribution service
- [ ] Scalable attribution processing
- [ ] Application and model-provider integrations
- [ ] Creator/data-provider onboarding
- [ ] Royalty accounting and reporting
- [ ] Economic model validation
- [ ] Security hardening and external review
- [ ] Ecosystem partnerships and third-party integrations

---

## Phase 4 — Verifiable AI Inference (Future)

**Goal:** Add cryptographic verification to the attribution pipeline.

- [ ] ZK proof-of-inference research
- [ ] Halo2 / Plonky3 circuit prototype
- [ ] Proof generation and verification benchmarks
- [ ] On-chain verification architecture
- [ ] Integration of verifiable inference with attribution records
- [ ] Production feasibility assessment

This phase is intentionally deferred until the attribution and royalty infrastructure has been validated.

---

## Phase 5 — Decentralized Compute (Future)

**Goal:** Introduce decentralized infrastructure for AI inference workloads.

- [ ] Compute node specification
- [ ] Compute node prototype
- [ ] Node registration and staking model
- [ ] Compute workload orchestration
- [ ] Node incentives and reward mechanisms
- [ ] Decentralized compute testnet
- [ ] Integration with verifiable inference

---

## Phase 6 — VeriMind Network / Appchain (Long-Term)

**Goal:** Determine whether a dedicated network is justified by ecosystem scale and technical requirements.

- [ ] Evaluate requirements for a dedicated execution environment
- [ ] Cosmos SDK architecture prototype
- [ ] Validator and consensus design
- [ ] Network RPC and protocol interfaces
- [ ] Native network economics
- [ ] Dedicated testnet
- [ ] Independent security audits
- [ ] Mainnet readiness assessment

A dedicated VeriMind network is a long-term architectural direction, not a prerequisite for the current MVP.

---

## Long-Term Vision

The intended evolution is:

```
Attribution + Royalties
          │
          ▼
Existing EVM Deployment
          │
          ▼
Real Ecosystem Integrations
          │
          ▼
Verifiable AI Inference
          │
          ▼
Decentralized Compute
          │
          ▼
VeriMind Appchain / Network
```

Each stage is intended to be validated before expanding the protocol's infrastructure requirements.

---

## Known Risks

| Risk | Mitigation |
|---|---|
| Attribution accuracy at scale | Iterative benchmarking, real-world validation, and improved attribution models |
| Royalty settlement complexity | Modular smart-contract architecture and incremental deployment |
| Adoption by AI/data ecosystem participants | Pilot integrations and ecosystem partnerships before major infrastructure expansion |
| ZK proving overhead | Defer production ZK infrastructure until attribution use cases are validated; benchmark multiple proving approaches |
| Decentralized compute complexity | Introduce compute infrastructure only after the core attribution and royalty layer demonstrates demand |
| Single-founder execution risk | Prioritize a narrow MVP and use grants/strategic funding to expand the engineering team |
| Token classification / regulatory risk | Obtain appropriate legal guidance before introducing token-based network economics |
| Premature Layer-1 complexity | Use existing EVM infrastructure until a dedicated network is technically and economically justified |

---

## Guiding Principle

Validate the product before building the network.

VeriMind will first prove that attribution and programmable royalty settlement provide meaningful value to AI applications, creators, and data contributors.

Only after that foundation is validated will the project expand into verifiable inference, decentralized compute, and eventually a dedicated VeriMind network.
