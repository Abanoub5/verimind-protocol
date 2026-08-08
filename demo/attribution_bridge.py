#!/usr/bin/env python3
"""
demo/attribution_bridge.py

A thin, isolated bridge that imports the EXISTING, unmodified
attribution-engine/attribution.py and exposes it over stdin/stdout JSON so the
Node.js/Hardhat demo script (demo/run-demo.js) can call it as a subprocess.

This file adds NO new attribution logic. It only:
  1. Imports Creator / top_k_attribution from attribution-engine/attribution.py
  2. Reads a JSON payload from stdin: {"query": [...], "creators": [{"address": ..., "embedding": [...]}], "k": int, "tau": float}
  3. Calls the existing top_k_attribution() unchanged
  4. Prints the result as JSON to stdout: [{"address": ..., "score": ..., "bps": ...}, ...]

Usage (called automatically by demo/run-demo.js, but can be run standalone):
    echo '{"query": [0.9,0.1], "creators": [{"address":"0xAAA","embedding":[0.9,0.1]}], "k": 1, "tau": 0.1}' \
        | python3 demo/attribution_bridge.py
"""

import json
import os
import sys

# Import the existing, unmodified reference implementation.
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_ATTRIBUTION_ENGINE_DIR = os.path.join(_THIS_DIR, "..", "attribution-engine")
sys.path.insert(0, _ATTRIBUTION_ENGINE_DIR)

from attribution import Creator, top_k_attribution  # noqa: E402  (existing, unmodified module)


def main() -> None:
    raw = sys.stdin.read()
    payload = json.loads(raw)

    query = payload["query"]
    k = payload.get("k", 3)
    tau = payload.get("tau", 0.1)
    creators = [Creator(address=c["address"], embedding=c["embedding"]) for c in payload["creators"]]

    result = top_k_attribution(query, creators, k=k, tau=tau)

    output = [{"address": addr, "score": score, "bps": bps} for addr, score, bps in result]
    print(json.dumps(output))


if __name__ == "__main__":
    main()
