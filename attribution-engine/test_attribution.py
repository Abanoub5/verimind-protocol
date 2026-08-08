import math

from attribution import Creator, cosine_similarity, top_k_attribution


def test_cosine_similarity_identical_vectors():
    v = [1.0, 2.0, 3.0]
    assert math.isclose(cosine_similarity(v, v), 1.0, rel_tol=1e-9)


def test_cosine_similarity_orthogonal_vectors():
    assert math.isclose(cosine_similarity([1.0, 0.0], [0.0, 1.0]), 0.0, abs_tol=1e-9)


def test_cosine_similarity_zero_vector_is_safe():
    assert cosine_similarity([0.0, 0.0], [1.0, 1.0]) == 0.0


def test_top_k_attribution_scores_sum_to_10000_bps():
    creators = [
        Creator("0xA", [0.9, 0.1, 0.0]),
        Creator("0xB", [0.1, 0.9, 0.0]),
        Creator("0xC", [0.0, 0.0, 1.0]),
        Creator("0xD", [0.5, 0.5, 0.0]),
    ]
    result = top_k_attribution([1.0, 0.0, 0.0], creators, k=3, tau=0.2)
    total_bps = sum(bps for _, _, bps in result)
    assert total_bps == 10_000
    assert len(result) == 3


def test_top_k_attribution_orders_by_similarity_descending():
    creators = [
        Creator("0xLow", [0.0, 1.0]),
        Creator("0xHigh", [1.0, 0.0]),
    ]
    result = top_k_attribution([1.0, 0.0], creators, k=2, tau=0.1)
    assert result[0][0] == "0xHigh"
    assert result[0][1] > result[1][1]


def test_top_k_attribution_respects_k():
    creators = [Creator(f"0x{i}", [float(i), 1.0]) for i in range(10)]
    result = top_k_attribution([5.0, 1.0], creators, k=3, tau=0.1)
    assert len(result) == 3


def test_top_k_attribution_empty_creators_returns_empty():
    assert top_k_attribution([1.0, 0.0], [], k=3) == []
