"""
VeriMind Attribution Engine — reference implementation.

Implements the vector attribution math from whitepaper Section 5.1:

    Sim(x, d_i) = (x . d_i) / (||x|| * ||d_i||)          [cosine similarity]

    s_i = exp(Sim(x, d_i) / tau) / sum_j exp(Sim(x, d_j) / tau)   [softmax over top-K]

This module computes the top-K attributed data creators and their normalized
royalty split (in basis points, summing to 10_000) for a given inference output
embedding, ready to be submitted on-chain to RoyaltyManager.distributeRoyalties().

This is a REFERENCE implementation for correctness and grant-review purposes —
it is not optimized for production-scale vector search (that would use an ANN
index such as HNSW or FAISS over the full creator dataset, per Section 5).
"""

from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass
class Creator:
    address: str
    embedding: list[float]


def _dot(a: list[float], b: list[float]) -> float:
    if len(a) != len(b):
        raise ValueError("embedding dimensions must match")
    return sum(x * y for x, y in zip(a, b))


def _norm(a: list[float]) -> float:
    return math.sqrt(sum(x * x for x in a))


def cosine_similarity(x: list[float], d: list[float]) -> float:
    """Sim(x, d_i) = (x . d_i) / (||x|| ||d_i||) — whitepaper Section 5.1."""
    norm_x, norm_d = _norm(x), _norm(d)
    if norm_x == 0 or norm_d == 0:
        return 0.0
    return _dot(x, d) / (norm_x * norm_d)


def top_k_attribution(
    query_embedding: list[float],
    creators: list[Creator],
    k: int = 5,
    tau: float = 0.1,
) -> list[tuple[str, float, int]]:
    """
    Compute the top-K attributed creators for a query embedding.

    Returns a list of (creator_address, softmax_score, score_bps) tuples,
    sorted by descending score. score_bps values sum to 10_000 and are the
    exact integers to pass on-chain to RoyaltyManager.distributeRoyalties().
    """
    if k <= 0:
        raise ValueError("k must be positive")

    if tau <= 0:
        raise ValueError("tau must be positive")

    if not creators:
        return []

    creator_addresses = [c.address for c in creators]
    if len(creator_addresses) != len(set(creator_addresses)):
        raise ValueError("duplicate creator address")

    scored = [
        (c.address, cosine_similarity(query_embedding, c.embedding))
        for c in creators
    ]

    scored.sort(key=lambda t: t[1], reverse=True)
    top = scored[:k]

    # Softmax with temperature tau, per Section 5.1.
    exp_scores = [math.exp(sim / tau) for _, sim in top]
    total = sum(exp_scores)
    softmax_scores = [e / total for e in exp_scores]

    # Convert to basis points, correcting rounding drift on the largest score
    # so the on-chain sum check (== 10_000) always passes exactly.
    bps = [round(s * 10_000) for s in softmax_scores]
    drift = 10_000 - sum(bps)

    if bps:
        bps[0] += drift

    return [
        (addr, score, b)
        for (addr, _), score, b in zip(top, softmax_scores, bps)
    ]


if __name__ == "__main__":
    # Minimal runnable example — mirrors what an Attribution Node computes
    # after receiving activation embeddings from a Compute Node (Section 2.2).
    query = [0.9, 0.1, 0.3]

    dataset = [
        Creator(
            address="0xCreatorA...",
            embedding=[0.88, 0.12, 0.31],
        ),
        Creator(
            address="0xCreatorB...",
            embedding=[0.10, 0.95, 0.05],
        ),
        Creator(
            address="0xCreatorC...",
            embedding=[0.50, 0.50, 0.50],
        ),
    ]

    result = top_k_attribution(
        query,
        dataset,
        k=3,
        tau=0.1,
    )

    print("Top-K attribution (address, softmax_score, basis_points):")

    for addr, score, bps in result:
        print(f"  {addr}: score={score:.4f}  bps={bps}")

    print(
        f"  sum of bps = "
        f"{sum(b for _, _, b in result)} (must equal 10000)"
    )
