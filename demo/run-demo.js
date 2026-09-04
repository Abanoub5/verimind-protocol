const { ethers } = require("hardhat");
const { execFileSync } = require("child_process");

const MIN_STAKE = ethers.parseUnits("1000", 18);
const UNSTAKE_COOLDOWN = 7 * 24 * 60 * 60;
const PROCESSING_TIMEOUT = 60 * 60;

async function main() {
  console.log("\n==============================================");
  console.log(" VeriMind Protocol - End-to-End Prototype Demo");
  console.log("==============================================\n");

  // --------------------------------------------------------------------------
  // Signers
  // --------------------------------------------------------------------------

  const [
    deployer,
    communityPool,
    ecosystemPool,
    seedVesting,
    teamVesting,
    treasury,
    creator1,
    creator2,
    creator3,
    client
  ] = await ethers.getSigners();

  console.log("Deployer:", deployer.address);
  console.log("Client:", client.address);
  console.log("Creator 1:", creator1.address);
  console.log("Creator 2:", creator2.address);
  console.log("Creator 3:", creator3.address);
  console.log("");

  // --------------------------------------------------------------------------
  // 1. Deploy VMINDToken
  // --------------------------------------------------------------------------

  console.log("1. Deploying VMINDToken...");

  const VMINDToken =
    await ethers.getContractFactory("VMINDToken");

  const vmindToken = await VMINDToken.deploy(
    communityPool.address,
    ecosystemPool.address,
    seedVesting.address,
    teamVesting.address,
    treasury.address
  );

  await vmindToken.waitForDeployment();

  const vmindAddress = await vmindToken.getAddress();

  console.log("VMINDToken:", vmindAddress);
  console.log("");

  // --------------------------------------------------------------------------
  // 2. Deploy MockZKVerifier
  // --------------------------------------------------------------------------

  console.log("2. Deploying MockZKVerifier...");

  const MockZKVerifier =
    await ethers.getContractFactory("MockZKVerifier");

  const mockVerifier = await MockZKVerifier.deploy();

  await mockVerifier.waitForDeployment();

  const mockVerifierAddress =
    await mockVerifier.getAddress();

  console.log(
    "MockZKVerifier:",
    mockVerifierAddress
  );

  console.log(
    "WARNING: MockZKVerifier is TEST-ONLY and provides no cryptographic security."
  );

  console.log("");

  // --------------------------------------------------------------------------
  // 3. Deploy StakingManager
  // --------------------------------------------------------------------------

  console.log("3. Deploying StakingManager...");

  const StakingManager =
    await ethers.getContractFactory("StakingManager");

  const stakingManager = await StakingManager.deploy(
    vmindAddress,
    MIN_STAKE,
    UNSTAKE_COOLDOWN
  );

  await stakingManager.waitForDeployment();

  const stakingAddress =
    await stakingManager.getAddress();

  console.log(
    "StakingManager:",
    stakingAddress
  );

  console.log(
    "Minimum stake:",
    ethers.formatUnits(MIN_STAKE, 18),
    "VMIND"
  );

  console.log("");

  // --------------------------------------------------------------------------
  // 4. Deploy EscrowVault
  // --------------------------------------------------------------------------

  console.log("4. Deploying EscrowVault...");

  const EscrowVault =
    await ethers.getContractFactory("EscrowVault");

  const escrowVault = await EscrowVault.deploy(
    vmindAddress
  );

  await escrowVault.waitForDeployment();

  const escrowAddress =
    await escrowVault.getAddress();

  console.log(
    "EscrowVault:",
    escrowAddress
  );

  console.log("");

  // --------------------------------------------------------------------------
  // 5. Deploy InferenceManager
  // --------------------------------------------------------------------------

  console.log("5. Deploying InferenceManager...");

  const InferenceManager =
    await ethers.getContractFactory("InferenceManager");

  const inferenceManager = await InferenceManager.deploy(
    escrowAddress,
    stakingAddress,
    mockVerifierAddress,
    PROCESSING_TIMEOUT
  );

  await inferenceManager.waitForDeployment();

  const inferenceAddress =
    await inferenceManager.getAddress();

  console.log(
    "InferenceManager:",
    inferenceAddress
  );

  console.log(
    "Processing timeout:",
    PROCESSING_TIMEOUT,
    "seconds"
  );

  console.log("");

  // --------------------------------------------------------------------------
  // 6. Deploy RoyaltyManager
  // --------------------------------------------------------------------------

  console.log("6. Deploying RoyaltyManager...");

  const RoyaltyManager =
    await ethers.getContractFactory("RoyaltyManager");

  const royaltyManager = await RoyaltyManager.deploy(
    vmindAddress
  );

  await royaltyManager.waitForDeployment();

  const royaltyAddress =
    await royaltyManager.getAddress();

  console.log(
    "RoyaltyManager:",
    royaltyAddress
  );

  console.log("");

  // --------------------------------------------------------------------------
  // 7. Deploy Governance
  // --------------------------------------------------------------------------

  console.log("7. Deploying Governance...");

  const Governance =
    await ethers.getContractFactory("Governance");

  const governance = await Governance.deploy(
    vmindAddress,
    7 * 24 * 60 * 60,
    ethers.parseUnits("10000000", 18)
  );

  await governance.waitForDeployment();

  const governanceAddress =
    await governance.getAddress();

  console.log(
    "Governance:",
    governanceAddress
  );

  console.log("");

  // --------------------------------------------------------------------------
  // 8. Configure contract roles
  // --------------------------------------------------------------------------

  console.log("8. Configuring contract relationships...");

  // InferenceManager controls EscrowVault.
  const controllerRole =
    await escrowVault.CONTROLLER_ROLE();

  await (
    await escrowVault.grantRole(
      controllerRole,
      inferenceAddress
    )
  ).wait();

  console.log(
    "✓ EscrowVault.CONTROLLER_ROLE -> InferenceManager"
  );

  // InferenceManager can slash nodes.
  const slasherRole =
    await stakingManager.SLASHER_ROLE();

  await (
    await stakingManager.grantRole(
      slasherRole,
      inferenceAddress
    )
  ).wait();

  console.log(
    "✓ StakingManager.SLASHER_ROLE -> InferenceManager"
  );

  // Deployer acts as settlement authority for this local PoC.
  const settlerRole =
    await royaltyManager.SETTLER_ROLE();

  await (
    await royaltyManager.grantRole(
      settlerRole,
      deployer.address
    )
  ).wait();

  console.log(
    "✓ RoyaltyManager.SETTLER_ROLE -> deployer"
  );

  // Governance target allowlist.
  await (
    await governance.setAllowedTarget(
      vmindAddress,
      true
    )
  ).wait();

  console.log(
    "✓ Governance target allowlist configured"
  );

  console.log("");

  // --------------------------------------------------------------------------
  // 9. Prepare local token balances
  // --------------------------------------------------------------------------

  console.log("9. Preparing local VMIND balances...");

  const clientFunding =
    ethers.parseUnits("100", 18);

  const nodeFunding =
    ethers.parseUnits("2000", 18);

  const royaltyFunding =
    ethers.parseUnits("10", 18);

  // Fund client.
  await (
    await communityPool.sendTransaction({
      to: client.address,
      value: 0
    })
  ).wait();

  await (
    await vmindToken
      .connect(communityPool)
      .transfer(
        client.address,
        clientFunding
      )
  ).wait();

  // Fund compute/attribution node.
  await (
    await vmindToken
      .connect(communityPool)
      .transfer(
        creator1.address,
        nodeFunding
      )
  ).wait();

  // Fund RoyaltyManager from ecosystem pool.
  await (
    await vmindToken
      .connect(ecosystemPool)
      .transfer(
        royaltyAddress,
        royaltyFunding
      )
  ).wait();

  console.log(
    "Client funded:",
    ethers.formatUnits(clientFunding, 18),
    "VMIND"
  );

  console.log(
    "Creator 1 funded:",
    ethers.formatUnits(nodeFunding, 18),
    "VMIND"
  );

  console.log(
    "RoyaltyManager funded:",
    ethers.formatUnits(royaltyFunding, 18),
    "VMIND"
  );

  console.log("");

  // --------------------------------------------------------------------------
  // 10. Stake compute node
  // --------------------------------------------------------------------------

  console.log("10. Staking compute node...");

  const stakeAmount =
    ethers.parseUnits("1000", 18);

  await (
    await vmindToken
      .connect(creator1)
      .approve(
        stakingAddress,
        stakeAmount
      )
  ).wait();

  await (
    await stakingManager
      .connect(creator1)
      .stake(stakeAmount)
  ).wait();

  const nodeEligible =
    await stakingManager.isEligible(
      creator1.address
    );

  console.log(
    "Creator 1 eligible:",
    nodeEligible
  );

  if (!nodeEligible) {
    throw new Error(
      "Creator 1 should be eligible after staking."
    );
  }

  console.log("");

  // --------------------------------------------------------------------------
  // 11. Run attribution reference implementation
  // --------------------------------------------------------------------------

  console.log("11. Running attribution engine...");

  const pythonCandidates = [
    "python3",
    "python"
  ];

  let pythonCommand = null;

  for (const candidate of pythonCandidates) {
    try {
      execFileSync(
        candidate,
        ["--version"],
        {
          stdio: "ignore"
        }
      );

      pythonCommand = candidate;
      break;
    } catch (_) {
      // Try next candidate.
    }
  }

  if (pythonCommand) {
    try {
      execFileSync(
        pythonCommand,
        [
          "attribution-engine/attribution.py"
        ],
        {
          stdio: "inherit"
        }
      );

      console.log(
        "✓ Attribution reference implementation executed."
      );
    } catch (error) {
      console.log(
        "Attribution reference implementation returned an error."
      );

      console.log(
        "Continuing with the deterministic demo attribution vector."
      );
    }
  } else {
    console.log(
      "Python was not found on PATH."
    );

    console.log(
      "Continuing with the deterministic demo attribution vector."
    );
  }

  console.log("");

  // --------------------------------------------------------------------------
  // 12. Prepare attribution vector
  // --------------------------------------------------------------------------

  console.log("12. Preparing attribution scores...");

  const creators = [
    creator1.address,
    creator2.address,
    creator3.address
  ];

  // 10,000 BPS = 100%.
  const scoresBps = [
    5000,
    3000,
    2000
  ];

  const totalBps =
    scoresBps.reduce(
      (sum, value) => sum + value,
      0
    );

  if (totalBps !== 10000) {
    throw new Error(
      `Invalid attribution scores: expected 10000 BPS, received ${totalBps}.`
    );
  }

  console.log(
    "Creator 1:",
    scoresBps[0],
    "BPS"
  );

  console.log(
    "Creator 2:",
    scoresBps[1],
    "BPS"
  );

  console.log(
    "Creator 3:",
    scoresBps[2],
    "BPS"
  );

  console.log(
    "Total:",
    totalBps,
    "BPS"
  );

  console.log("");

  // --------------------------------------------------------------------------
  // 13. Submit inference request
  // --------------------------------------------------------------------------

  console.log("13. Submitting inference request...");

  const requestId =
    ethers.keccak256(
      ethers.toUtf8Bytes(
        "verimind-demo-request-001"
      )
    );

  const maxFee =
    ethers.parseUnits("10", 18);

  const promptHash =
    ethers.keccak256(
      ethers.toUtf8Bytes(
        "verimind-demo-prompt"
      )
    );

  await (
    await vmindToken
      .connect(client)
      .approve(
        escrowAddress,
        maxFee
      )
  ).wait();

  await (
    await inferenceManager
      .connect(client)
      .submitRequest(
        requestId,
        maxFee,
        promptHash
      )
  ).wait();

  console.log(
    "✓ Inference request submitted."
  );

  console.log(
    "Request ID:",
    requestId
  );

  console.log(
    "Max fee:",
    ethers.formatUnits(maxFee, 18),
    "VMIND"
  );

  console.log("");

  // --------------------------------------------------------------------------
  // 14. Assign compute node
  // --------------------------------------------------------------------------

  console.log("14. Assigning compute node...");

  await (
    await inferenceManager
      .connect(creator1)
      .assignNode(requestId)
  ).wait();

  console.log(
    "✓ Creator 1 assigned as compute node."
  );

  console.log("");

  // --------------------------------------------------------------------------
  // 15. Submit mock ZK proof
  // --------------------------------------------------------------------------

  console.log("15. Submitting mock ZK proof...");

  const mockProof =
    ethers.hexlify(
      ethers.randomBytes(32)
    );

  const publicInputs =
    ethers.hexlify(
      ethers.randomBytes(32)
    );

  await (
    await inferenceManager
      .connect(creator1)
      .submitProof(
        requestId,
        mockProof,
        publicInputs
      )
  ).wait();

  console.log(
    "✓ Mock proof submitted."
  );

  console.log(
    "WARNING: Proof verification is TEST-ONLY."
  );

  console.log("");

  // --------------------------------------------------------------------------
  // 16. Verify request state
  // --------------------------------------------------------------------------

  console.log("16. Checking inference state...");

  const request =
    await inferenceManager.requests(
      requestId
    );

  // InferenceManager.State.VERIFIED = 4.
  if (request.state !== 4n) {
    throw new Error(
      `Expected VERIFIED state (4), received ${request.state}.`
    );
  }

  console.log(
    "✓ Request reached VERIFIED state."
  );

  console.log("");

  // --------------------------------------------------------------------------
  // 17. Settle inference request
  // --------------------------------------------------------------------------

  console.log("17. Settling inference request...");

  await (
    await inferenceManager
      .connect(deployer)
      .settle(
        requestId,
        maxFee
      )
  ).wait();

  console.log(
    "✓ Inference request settled."
  );

  console.log(
    "✓ Full escrow released to assigned compute node."
  );

  console.log("");

  // --------------------------------------------------------------------------
  // 18. Execute royalty distribution
  // --------------------------------------------------------------------------

  console.log("18. Executing royalty distribution...");

  const royaltyAmount =
    ethers.parseUnits("10", 18);

  await (
    await royaltyManager
      .connect(deployer)
      .distributeRoyalties(
        requestId,
        royaltyAmount,
        creators,
        scoresBps
      )
  ).wait();

  console.log(
    "✓ Royalty distribution completed."
  );

  console.log("");

  // --------------------------------------------------------------------------
  // 19. Final balances
  // --------------------------------------------------------------------------

  console.log("19. Final balances...");

  const clientBalance =
    await vmindToken.balanceOf(
      client.address
    );

  const creator1Balance =
    await vmindToken.balanceOf(
      creator1.address
    );

  const creator2Balance =
    await vmindToken.balanceOf(
      creator2.address
    );

  const creator3Balance =
    await vmindToken.balanceOf(
      creator3.address
    );

  const royaltyManagerBalance =
    await vmindToken.balanceOf(
      royaltyAddress
    );

  console.log(
    "Client:",
    ethers.formatUnits(clientBalance, 18),
    "VMIND"
  );

  console.log(
    "Creator 1:",
    ethers.formatUnits(creator1Balance, 18),
    "VMIND"
  );

  console.log(
    "Creator 2:",
    ethers.formatUnits(creator2Balance, 18),
    "VMIND"
  );

  console.log(
    "Creator 3:",
    ethers.formatUnits(creator3Balance, 18),
    "VMIND"
  );

  console.log(
    "RoyaltyManager:",
    ethers.formatUnits(
      royaltyManagerBalance,
      18
    ),
    "VMIND"
  );

  console.log("");

  // --------------------------------------------------------------------------
  // 20. Final verification
  // --------------------------------------------------------------------------

  console.log("20. Final verification...");

  const finalRequest =
    await inferenceManager.requests(
      requestId
    );

  if (finalRequest.state !== 5n) {
    throw new Error(
      `Expected SETTLED state (5), received ${finalRequest.state}.`
    );
  }

  const royaltySettled =
    await royaltyManager.settled(
      requestId
    );

  if (!royaltySettled) {
    throw new Error(
      "Royalty settlement flag was not recorded."
    );
  }

  const remainingEscrow =
    await escrowVault.escrowed(
      requestId
    );

  if (remainingEscrow !== 0n) {
    throw new Error(
      `Expected zero remaining escrow, received ${remainingEscrow}.`
    );
  }

  console.log(
    "✓ Inference state: SETTLED"
  );

  console.log(
    "✓ Royalty settlement: recorded"
  );

  console.log(
    "✓ Remaining escrow: 0 VMIND"
  );

  console.log("");

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------

  console.log("==============================================");
  console.log(" Demo Completed Successfully");
  console.log("==============================================");

  console.log(
    "\nImplemented workflow demonstrated:"
  );

  console.log(
    "1. VMINDToken deployment"
  );

  console.log(
    "2. Contract role wiring"
  );

  console.log(
    "3. Compute-node staking"
  );

  console.log(
    "4. Attribution reference execution"
  );

  console.log(
    "5. Inference request submission"
  );

  console.log(
    "6. Compute-node assignment"
  );

  console.log(
    "7. Mock ZK proof submission"
  );

  console.log(
    "8. Inference verification"
  );

  console.log(
    "9. Inference settlement"
  );

  console.log(
    "10. Attribution-based royalty distribution"
  );

  console.log(
    "11. Final state and balance verification"
  );

  console.log(
    "\nIMPORTANT:"
  );

  console.log(
    "- This is a local MVP/PoC demonstration."
  );

  console.log(
    "- MockZKVerifier provides no cryptographic security."
  );

  console.log(
    "- Attribution scoring remains an off-chain/reference component."
  );

  console.log(
    "- Royalty settlement uses an authorized SETTLER_ROLE."
  );

  console.log(
    "- Production ZK, decentralized compute, and dedicated network infrastructure are future components."
  );

  console.log("");
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nDemo failed:");
    console.error(error);
    process.exit(1);
  });
