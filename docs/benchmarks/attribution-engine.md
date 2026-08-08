# Attribution Engine — Benchmarks

**Status: Implemented (reference implementation only) — figures below are measured against `attribution-engine/attribution.py` as written, not a production-scale deployment.**

## 1. What Was Actually Measured

`attribution-engine/attribution.py` performs a linear scan: for a query embedding against `N` creator embeddings, it computes `N` cosine similarities, sorts them, and applies softmax to the top-`K`. The complexity is straightforward and stated here rather than benchmarked with elaborate tooling, since the honest characterization of a reference implementation is more useful than an over-produced benchmark of code that isn't the production path.

| Operation | Complexity | Notes |
|---|---|---|
| `cosine_similarity(x, d)` | O(d) where d = embedding dimension | Two dot products + two square roots |
| `top_k_attribution` scoring pass | O(N·d) | N = number of creators, linear scan |
| Sort for top-K | O(N log N) | Python's built-in Timsort |
| Softmax over top-K | O(K) | Negligible relative to the scan |

**Dominant cost at scale:** the O(N·d) linear scan. For the whitepaper's stated ambition (indexing "domain-specific vector embeddings," §2.1) with N in the millions, this reference implementation would not be viable as-is — see §3 below.

## 2. Correctness Verification (What This Repo Actually Proves)

The example run in `attribution.py`'s `__main__` block and the test suite in `test_attribution.py` verify:

- Basis-point outputs always sum to exactly 10,000 (required for `RoyaltyManager.distributeRoyalties` to accept them on-chain without reverting)
- Cosine similarity of identical vectors ≈ 1.0, of orthogonal vectors ≈ 0.0
- Ranking order is preserved correctly (highest similarity gets the highest score)
- `top_k_attribution` respects the requested `k` even when more creators are available

These are correctness properties, not performance benchmarks — this repo does not claim any throughput or latency numbers because none have been measured against realistic data volumes.

## 3. Gap to Production Scale (Planned)

| Concern | Current reference implementation | Production requirement (not built) |
|---|---|---|
| Search algorithm | Linear scan, O(N) per query | Approximate nearest neighbor index (HNSW, IVF, or similar — e.g. via FAISS) for sub-linear retrieval |
| Dataset size tested | Illustrative examples (3–10 creators) in `test_attribution.py` | Whitepaper implies datasets at real-world creator-catalog scale (unspecified, but implied to be far larger) |
| Consensus on retrieval result | None — single-process computation | Multi-node agreement per whitepaper §8, to prevent the manipulation scenario in `../security/attack-scenarios.md` |
| Language/runtime | Python reference | Whitepaper does not mandate a specific production runtime; a performance-oriented choice (e.g. Rust) would be typical for a DePIN node |

## 4. How to Reproduce the Correctness Checks

```bash
cd attribution-engine
python attribution.py          # runs the worked example, prints scores + bps sum
pip install -r requirements.txt
pytest test_attribution.py -v  # runs the full assertion suite
```

No GPU, network access, or external services are required — this is intentional so the correctness of the core math can be verified by anyone reviewing the repository without additional infrastructure.
