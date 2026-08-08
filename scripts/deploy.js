/**
 * Local deployment script — deploys and wires the full VeriMind PoC contract set.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.js --network hardhat
 *
 * For a real network, add a network config to hardhat.config.js and pass
 * --network <name>. Allocation addresses below default to the deployer's own
 * signer accounts for local testing — replace with real multisig/vesting
 * contract addresses before any live deployment.
 */
const { ethers } = require("hardhat");

const MIN_STAKE = ethers.parseUnits("1000", 18);
const UNSTAKE_COOLDOWN = 7 * 24 * 60 * 60; // 7 days, matches whitepaper's node-safety assumptions
const PROCESSING_TIMEOUT = 60 * 60; // 1 hour

async function main() {
  const [deployer, communityPool, ecosystemPool, seedVesting, teamVesting, treasury] = await ethers.getSigners();

  console.log("Deploying VeriMind Protocol PoC contracts...");
  console.log("Deployer:", deployer.address);

  const VMINDToken = await ethers.getContractFactory("VMINDToken");
  const vmind = await VMINDToken.deploy(
    communityPool.address, ecosystemPool.address, seedVesting.address, teamVesting.address, treasury.address
  );
  await vmind.waitForDeployment();
  console.log("VMINDToken deployed to:", await vmind.getAddress());

  const StakingManager = await ethers.getContractFactory("StakingManager");
  const staking = await StakingManager.deploy(await vmind.getAddress(), MIN_STAKE, UNSTAKE_COOLDOWN);
  await staking.waitForDeployment();
  console.log("StakingManager deployed to:", await staking.getAddress());

  const EscrowVault = await ethers.getContractFactory("EscrowVault");
  const escrow = await EscrowVault.deploy(await vmind.getAddress());
  await escrow.waitForDeployment();
  console.log("EscrowVault deployed to:", await escrow.getAddress());

  const MockZKVerifier = await ethers.getContractFactory("MockZKVerifier");
  const mockVerifier = await MockZKVerifier.deploy();
  await mockVerifier.waitForDeployment();
  console.log("MockZKVerifier deployed to:", await mockVerifier.getAddress());
  console.log("  ⚠ TEST-ONLY placeholder — swap via InferenceManager.setZKVerifier() once");
  console.log("    the real Halo2/Plonky3 verifier (whitepaper Section 4) is implemented.");

  const InferenceManager = await ethers.getContractFactory("InferenceManager");
  const inference = await InferenceManager.deploy(
    await escrow.getAddress(), await staking.getAddress(), await mockVerifier.getAddress(), PROCESSING_TIMEOUT
  );
  await inference.waitForDeployment();
  console.log("InferenceManager deployed to:", await inference.getAddress());

  const RoyaltyManager = await ethers.getContractFactory("RoyaltyManager");
  const royalty = await RoyaltyManager.deploy(await vmind.getAddress());
  await royalty.waitForDeployment();
  console.log("RoyaltyManager deployed to:", await royalty.getAddress());

  const Governance = await ethers.getContractFactory("Governance");
  const governance = await Governance.deploy(
    await vmind.getAddress(),
    7 * 24 * 60 * 60, // 7-day voting period
    ethers.parseUnits("10000000", 18) // 10M VMIND quorum
  );
  await governance.waitForDeployment();
  console.log("Governance deployed to:", await governance.getAddress());

  console.log("\nWiring roles...");
  await escrow.grantRole(await escrow.CONTROLLER_ROLE(), await inference.getAddress());
  await staking.grantRole(await staking.SLASHER_ROLE(), await inference.getAddress());
  console.log("  EscrowVault.CONTROLLER_ROLE -> InferenceManager");
  console.log("  StakingManager.SLASHER_ROLE -> InferenceManager");

  console.log("\nDeployment complete. See README.md for what's implemented vs. planned.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
