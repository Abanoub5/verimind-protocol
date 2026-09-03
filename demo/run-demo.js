/**

* demo/run-demo.js
* 
* ISOLATED end-to-end demonstration of the currently implemented VeriMind
* prototype. This script does NOT add or reimplement protocol logic — it
* only calls the existing contracts in contracts/ and the existing
* attribution engine in attribution-engine/attribution.py, via
* demo/attribution_bridge.py, in sequence.
* 
* Flow demonstrated:
* 
* 1. Client submits an inference request      -> InferenceManager.submitRequest()
* 2. Client fee is escrowed                    -> EscrowVault (via InferenceManager)
* 3. Compute Node stakes collateral             -> StakingManager.stake()
* 4. Compute Node is assigned the request       -> InferenceManager.assignNode()
* 5. Compute Node submits a proof                -> InferenceManager.submitProof()
*  -> verified by MockZKVerifier (TEST-ONLY, NOT a real ZK verifier)
* 6. Attribution Engine computes royalty scores  -> attribution-engine/attribution.py
*  (via demo/attribution_bridge.py)
* 7. Royalty pool is funded and distributed      -> RoyaltyManager.distributeRoyalties()
* 8. Compute Node payment is settled             -> InferenceManager.settle()
* 
* Run with:
* npx hardhat run demo/run-demo.js --network hardhat
* 
* Requires: npm install (network access) to fetch hardhat +
* @openzeppelin/contracts, and a working Python 3 interpreter.
  */

const { ethers } = require("hardhat");
const { spawnSync } = require("child_process");
const path = require("path");

const MIN_STAKE = ethers.parseUnits("1000", 18);
const UNSTAKE_COOLDOWN = 7 * 24 * 60 * 60;
const PROCESSING_TIMEOUT = 60 * 60;

function line(title) {
console.log("\n" + "=".repeat(70));
console.log(title);
console.log("=".repeat(70));
}

/**

* Calls the existing attribution-engine/attribution.py via the
* thin bridge script.
  */
  function computeAttributionScores(query, creators, k, tau) {
  const bridgePath = path.join(__dirname, "attribution_bridge.py");
  const payload = JSON.stringify({ query, creators, k, tau });

const result = spawnSync("python3", [bridgePath], {
input: payload,
encoding: "utf-8",
});

if (result.status !== 0) {
throw new Error(
"attribution_bridge.py failed:\n" +
result.stderr +
"\n\nThis demo requires a working "python3" on PATH. " +
"The attribution math lives in attribution-engine/attribution.py."
);
}

return JSON.parse(result.stdout);
}

