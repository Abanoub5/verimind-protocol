# VeriMind Prototype — End-to-End Demo

**Status: PROTOTYPE.** This demo wires together the EXISTING, unmodified contracts in `contracts/` and the EXISTING, unmodified attribution math in `attribution-engine/attribution.py`. It adds no new protocol logic — it only sequences existing function calls and prints what happens at each step, so the full request lifecycle can be observed end-to-end in one run instead of read about across separate documents.

## What this demo IS

A runnable script (`run-demo.js`) that, against a local Hardhat in-memory EVM:

1. Deploys `VMINDToken`, `StakingManager`, `EscrowVault`, `MockZKVerifier`, `InferenceManager`, `RoyaltyManager` — all unmodified from `contracts/`
2. Walks one inference request through the full lifecycle: submit → escrow → stake → assign → prove → verify (mock) → attribute → distribute royalties → settle
3. Calls the real `attribution-engine/attribution.py` (via `attribution_bridge.py`, a thin subprocess wrapper that imports it unchanged) to compute actual cosine-similarity + softmax royalty scores from a small hardcoded embedding dataset
4. Prints balances, contract state, and event-relevant output at each step

## What this demo is NOT

- **Not a real ZK proof.** `MockZKVerifier` accepts any non-empty `bytes` as a valid proof. No model inference, no circuit, no cryptographic verification happens anywhere in this demo. See `../docs/security/zk-security.md`.
- **Not a real chain.** Everything runs on Hardhat's ephemeral in-memory EVM. No Cosmos SDK app-chain, no testnet, no mainnet. See `../docs/specs/network-overview.md`.
- **Not a real vector database.** The three "creators" and their embeddings in `run-demo.js` are a small hardcoded illustrative dataset, not a queryable index over real content. See `../docs/specs/attribution-node-spec.md`.
- **Not an automated Attribution Node.** The demo grants `RoyaltyManager.SETTLER_ROLE` directly to the deployer account and calls `distributeRoyalties()` manually. There is no networked, staked, consensus-checked node submitting this automatically. See `../docs/architecture/protocol-flow.md` §3.
- **Not vesting-aware.** Token transfers in this demo use plain `VMINDToken` balances with no cliff/lock, consistent with the current contract's actual (non-vesting) behavior — see `../docs/specs/tokenomics-spec.md`.

## Running the demo

Requires Node.js 18+, a working `python3` on `PATH` (no extra pip packages needed — `attribution_bridge.py` only imports the existing `attribution-engine/attribution.py`, which uses only the Python standard library), and network access once, to install dependencies:

```bash
# From the repository root
npm install
npx hardhat run demo/run-demo.js --network hardhat
```

## Files in this folder

| File | Purpose |
|---|---|
| `run-demo.js` | The Hardhat script that deploys contracts and drives the end-to-end flow |
| `attribution_bridge.py` | Thin subprocess bridge: reads JSON from stdin, calls the existing `attribution-engine/attribution.py`'s `top_k_attribution()` unchanged, writes JSON to stdout |

Neither file modifies, reimplements, or duplicates any logic from `contracts/`, `attribution-engine/`, `test/`, or `scripts/`. This folder is intentionally isolated so it can be deleted without affecting anything else in the repository.

## Verifying the attribution bridge works without Hardhat

Since `attribution_bridge.py` has no dependency on Node.js, Hardhat, or network access, it can be sanity-checked on its own:

```bash
cd demo
echo '{"query":[0.9,0.1,0.3],"creators":[{"address":"0xCreatorA","embedding":[0.88,0.12,0.31]},{"address":"0xCreatorB","embedding":[0.10,0.95,0.05]},{"address":"0xCreatorC","embedding":[0.50,0.50,0.50]}],"k":3,"tau":0.1}' | python3 attribution_bridge.py
```

Expected output (basis points always sum to 10000):
```json
[{"address": "0xCreatorA", "score": 0.893..., "bps": 8932}, {"address": "0xCreatorC", "score": 0.106..., "bps": 1064}, {"address": "0xCreatorB", "score": 0.0003..., "bps": 4}]
```

This part of the demo **was executed and verified** while writing this documentation, since it requires no network access. The full `run-demo.js` Hardhat script requires `npm install` (network access) that was not available in the environment this repository was authored in — see the top-level test/compilation report for details.
