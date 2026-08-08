# Attribution Engine — Reference Implementation

Working Python implementation of the vector attribution & micro-royalty scoring
algorithm from whitepaper Section 5.1: top-K cosine similarity over creator
embeddings, normalized via softmax with temperature `tau`.

## Run the example

```bash
python attribution.py
```

## Run tests

```bash
pip install -r requirements.txt
pytest test_attribution.py -v
```

## What this is (and isn't)

This is a **correctness reference** — it proves the math in Section 5.1 works
and produces integer basis-point outputs that plug directly into
`RoyaltyManager.distributeRoyalties()` on-chain.

It is **not** a production Attribution Node implementation. A production node
would:
- Run this scoring logic against a real approximate-nearest-neighbor index
  (e.g. HNSW, FAISS) over millions of creator embeddings, not a linear scan.
- Reach multi-node consensus on retrieval results before submission (Section 8:
  "Oracle & Vector Manipulation" mitigation).
- Be written in a performance-oriented language/runtime matching the rest of
  the DePIN node software, not necessarily Python.

Those are exactly the kind of scoped, fundable next steps a grant or seed round
would cover — see `../docs/ROADMAP.md`.