async function main() {
const [
deployer,
communityPool,
ecosystemPool,
seedVesting,
teamVesting,
treasury,
client,
computeNode,
creatorA,
creatorB,
creatorC,
] = await ethers.getSigners();

line("STEP 0 — Deploying the current contract set");

const VMINDToken = await ethers.getContractFactory("VMINDToken");
const vmind = await VMINDToken.deploy(
communityPool.address,
ecosystemPool.address,
seedVesting.address,
teamVesting.address,
treasury.address
);
await vmind.waitForDeployment();
console.log("VMINDToken:      ", await vmind.getAddress());

const StakingManager = await ethers.getContractFactory("StakingManager");
const staking = await StakingManager.deploy(
await vmind.getAddress(),
MIN_STAKE,
UNSTAKE_COOLDOWN
);
await staking.waitForDeployment();
console.log("StakingManager:  ", await staking.getAddress());

const EscrowVault = await ethers.getContractFactory("EscrowVault");
const escrow = await EscrowVault.deploy(await vmind.getAddress());
await escrow.waitForDeployment();
console.log("EscrowVault:     ", await escrow.getAddress());

const MockZKVerifier = await ethers.getContractFactory("MockZKVerifier");
const mockVerifier = await MockZKVerifier.deploy();
await mockVerifier.waitForDeployment();
console.log(
"MockZKVerifier:  ",
await mockVerifier.getAddress(),
"  <-- TEST-ONLY. Performs NO cryptographic verification."
);

const InferenceManager = await ethers.getContractFactory("InferenceManager");
const inference = await InferenceManager.deploy(
await escrow.getAddress(),
await staking.getAddress(),
await mockVerifier.getAddress(),
PROCESSING_TIMEOUT
);
await inference.waitForDeployment();
console.log("InferenceManager:", await inference.getAddress());

const RoyaltyManager = await ethers.getContractFactory("RoyaltyManager");
const royalty = await RoyaltyManager.deploy(await vmind.getAddress());
await royalty.waitForDeployment();
console.log("RoyaltyManager:  ", await royalty.getAddress());

await escrow.grantRole(
await escrow.CONTROLLER_ROLE(),
await inference.getAddress()
);

await staking.grantRole(
await staking.SLASHER_ROLE(),
await inference.getAddress()
);

await royalty.grantRole(
await royalty.SETTLER_ROLE(),
deployer.address
);

console.log(
"Roles wired: InferenceManager can control EscrowVault + slash via StakingManager;"
);
console.log(
"             deployer holds RoyaltyManager.SETTLER_ROLE for this demo run."
);

// Fund demo participants from the treasury allocation.
await vmind
.connect(treasury)
.transfer(client.address, ethers.parseUnits("10000", 18));

await vmind
.connect(treasury)
.transfer(computeNode.address, ethers.parseUnits("10000", 18));

line("STEP 1 — Client submits an inference request (escrows max fee)");

const requestId = ethers.id("demo-request-001");
const maxFee = ethers.parseUnits("50", 18);
const promptHash = ethers.id(
"What does this dataset imply about creator X's contribution?"
);

await vmind.connect(client).approve(await escrow.getAddress(), maxFee);

await inference
.connect(client)
.submitRequest(requestId, maxFee, promptHash);

let state = (await inference.requests(requestId)).state;

console.log(
"Request ${requestId.slice(0, 10)}... submitted. maxFee=${ethers.formatUnits( maxFee, 18 )} VMIND"
);

console.log(
"InferenceManager state: ${state.toString()} (1 = REQUEST_SUBMITTED)"
);

console.log(
"EscrowVault now holds:  ${ethers.formatUnits( await escrow.escrowed(requestId), 18 )} VMIND for this request"
);

line("STEP 2 — Compute Node stakes collateral and claims the request");

await vmind
.connect(computeNode)
.approve(await staking.getAddress(), MIN_STAKE);

await staking.connect(computeNode).stake(MIN_STAKE);

console.log(
"Compute Node staked ${ethers.formatUnits( MIN_STAKE, 18 )} VMIND. Eligible: ${await staking.isEligible(computeNode.address)}"
);

await inference.connect(computeNode).assignNode(requestId);

state = (await inference.requests(requestId)).state;

console.log(
"Node assigned. InferenceManager state: ${state.toString()} (2 = PROCESSING)"
);

line(
"STEP 3 — Compute Node submits a proof (verified by MockZKVerifier — TEST-ONLY)"
);

console.log("NOTE: No real model inference or ZK proof generation happens here.");
console.log(
"      MockZKVerifier accepts any non-empty proof bytes. This step"
);
console.log(
"      demonstrates the CONTRACT FLOW ONLY, not cryptographic proof validity."
);
console.log(
"      See docs/security/zk-security.md for the real-verifier gap."
);

const fakeProofBytes = "0xdeadbeef";

const publicInputs = ethers.AbiCoder.defaultAbiCoder().encode(
["bytes32"],
[promptHash]
);

await inference
.connect(computeNode)
.submitProof(requestId, fakeProofBytes, publicInputs);

state = (await inference.requests(requestId)).state;

console.log(
"Proof "verified" (mock). InferenceManager state: ${state.toString()} (4 = VERIFIED)"
);

line(
"STEP 4 — Attribution Engine computes royalty scores (existing attribution.py)"
);

const queryEmbedding = [0.9, 0.1, 0.3];

const creatorDataset = [
{
address: creatorA.address,
embedding: [0.88, 0.12, 0.31],
},
{
address: creatorB.address,
embedding: [0.10, 0.95, 0.05],
},
{
address: creatorC.address,
embedding: [0.50, 0.50, 0.50],
},
];

console.log(
"Calling attribution-engine/attribution.py via demo/attribution_bridge.py ..."
);

const scores = computeAttributionScores(
queryEmbedding,
creatorDataset,
3,
0.1
);

console.log(
"Attribution result (top-K cosine similarity + softmax, whitepaper §5.1):"
);

let bpsSum = 0;

for (const s of scores) {
console.log(
"  ${s.address}  score=${s.score.toFixed(4)}  bps=${s.bps}"
);
bpsSum += s.bps;
}

console.log(
"  sum of bps = ${bpsSum} (must equal 10000 for RoyaltyManager to accept it)"
);

line("STEP 5 — Royalty pool funded and distributed on-chain");

const royaltyPool = ethers.parseUnits("20", 18);

await vmind
.connect(treasury)
.transfer(await royalty.getAddress(), royaltyPool);

console.log(
"Funded RoyaltyManager with ${ethers.formatUnits( royaltyPool, 18 )} VMIND for this request's royalty pool."
);

const creatorAddresses = scores.map((s) => s.address);
const scoreBpsValues = scores.map((s) => s.bps);

const balancesBefore = {};

for (const addr of creatorAddresses) {
balancesBefore[addr] = await vmind.balanceOf(addr);
}

await royalty.distributeRoyalties(
requestId,
royaltyPool,
creatorAddresses,
scoreBpsValues
);

console.log("RoyaltyManager.distributeRoyalties() executed. Resulting balances:");

for (const addr of creatorAddresses) {
const after = await vmind.balanceOf(addr);

console.log(
  `  ${addr}: +${ethers.formatUnits(
    after - balancesBefore[addr],
    18
  )} VMIND`
);

}

line("STEP 6 — Compute Node payment settled");

// InferenceManager.settle() requires the full maxFee.
const nodePayment = maxFee;

const nodeBalanceBefore = await vmind.balanceOf(computeNode.address);

await inference.settle(requestId, nodePayment);

const nodeBalanceAfter = await vmind.balanceOf(computeNode.address);

state = (await inference.requests(requestId)).state;

console.log(
"InferenceManager.settle() executed. Final state: ${state.toString()} (5 = SETTLED)"
);

console.log(
"Compute Node received: ${ethers.formatUnits( nodeBalanceAfter - nodeBalanceBefore, 18 )} VMIND"
);

console.log(
"Remaining in escrow for this request: ${ethers.formatUnits( await escrow.escrowed(requestId), 18 )} VMIND"
);

line("DEMO COMPLETE");

console.log(
"Every step above ran against the current contracts in contracts/"
);

console.log(
"and the existing attribution-engine/attribution.py."
);

console.log("");

console.log("What this demo does NOT prove (see docs/ for full detail):");
console.log(
"  - No real ZK proof was generated or verified (MockZKVerifier is test-only)"
);
console.log(
"  - No Cosmos SDK chain, testnet, or mainnet is involved (Hardhat in-memory EVM only)"
);
console.log(
"  - Attribution scores came from a hand-picked demo dataset, not a real vector DB"
);
console.log(
"  - RoyaltyManager.SETTLER_ROLE was granted manually to the deployer for this demo,"
);
console.log(
"    not by any automated/consensus-checked Attribution Node (see docs/MVP/attribution-node-spec.md)"
);
}

main().catch((error) => {
console.error(error);
process.exitCode = 1;
});
