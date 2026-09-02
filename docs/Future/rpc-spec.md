# RPC / API Specification

**Status: Planned.** No REST/RPC server, SDK, or API gateway exists in this repository. This document reproduces and extends the whitepaper's §10 specification as a target for future implementation, and clarifies exactly how it would relate to the contracts that already exist.

## 1. Relationship to Existing Contracts

Every endpoint below is a proposed off-chain convenience layer in front of `InferenceManager` and related contracts. None of them are implemented — a client today would need to call `InferenceManager.submitRequest()` directly via a web3 library. This spec documents what a future server-side API would abstract over that direct contract interaction.

## 2. Endpoint: Submit Inference Request

Matches whitepaper §10 exactly.

**Request**
```
POST /v1/inference/submit
Content-Type: application/json

{
  "model_id": "verimind-llm-7b-v1",
  "prompt_hash": "0x8f3a...",
  "max_fee": "5000000",
  "signature": "0x1b2c..."
}
```

**Response**
```
{
  "request_id": "req_998241",
  "status": "PROCESSING",
  "assigned_node": "0x44a1..."
}
```

**Mapping to on-chain reality:** `prompt_hash` and `max_fee` map directly to `InferenceManager.submitRequest(bytes32 requestId, uint256 maxFee, bytes32 promptHash)`'s parameters. `model_id` and `signature` have **no corresponding field** in the current `InferenceManager.Request` struct — the contract stores only `client, assignedNode, maxFee, promptHash, state, submittedAt`. A real implementation of this endpoint would need to either extend the struct or handle `model_id`/`signature` entirely off-chain (e.g., as part of an authenticated request envelope before the transaction is submitted). This is an open design gap, not a documented existing behavior.

**Status field mismatch:** the response example's `"status": "PROCESSING"` implies synchronous node assignment, but in the actual contract, `submitRequest()` alone only reaches `REQUEST_SUBMITTED` — a separate `assignNode()` call (from a Compute Node, not the API) is required to reach `PROCESSING`. A real API implementation would need to either poll for this transition or make it clear to clients that `PROCESSING` is not guaranteed immediately after submission.

## 3. Proposed Additional Endpoints (Not in Whitepaper, Not Implemented — Specification Only)

These are reasonable extensions given the contract surface that exists, included here to give future API work a starting point — they are speculative, not committed:

| Endpoint | Purpose | Backing contract call |
|---|---|---|
| `GET /v1/inference/{request_id}` | Poll request status | `InferenceManager.requests(requestId)` (read-only) |
| `GET /v1/nodes/{address}/eligibility` | Check if a node can accept work | `StakingManager.isEligible(address)` (read-only) |
| `POST /v1/royalties/distribute` | Trigger royalty settlement (privileged) | `RoyaltyManager.distributeRoyalties(...)` |
| `GET /v1/royalties/{request_id}` | Query royalty distribution history | Would require indexing `RoyaltyDistributed` events — no indexer exists |

## 4. Authentication & Rate Limiting

Not specified in the whitepaper and not implemented. The `"signature"` field in the whitepaper's example request implies some form of request signing, but no signature scheme, key management, or verification logic is defined anywhere in the whitepaper or this repository.

## 5. Explicit Non-Claims

No server implementing any endpoint in this document exists in this repository. All contract interaction demonstrated in this repo (`test/VeriMind.test.js`, `scripts/deploy.js`) happens via direct Hardhat/ethers.js calls, not through any RPC/API layer.
