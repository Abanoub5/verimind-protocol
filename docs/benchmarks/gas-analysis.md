# Gas Analysis

**Status: Not yet measured.** This repository's sandbox environment has no outbound network access, so `npm install` (required to pull `hardhat`, `@openzeppelin/contracts`, and `hardhat-gas-reporter`) could not be run, and no contract in this repo has been compiled or had its gas usage empirically measured as part of producing this documentation. The figures below are **order-of-magnitude estimates** based on well-known EVM opcode costs for comparable operations (cold `SSTORE` ≈ 20,000 gas, ERC-20 `transfer` ≈ 45,000–65,000 gas including balance updates, etc.), not measurements. They should be replaced with real numbers the first time this repo is run with network access — see §3 for how.

## 1. Estimated Per-Function Cost Drivers

| Contract.Function | Storage writes (cold) | External calls | Rough estimate range | Basis for estimate |
|---|---|---|---|---|
| `InferenceManager.submitRequest` | 1 (new `Request` struct, ~5 slots) | 1 (`EscrowVault.escrow` → `transferFrom`) | ~150,000–220,000 gas | 5 cold `SSTORE`s (~100k) + ERC-20 `transferFrom` (~50-65k) + event |
| `InferenceManager.assignNode` | 2 (state, assignedNode) | 1 (`StakingManager.isEligible`, a `view` call — free) | ~45,000–65,000 gas | 2 warm-ish `SSTORE`s + event |
| `InferenceManager.submitProof` (success path) | 1 (state) | 1 (`IZKVerifier.verifyProof`, cost depends entirely on the real verifier's implementation — unknown until built) | Unknown — dominated by verifier cost | Mock verifier itself is near-zero cost; a real Halo2/Plonky3 on-chain verification is the actual driver and is explicitly out of scope for this estimate |
| `InferenceManager.submitProof` (failure path) | 1 (state) | 2 (`StakingManager.slash`, `EscrowVault.refund`) | ~90,000–130,000 gas | State write + slash accounting + token transfer |
| `StakingManager.stake` | 1 | 1 (`transferFrom`) | ~85,000–110,000 gas | Cold struct write + ERC-20 transfer |
| `RoyaltyManager.distributeRoyalties` | 0 (no persistent storage) | N (one `transfer` per creator) | ~50,000 + (N × ~30,000) gas | Dominated by the loop over `creators.length`; scales linearly, no batching optimization implemented |
| `Governance.vote` | 1 (`hasVoted` mapping) | 1 (`balanceOf`, a `view` call — free) | ~45,000–60,000 gas | Single cold `SSTORE` |

**These numbers must be treated as placeholders.** In particular, `RoyaltyManager.distributeRoyalties`'s linear scaling with creator count is a real design concern worth measuring precisely once tooling is available — a request attributing royalties across, say, 20 creators could plausibly exceed 600,000 gas, which is worth knowing before choosing `K` (top-K creators, whitepaper §5.1) in a production deployment.

## 2. Known Gas-Relevant Design Choices Already Made

- `RoyaltyManager` uses basis points (integers) instead of fixed-point decimals specifically to avoid expensive on-chain division/rounding logic — the expensive softmax normalization happens off-chain in `attribution.py`, and the contract only does integer multiplication and division by a constant (10,000).
- `InferenceManager`'s `Request` struct packs `state` (an `enum`, fits in `uint8`) alongside other fields; no explicit storage-slot packing optimization has been done beyond Solidity's default struct layout — this is a candidate for gas optimization once real measurements exist.

## 3. How to Produce Real Numbers

```bash
npm install --save-dev hardhat-gas-reporter
# add to hardhat.config.js: require("hardhat-gas-reporter")
REPORT_GAS=true npx hardhat test
```

This will produce a per-function gas table from actual EVM execution against the existing `test/VeriMind.test.js` suite. Until that has been run at least once, no gas figure in this repository should be treated as verified.
