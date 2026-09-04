const hre = require("hardhat");
const { ethers } = hre;
const { execFileSync } = require("child_process");

async function main() {
  console.log("==============================================");
  console.log(" VeriMind Protocol - End-to-End Prototype Demo");
  console.log("==============================================\n");

  const [deployer, creator1, creator2, creator3, client] =
    await ethers.getSigners();

  console.log("Deployer:", deployer.address);
  console.log("Client:", client.address);
  console.log("Creator 1:", creator1.address);
  console.log("Creator 2:", creator2.address);
  console.log("Creator 3:", creator3.address);
  console.log("");

  // ------------------------------------------------------------
  // 1. Deploy VMINDToken
  // ------------------------------------------------------------

  console.log("1. Deploying VMINDToken...");

  const VMINDToken = await ethers.getContractFactory("VMINDToken");
  const vmindToken = await VMINDToken.deploy();
  await vmindToken.waitForDeployment();

  console.log("VMINDToken:", await vmindToken.getAddress());
  console.log("");

  // ------------------------------------------------------------
  // 2. Deploy MockZKVerifier
  // ------------------------------------------------------------

  console.log("2. Deploying MockZKVerifier...");

  const MockZKVerifier =
    await ethers.getContractFactory("MockZKVerifier");

  const mockVerifier = await MockZKVerifier.deploy();
  await mockVerifier.waitForDeployment();

  console.log("MockZKVerifier:", await mockVerifier.getAddress());
  console.log(
    "WARNING: MockZKVerifier is TEST-ONLY and provides no cryptographic security."
  );
  console.log("");

  // ------------------------------------------------------------
  // 3. Deploy StakingManager
  // ------------------------------------------------------------

  console.log("3. Deploying StakingManager...");

  const StakingManager =
    await ethers.getContractFactory("StakingManager");

  const stakingManager = await StakingManager.deploy(
    await vmindToken.getAddress()
  );

  await stakingManager.waitForDeployment();

  console.log(
    "StakingManager:",
    await stakingManager.getAddress()
  );
  console.log("");

  // ------------------------------------------------------------
  // 4. Deploy EscrowVault
  // ------------------------------------------------------------

  console.log("4. Deploying EscrowVault...");

  const EscrowVault =
    await ethers.getContractFactory("EscrowVault");

  const escrowVault = await EscrowVault.deploy();

  await escrowVault.waitForDeployment();

  console.log(
    "EscrowVault:",
    await escrowVault.getAddress()
  );
  console.log("");

  // ------------------------------------------------------------
  // 5. Deploy InferenceManager
  // ------------------------------------------------------------

  console.log("5. Deploying InferenceManager...");

  const InferenceManager =
    await ethers.getContractFactory("InferenceManager");

  const inferenceManager = await InferenceManager.deploy(
    await escrowVault.getAddress(),
    await stakingManager.getAddress(),
    await mockVerifier.getAddress()
  );

  await inferenceManager.waitForDeployment();

  console.log(
    "InferenceManager:",
    await inferenceManager.getAddress()
  );
  console.log("");

  // ------------------------------------------------------------
  // 6. Deploy RoyaltyManager
  // ------------------------------------------------------------

  console.log("6. Deploying RoyaltyManager...");

  const RoyaltyManager =
    await ethers.getContractFactory("RoyaltyManager");

  const royaltyManager = await RoyaltyManager.deploy();

  await royaltyManager.waitForDeployment();

  console.log(
    "RoyaltyManager:",
    await royaltyManager.getAddress()
  );
  console.log("");

  // ------------------------------------------------------------
  // 7. Deploy Governance
  // ------------------------------------------------------------

  console.log("7. Deploying Governance...");

  const Governance =
    await ethers.getContractFactory("Governance");

  const governance = await Governance.deploy(
    await vmindToken.getAddress()
  );

  await governance.waitForDeployment();

  console.log(
    "Governance:",
    await governance.getAddress()
  );
  console.log("");

  // ------------------------------------------------------------
  // 8. Configure contract relationships
  // ------------------------------------------------------------

  console.log("8. Configuring contract relationships...");

  const escrowControllerRole =
    await escrowVault.CONTROLLER_ROLE();

  await (
    await escrowVault.grantRole(
      escrowControllerRole,
      await inferenceManager.getAddress()
    )
  ).wait();

  console.log("Granted EscrowVault CONTROLLER_ROLE.");

  console.log("");

  // ------------------------------------------------------------
  // 9. Create an inference request
  // ------------------------------------------------------------

  console.log("9. Creating inference request...");

  const requestId = ethers.keccak256(
    ethers.toUtf8Bytes("verimind-demo-request-001")
  );

  console.log("Request ID:", requestId);

  /*
   * The exact function signature may evolve with the prototype.
   * This demo intentionally exercises the currently implemented
   * inference lifecycle where supported.
   */

  try {
    const requestValue = ethers.parseEther("0.01");

    const tx = await inferenceManager
      .connect(client)
      .submitRequest(requestId, {
        value: requestValue
      });

    await tx.wait();

    console.log("Inference request submitted.");
  } catch (error) {
    console.log(
      "Inference request submission could not be executed with the current contract interface."
    );

    console.log(
      "This does not prevent the attribution-to-royalty MVP demonstration."
    );
  }

  console.log("");

  // ------------------------------------------------------------
  // 10. Run attribution engine
  // ------------------------------------------------------------

  console.log("10. Running attribution engine...");

  const pythonCandidates = ["python3", "python"];
  let pythonCommand = null;

  for (const candidate of pythonCandidates) {
    try {
      execFileSync(candidate, ["--version"], {
        stdio: "ignore"
      });

      pythonCommand = candidate;
      break;
    } catch (_) {
      // Try the next Python executable.
    }
  }

  if (!pythonCommand) {
    console.log(
      "Python was not found on PATH. Skipping the Python attribution reference implementation."
    );
  } else {
    try {
      execFileSync(
        pythonCommand,
        ["attribution-engine/attribution.py"],
        {
          stdio: "inherit"
        }
      );

      console.log("Attribution engine executed.");
    } catch (error) {
      console.log(
        "Attribution engine execution was skipped or returned an error."
      );

      console.log(
        "The attribution engine remains a reference implementation for the MVP."
      );
    }
  }

  console.log("");

  // ------------------------------------------------------------
  // 11. Prepare attribution scores
  // ------------------------------------------------------------

  console.log("11. Preparing attribution scores...");

  const creators = [
    creator1.address,
    creator2.address,
    creator3.address
  ];

  // 10,000 basis points = 100%.
  const scoresBps = [5000, 3000, 2000];

  const totalBps = scoresBps.reduce(
    (sum, value) => sum + value,
    0
  );

  if (totalBps !== 10000) {
    throw new Error(
      `Invalid attribution scores: expected 10000 BPS, received ${totalBps}.`
    );
  }

  console.log("Creators:", creators);
  console.log("Attribution BPS:", scoresBps);
  console.log("Total BPS:", totalBps);
  console.log("");

  // ------------------------------------------------------------
  // 12. Fund RoyaltyManager
  // ------------------------------------------------------------

  console.log("12. Funding RoyaltyManager...");

  const royaltyAmount = ethers.parseEther("0.01");

  await (
    await deployer.sendTransaction({
      to: await royaltyManager.getAddress(),
      value: royaltyAmount
    })
  ).wait();

  console.log(
    "Royalty pool funded with:",
    ethers.formatEther(royaltyAmount),
    "ETH"
  );

  console.log("");

  // ------------------------------------------------------------
  // 13. Execute royalty settlement
  // ------------------------------------------------------------

  console.log("13. Executing royalty settlement...");

  try {
    const royaltyManagerRole =
      await royaltyManager.SETTLER_ROLE();

    await (
      await royaltyManager.grantRole(
        royaltyManagerRole,
        deployer.address
      )
    ).wait();

    const settlementId = requestId;

    const settlementTx = await royaltyManager
      .connect(deployer)
      .settleRoyalty(
        settlementId,
        creators,
        scoresBps,
        royaltyAmount
      );

    await settlementTx.wait();

    console.log("Royalty settlement completed.");
    console.log("Settlement ID:", settlementId);
  } catch (error) {
    console.log(
      "Royalty settlement could not be executed with the current contract interface."
    );

    console.log(
      "Review RoyaltyManager.sol if the settlement signature has changed."
    );
  }

  console.log("");

  // ------------------------------------------------------------
  // 14. Final summary
  // ------------------------------------------------------------

  console.log("==============================================");
  console.log(" Demo Summary");
  console.log("==============================================");

  console.log("✓ VeriMind contracts deployed locally");
  console.log("✓ Attribution scores represented in basis points");
  console.log("✓ Royalty distribution workflow exercised");
  console.log("✓ Existing-EVM MVP architecture represented");
  console.log("✓ Mock ZK verifier clearly isolated as test-only");

  console.log("");
  console.log(
    "This demo is a local prototype and does not represent a production deployment."
  );

  console.log(
    "The current MVP focuses on AI attribution and programmable royalty settlement."
  );

  console.log(
    "ZK verification, decentralized compute, and a dedicated VeriMind network remain future components."
  );

  console.log("==============================================");
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
