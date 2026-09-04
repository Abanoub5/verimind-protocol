const hre = require("hardhat");
const { execFileSync } = require("child_process");
const path = require("path");

async function main() {
  const { ethers } = hre;

  console.log("\n========================================");
  console.log("       VeriMind Protocol E2E Demo");
  console.log("========================================\n");

  const [
    deployer,
    communityPool,
    ecosystemPool,
    seedInvestors,
    coreTeam,
    treasury,
    client,
    creator1,
    creator2,
    creator3,
  ] = await ethers.getSigners();

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  const MIN_STAKE = ethers.parseUnits("1000", 18);
  const UNSTAKE_COOLDOWN = 7 * 24 * 60 * 60;
  const PROCESSING_TIMEOUT = 60 * 60;
  const GOVERNANCE_VOTING_PERIOD = 7 * 24 * 60 * 60;
  const GOVERNANCE_QUORUM = ethers.parseUnits("10000000", 18);

  const MAX_FEE = ethers.parseUnits("10", 18);
  const ROYALTY_FUNDING = ethers.parseUnits("10", 18);

  const REQUEST_ID = ethers.keccak256(
    ethers.toUtf8Bytes("verimind-demo-request-001")
  );

  const PROMPT_HASH = ethers.keccak256(
    ethers.toUtf8Bytes("What is the relationship between AI models and creator attribution?")
  );

  // ---------------------------------------------------------------------------
  // 1. Deploy VMINDToken
  // ---------------------------------------------------------------------------

  console.log("1. Deploying VMINDToken...");

  const VMINDToken = await ethers.getContractFactory("VMINDToken");

  const token = await VMINDToken.deploy(
    communityPool.address,
    ecosystemPool.address,
    seedInvestors.address,
    coreTeam.address,
    treasury.address
  );

  await token.waitForDeployment();

  console.log("   VMINDToken:", await token.getAddress());

  // ---------------------------------------------------------------------------
  // 2. Deploy MockZKVerifier
  // ---------------------------------------------------------------------------

  console.log("\n2. Deploying MockZKVerifier...");

  const MockZKVerifier = await ethers.getContractFactory(
    "MockZKVerifier"
  );

  const zkVerifier = await MockZKVerifier.deploy();

  await zkVerifier.waitForDeployment();

  console.log(
    "   MockZKVerifier:",
    await zkVerifier.getAddress()
  );

  console.log(
    "   WARNING: MockZKVerifier is TEST-ONLY and provides no cryptographic security."
  );

  // ---------------------------------------------------------------------------
  // 3. Deploy StakingManager
  // ---------------------------------------------------------------------------

  console.log("\n3. Deploying StakingManager...");

  const StakingManager = await ethers.getContractFactory(
    "StakingManager"
  );

  const stakingManager = await StakingManager.deploy(
    await token.getAddress(),
    MIN_STAKE,
    UNSTAKE_COOLDOWN
  );

  await stakingManager.waitForDeployment();

  console.log(
    "   StakingManager:",
    await stakingManager.getAddress()
  );

  // ---------------------------------------------------------------------------
  // 4. Deploy EscrowVault
  // ---------------------------------------------------------------------------

  console.log("\n4. Deploying EscrowVault...");

  const EscrowVault = await ethers.getContractFactory("EscrowVault");

  const escrowVault = await EscrowVault.deploy(
    await token.getAddress()
  );

  await escrowVault.waitForDeployment();

  console.log(
    "   EscrowVault:",
    await escrowVault.getAddress()
  );

  // ---------------------------------------------------------------------------
  // 5. Deploy InferenceManager
  // ---------------------------------------------------------------------------

  console.log("\n5. Deploying InferenceManager...");

  const InferenceManager = await ethers.getContractFactory(
    "InferenceManager"
  );

  const inferenceManager = await InferenceManager.deploy(
    await escrowVault.getAddress(),
    await stakingManager.getAddress(),
    await zkVerifier.getAddress(),
    PROCESSING_TIMEOUT
  );

  await inferenceManager.waitForDeployment();

  console.log(
    "   InferenceManager:",
    await inferenceManager.getAddress()
  );

  // ---------------------------------------------------------------------------
  // 6. Deploy RoyaltyManager
  // ---------------------------------------------------------------------------

  console.log("\n6. Deploying RoyaltyManager...");

  const RoyaltyManager = await ethers.getContractFactory(
    "RoyaltyManager"
  );

  const royaltyManager = await RoyaltyManager.deploy(
    await token.getAddress()
  );

  await royaltyManager.waitForDeployment();

  console.log(
    "   RoyaltyManager:",
    await royaltyManager.getAddress()
  );

  // ---------------------------------------------------------------------------
  // 7. Deploy Governance
  // ---------------------------------------------------------------------------

  console.log("\n7. Deploying Governance...");

  const Governance = await ethers.getContractFactory("Governance");

  const governance = await Governance.deploy(
    await token.getAddress(),
    GOVERNANCE_VOTING_PERIOD,
    GOVERNANCE_QUORUM
  );

  await governance.waitForDeployment();

  console.log(
    "   Governance:",
    await governance.getAddress()
  );

  // ---------------------------------------------------------------------------
  // 8. Configure Roles
  // ---------------------------------------------------------------------------

  console.log("\n8. Configuring protocol roles...");

  const CONTROLLER_ROLE = await escrowVault.CONTROLLER_ROLE();
  const SLASHER_ROLE = await stakingManager.SLASHER_ROLE();
  const SETTLER_ROLE = await royaltyManager.SETTLER_ROLE();

  await (
    await escrowVault.grantRole(
      CONTROLLER_ROLE,
      await inferenceManager.getAddress()
    )
  ).wait();

  await (
    await stakingManager.grantRole(
      SLASHER_ROLE,
      await inferenceManager.getAddress()
    )
  ).wait();

  await (
    await royaltyManager.grantRole(
      SETTLER_ROLE,
      deployer.address
    )
  ).wait();

  // Allow VMINDToken as a governance target.
  await (
    await governance.setAllowedTarget(
      await token.getAddress(),
      true
    )
  ).wait();

  console.log("   Role configuration complete.");

  // ---------------------------------------------------------------------------
  // 9. Fund demo participants
  // ---------------------------------------------------------------------------

  console.log("\n9. Funding demo participants...");

  // Client receives VMIND to pay inference fees.
  await (
    await token
      .connect(communityPool)
      .transfer(client.address, MAX_FEE)
  ).wait();

  // Creator 1 receives enough VMIND to stake.
  await (
    await token
      .connect(communityPool)
      .transfer(
        creator1.address,
        ethers.parseUnits("2000", 18)
      )
  ).wait();

  // RoyaltyManager receives funds used for creator royalty distribution.
  await (
    await token
      .connect(ecosystemPool)
      .transfer(
        await royaltyManager.getAddress(),
        ROYALTY_FUNDING
      )
  ).wait();

  console.log("   Client funded with:", ethers.formatUnits(MAX_FEE, 18), "VMIND");
  console.log(
    "   Creator 1 funded with:",
    ethers.formatUnits(ethers.parseUnits("2000", 18), 18),
    "VMIND"
  );
  console.log(
    "   RoyaltyManager funded with:",
    ethers.formatUnits(ROYALTY_FUNDING, 18),
    "VMIND"
  );

  // ---------------------------------------------------------------------------
  // 10. Creator Node Stakes
  // ---------------------------------------------------------------------------

  console.log("\n10. Creator 1 staking as an attribution/compute node...");

  await (
    await token
      .connect(creator1)
      .approve(
        await stakingManager.getAddress(),
        MIN_STAKE
      )
  ).wait();

  await (
    await stakingManager
      .connect(creator1)
      .stake(MIN_STAKE)
  ).wait();

  const creatorEligible = await stakingManager.isEligible(
    creator1.address
  );

  if (!creatorEligible) {
    throw new Error(
      "Creator 1 should be eligible after staking."
    );
  }

  console.log("   Creator 1 is eligible:", creatorEligible);

  // ---------------------------------------------------------------------------
  // 11. Submit inference request
  // ---------------------------------------------------------------------------

  console.log("\n11. Submitting inference request...");

  await (
    await token
      .connect(client)
      .approve(
        await escrowVault.getAddress(),
        MAX_FEE
      )
  ).wait();

  await (
    await inferenceManager
      .connect(client)
      .submitRequest(
        REQUEST_ID,
        MAX_FEE,
        PROMPT_HASH
      )
  ).wait();

  console.log("   Request ID:", REQUEST_ID);
  console.log(
    "   Max fee:",
    ethers.formatUnits(MAX_FEE, 18),
    "VMIND"
  );

  // ---------------------------------------------------------------------------
  // 12. Assign eligible node
  // ---------------------------------------------------------------------------

  console.log("\n12. Assigning eligible node...");

  await (
    await inferenceManager
      .connect(creator1)
      .assignNode(REQUEST_ID)
  ).wait();

  console.log("   Assigned node:", creator1.address);

  // ---------------------------------------------------------------------------
  // 13. Submit mock proof
  // ---------------------------------------------------------------------------

  console.log("\n13. Submitting inference proof...");

  const mockProof = ethers.hexlify(
    ethers.toUtf8Bytes("verimind-demo-mock-proof")
  );

  const publicInputs = ethers.hexlify(
    ethers.toUtf8Bytes("verimind-demo-public-inputs")
  );

  await (
    await inferenceManager
      .connect(creator1)
      .submitProof(
        REQUEST_ID,
        mockProof,
        publicInputs
      )
  ).wait();

  console.log("   Mock proof submitted.");

  const requestAfterProof =
    await inferenceManager.requests(REQUEST_ID);

  console.log(
    "   Request state after verification:",
    requestAfterProof.state.toString()
  );

  // VERIFIED = 4
  if (requestAfterProof.state !== 4n) {
    throw new Error(
      `Expected request state VERIFIED (4), got ${requestAfterProof.state}`
    );
  }

  // ---------------------------------------------------------------------------
  // 14. Run real attribution engine through bridge
  // ---------------------------------------------------------------------------

  console.log("\n14. Running attribution engine...");

  /*
   * These embeddings are intentionally deterministic demo vectors.
   *
   * The actual Hardhat creator addresses are passed to the Python bridge,
   * so the returned attribution records can be sent directly to
   * RoyaltyManager.
   */

  const queryEmbedding = [
    0.95,
    0.10,
    0.05,
    0.00,
  ];

  const creatorEmbeddings = [
    {
      address: creator1.address,
      embedding: [
        0.90,
        0.15,
        0.05,
        0.00,
      ],
    },
    {
      address: creator2.address,
      embedding: [
        0.20,
        0.85,
        0.10,
        0.05,
      ],
    },
    {
      address: creator3.address,
      embedding: [
        0.10,
        0.10,
        0.85,
        0.20,
      ],
    },
  ];

  const attributionInput = {
    query: queryEmbedding,
    creators: creatorEmbeddings,
    k: 3,
    tau: 0.1,
  };

  const bridgePath = path.join(
    __dirname,
    "attribution_bridge.py"
  );

  const pythonCommand =
    process.platform === "win32"
      ? "python"
      : "python3";

  let attributionOutput;

  try {
    attributionOutput = execFileSync(
      pythonCommand,
      [bridgePath],
      {
        input: JSON.stringify(attributionInput),
        encoding: "utf8",
        stdio: ["pipe", "pipe", "inherit"],
      }
    );
  } catch (error) {
    throw new Error(
      "Attribution bridge execution failed. " +
      "Make sure Python 3 and the attribution engine dependencies are available."
    );
  }

  let attributionResults;

  try {
    attributionResults = JSON.parse(
      attributionOutput.trim()
    );
  } catch (error) {
    throw new Error(
      `Invalid JSON returned by attribution bridge:\n${attributionOutput}`
    );
  }

  if (!Array.isArray(attributionResults)) {
    throw new Error(
      "Attribution bridge returned an invalid result format."
    );
  }

  if (attributionResults.length === 0) {
    throw new Error(
      "Attribution engine returned no creators."
    );
  }

  // ---------------------------------------------------------------------------
  // 15. Validate attribution output
  // ---------------------------------------------------------------------------

  console.log("\n15. Validating attribution scores...");

  const creators = attributionResults.map(
    (result) => result.address
  );

  const scoresBps = attributionResults.map(
    (result) => Number(result.bps)
  );

  const totalBps = scoresBps.reduce(
    (sum, value) => sum + value,
    0
  );

  if (totalBps !== 10000) {
    throw new Error(
      `Attribution BPS must sum to 10000, got ${totalBps}`
    );
  }

  const uniqueCreators = new Set(
    creators.map((address) => address.toLowerCase())
  );

  if (uniqueCreators.size !== creators.length) {
    throw new Error(
      "Attribution output contains duplicate creator addresses."
    );
  }

  for (let i = 0; i < attributionResults.length; i++) {
    const result = attributionResults[i];

    console.log(
      `   ${result.address}: score=${result.score}, bps=${result.bps}`
    );
  }

  console.log("   Total attribution:", totalBps, "BPS");
  console.log("   Attribution validation passed.");

  // ---------------------------------------------------------------------------
  // 16. Distribute royalties using actual attribution output
  // ---------------------------------------------------------------------------

  console.log("\n16. Distributing royalties...");

  const royaltyAmount = ethers.parseUnits(
    "10",
    18
  );

  await (
    await royaltyManager
      .connect(deployer)
      .distributeRoyalties(
        REQUEST_ID,
        royaltyAmount,
        creators,
        scoresBps
      )
  ).wait();

  console.log(
    "   Royalty amount:",
    ethers.formatUnits(royaltyAmount, 18),
    "VMIND"
  );

  for (let i = 0; i < attributionResults.length; i++) {
    const balance = await token.balanceOf(
      creators[i]
    );

    console.log(
      `   Creator ${i + 1} balance:`,
      ethers.formatUnits(balance, 18),
      "VMIND"
    );
  }

  // ---------------------------------------------------------------------------
  // 17. Settle inference escrow
  // ---------------------------------------------------------------------------

  console.log("\n17. Settling inference escrow...");

  await (
    await inferenceManager
      .connect(creator1)
      .settle(
        REQUEST_ID,
        MAX_FEE
      )
  ).wait();

  const finalRequest =
    await inferenceManager.requests(REQUEST_ID);

  console.log(
    "   Final request state:",
    finalRequest.state.toString()
  );

  // SETTLED = 5
  if (finalRequest.state !== 5n) {
    throw new Error(
      `Expected request state SETTLED (5), got ${finalRequest.state}`
    );
  }

  // ---------------------------------------------------------------------------
  // 18. Verify final balances
  // ---------------------------------------------------------------------------

  console.log("\n18. Verifying final balances...");

  const remainingEscrow =
    await escrowVault.escrowed(REQUEST_ID);

  if (remainingEscrow !== 0n) {
    throw new Error(
      `Expected request escrow to be empty, got ${ethers.formatUnits(
        remainingEscrow,
        18
      )} VMIND`
    );
  }

  console.log("   Escrow fully settled.");

  const creator1FinalBalance =
    await token.balanceOf(creator1.address);

  if (creator1FinalBalance <= MIN_STAKE) {
    throw new Error(
      "Creator 1 should have received the inference payment."
    );
  }

  console.log(
    "   Creator 1 final balance:",
    ethers.formatUnits(
      creator1FinalBalance,
      18
    ),
    "VMIND"
  );

  // ---------------------------------------------------------------------------
  // Final summary
  // ---------------------------------------------------------------------------

  console.log("\n========================================");
  console.log("          DEMO COMPLETED");
  console.log("========================================\n");

  console.log("E2E flow:");
  console.log("  ✓ Contracts deployed");
  console.log("  ✓ Roles configured");
  console.log("  ✓ Demo participants funded");
  console.log("  ✓ Attribution/compute node staked");
  console.log("  ✓ Inference request submitted");
  console.log("  ✓ Escrow funded");
  console.log("  ✓ Node assigned");
  console.log("  ✓ Mock proof submitted");
  console.log("  ✓ Proof verified by TEST-ONLY mock verifier");
  console.log("  ✓ Real attribution engine executed");
  console.log("  ✓ Attribution scores validated");
  console.log("  ✓ Royalties distributed using real BPS output");
  console.log("  ✓ Inference escrow settled");
  console.log("  ✓ Final state verified");

  console.log("\nRequest ID:");
  console.log(`  ${REQUEST_ID}`);

  console.log("\nAttribution:");
  attributionResults.forEach((result) => {
    console.log(
      `  ${result.address} -> ${result.bps} BPS`
    );
  });

  console.log("\nImportant:");
  console.log(
    "  MockZKVerifier is TEST-ONLY and must not be used in production."
  );

  console.log(
    "  Attribution is currently computed off-chain and submitted by a trusted settler."
  );

  console.log(
    "  This demo validates the MVP integration flow, not production-grade decentralization or cryptographic proof security."
  );

  console.log("");
}

main().catch((error) => {
  console.error("\nDemo failed:");
  console.error(error);
  process.exitCode = 1;
});
