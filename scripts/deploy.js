/**
 * Local deployment script — deploys and wires the full VeriMind PoC contract set.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.js --network hardhat
 *
 * For a real network, add a network config to hardhat.config.js and pass
 * --network <name>.
 *
 * Allocation addresses below default to the deployer's own signer accounts
 * for local testing. Replace them with real multisig/vesting contract
 * addresses before any live deployment.
 *
 * IMPORTANT:
 * - This deployment is for the current MVP/PoC architecture.
 * - MockZKVerifier is TEST-ONLY and provides no cryptographic security.
 * - Governance uses an explicit target allowlist.
 * - RoyaltyManager.SETTLER_ROLE is granted to the deployer for local MVP/PoC
 *   settlement, matching the isolated demo. Use a dedicated settlement
 *   service/multisig before any production deployment.
 * - Real vesting, production ZK verification, validators, and L1/appchain
 *   infrastructure are future components.
 */

const { ethers } = require("hardhat");

const MIN_STAKE = ethers.parseUnits("1000", 18);
const UNSTAKE_COOLDOWN = 7 * 24 * 60 * 60;
const PROCESSING_TIMEOUT = 60 * 60;
const GOVERNANCE_VOTING_PERIOD = 7 * 24 * 60 * 60;
const GOVERNANCE_QUORUM = ethers.parseUnits("10000000", 18);

async function main() {
  const [
    deployer,
    communityPool,
    ecosystemPool,
    seedVesting,
    teamVesting,
    treasury,
  ] = await ethers.getSigners();

  console.log("Deploying VeriMind Protocol MVP/PoC contracts...");
  console.log("Deployer:", deployer.address);

  // -------------------------------------------------------------------
  // VMINDToken
  // -------------------------------------------------------------------

  const VMINDToken = await ethers.getContractFactory("VMINDToken");

  const vmind = await VMINDToken.deploy(
    communityPool.address,
    ecosystemPool.address,
    seedVesting.address,
    teamVesting.address,
    treasury.address
  );

  await vmind.waitForDeployment();

  console.log(
    "VMINDToken deployed to:",
    await vmind.getAddress()
  );

  // -------------------------------------------------------------------
  // StakingManager
  // -------------------------------------------------------------------

  const StakingManager = await ethers.getContractFactory(
    "StakingManager"
  );

  const staking = await StakingManager.deploy(
    await vmind.getAddress(),
    MIN_STAKE,
    UNSTAKE_COOLDOWN
  );

  await staking.waitForDeployment();

  console.log(
    "StakingManager deployed to:",
    await staking.getAddress()
  );

  // -------------------------------------------------------------------
  // EscrowVault
  // -------------------------------------------------------------------

  const EscrowVault = await ethers.getContractFactory(
    "EscrowVault"
  );

  const escrow = await EscrowVault.deploy(
    await vmind.getAddress()
  );

  await escrow.waitForDeployment();

  console.log(
    "EscrowVault deployed to:",
    await escrow.getAddress()
  );

  // -------------------------------------------------------------------
  // MockZKVerifier
  // -------------------------------------------------------------------

  const MockZKVerifier = await ethers.getContractFactory(
    "MockZKVerifier"
  );

  const mockVerifier = await MockZKVerifier.deploy();

  await mockVerifier.waitForDeployment();

  console.log(
    "MockZKVerifier deployed to:",
    await mockVerifier.getAddress()
  );

  console.log(
    "  WARNING: TEST-ONLY placeholder."
  );

  console.log(
    "  Replace it with a real verifier before production use."
  );

  // -------------------------------------------------------------------
  // InferenceManager
  // -------------------------------------------------------------------

  const InferenceManager = await ethers.getContractFactory(
    "InferenceManager"
  );

  const inference = await InferenceManager.deploy(
    await escrow.getAddress(),
    await staking.getAddress(),
    await mockVerifier.getAddress(),
    PROCESSING_TIMEOUT
  );

  await inference.waitForDeployment();

  console.log(
    "InferenceManager deployed to:",
    await inference.getAddress()
  );

  // -------------------------------------------------------------------
  // RoyaltyManager
  // -------------------------------------------------------------------

  const RoyaltyManager = await ethers.getContractFactory(
    "RoyaltyManager"
  );

  const royalty = await RoyaltyManager.deploy(
    await vmind.getAddress()
  );

  await royalty.waitForDeployment();

  console.log(
    "RoyaltyManager deployed to:",
    await royalty.getAddress()
  );

  // -------------------------------------------------------------------
  // Governance
  // -------------------------------------------------------------------

  const Governance = await ethers.getContractFactory(
    "Governance"
  );

  const governance = await Governance.deploy(
    await vmind.getAddress(),
    GOVERNANCE_VOTING_PERIOD,
    GOVERNANCE_QUORUM
  );

  await governance.waitForDeployment();

  console.log(
    "Governance deployed to:",
    await governance.getAddress()
  );

  // -------------------------------------------------------------------
  // Role wiring
  // -------------------------------------------------------------------

  console.log("\nWiring roles...");

  // InferenceManager controls escrow releases/refunds.
  await escrow.grantRole(
    await escrow.CONTROLLER_ROLE(),
    await inference.getAddress()
  );

  // InferenceManager can slash nodes after invalid proofs.
  await staking.grantRole(
    await staking.SLASHER_ROLE(),
    await inference.getAddress()
  );

  // MVP/PoC only:
  // The deployer acts as the authorized royalty settlement caller,
  // matching demo/run-demo.js.
  await royalty.grantRole(
    await royalty.SETTLER_ROLE(),
    deployer.address
  );

  console.log(
    "  EscrowVault.CONTROLLER_ROLE -> InferenceManager"
  );

  console.log(
    "  StakingManager.SLASHER_ROLE -> InferenceManager"
  );

  console.log(
    "  RoyaltyManager.SETTLER_ROLE -> deployer (MVP/PoC only)"
  );

  // -------------------------------------------------------------------
  // Governance target allowlist
  // -------------------------------------------------------------------

  console.log("\nConfiguring Governance target allowlist...");

  await governance.setAllowedTarget(
    await vmind.getAddress(),
    true
  );

  console.log(
    "  Governance allowed target -> VMINDToken"
  );

  // -------------------------------------------------------------------
  // Deployment summary
  // -------------------------------------------------------------------

  console.log("\nDeployment complete.");

  console.log("\nContract addresses:");

  console.log(
    "VMINDToken:      ",
    await vmind.getAddress()
  );

  console.log(
    "StakingManager:  ",
    await staking.getAddress()
  );

  console.log(
    "EscrowVault:     ",
    await escrow.getAddress()
  );

  console.log(
    "MockZKVerifier:  ",
    await mockVerifier.getAddress()
  );

  console.log(
    "InferenceManager:",
    await inference.getAddress()
  );

  console.log(
    "RoyaltyManager:  ",
    await royalty.getAddress()
  );

  console.log(
    "Governance:      ",
    await governance.getAddress()
  );

  console.log("\nMVP notes:");

  console.log(
    "- Attribution engine is currently off-chain/reference implementation."
  );

  console.log(
    "- Royalty settlement is implemented through RoyaltyManager."
  );

  console.log(
    "- For this local MVP/PoC, the deployer is the authorized royalty settler, matching demo/run-demo.js."
  );

  console.log(
    "- Before production, replace deployer settlement with a dedicated settlement service/multisig and appropriate authorization controls."
  );

  console.log(
    "- MockZKVerifier is TEST-ONLY."
  );

  console.log(
    "- Production ZK, decentralized compute, validators, and appchain/L1 are future components."
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
