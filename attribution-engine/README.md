# Attribution Engine — Reference Implementation

The VeriMind Attribution Engine is the Python reference implementation of the vector-based attribution and micro-royalty scoring algorithm described in Whitepaper Section 5.1.

It computes creator attribution using:

1. Cosine similarity between an inference/query embedding and creator embeddings.
2. Top-K creator selection.
3. Softmax normalization with temperature `tau`.
4. Conversion of normalized scores into integer basis points (`bps`) that sum exactly to 10,000 (100%).

The resulting attribution vector is designed to integrate with `RoyaltyManager.distributeRoyalties()` for programmable on-chain royalty settlement.

## Current Role in the MVP

This implementation is part of the current VeriMind prototype and provides the reference attribution logic used by the end-to-end demo.

The current MVP validates the attribution and royalty-settlement flow on an existing EVM-compatible environment.

The implementation is intentionally kept simple and deterministic so that the attribution mathematics can be tested independently before introducing production-scale infrastructure.

## Core Function

The main entry point is:

```python
top_k_attribution(query, creators, k=3, tau=0.1)
```

### Inputs

- `query` — Query/inference embedding.
- `creators` — List of creator records containing an address and embedding.
- `k` — Maximum number of creators returned.
- `tau` — Softmax temperature. Must be greater than zero.

### Output

The function returns attribution records containing:

- `address`
- `score`
- `bps`

Where:

- `score` is the normalized floating-point attribution score.
- `bps` is the integer basis-point representation used by the Solidity royalty layer.
- All returned `bps` values sum exactly to `10,000`.

**Example:**

```
Creator A → 8932 bps
Creator C → 1064 bps
Creator B →    4 bps

Total     → 10000 bps
```

## Example

Run the reference implementation directly:

```bash
python attribution.py
```

## Run Tests

Install the Python dependencies:

```bash
pip install -r requirements.txt
```

Run the complete test suite:

```bash
pytest -q
```

The tests cover:

- Cosine similarity for identical vectors.
- Orthogonal vectors.
- Zero-vector safety.
- Exact basis-point normalization to 10,000.
- Attribution ordering.
- Top-K behavior.
- Empty creator sets.
- Invalid softmax temperature.
- Embedding dimension mismatch.
- Duplicate creator addresses.

## Integration with the Demo

The end-to-end demo in `../demo/` calls this implementation through `attribution_bridge.py`.

The bridge does not reimplement the attribution algorithm. It imports and executes `top_k_attribution()` from this module and passes the resulting attribution vector into the Hardhat prototype flow.

This keeps the attribution mathematics in one place and makes the relationship between the reference implementation and the smart-contract layer explicit.

## What This Is — and Isn't

**This is:**

- A deterministic reference implementation of VeriMind's attribution mathematics.
- A correctness-oriented implementation for the current prototype.
- A source of attribution scores that can be converted into on-chain royalty basis points.
- Independently testable with `pytest`.

**This is not:**

- A production Attribution Node.
- A decentralized oracle or consensus layer.
- A production vector database.
- A large-scale approximate-nearest-neighbor retrieval system.
- A production DePIN node implementation.

A production Attribution Node would require additional infrastructure, including:

- An approximate-nearest-neighbor index such as HNSW or FAISS for large creator-embedding datasets.
- Distributed retrieval and result verification.
- Multi-node consensus or cryptographic mechanisms to mitigate vector/oracle manipulation.
- Production-grade node software and operational infrastructure.

These components are intentionally outside the scope of this reference implementation and are part of VeriMind's future infrastructure roadmap.

See [`../docs/ROADMAP.md`](../docs/ROADMAP.md) for the planned progression from the current MVP toward production attribution infrastructure and the longer-term ZK and decentralized-compute architecture.
