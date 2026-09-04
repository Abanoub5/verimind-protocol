const { ethers } = require("hardhat");
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const MIN_STAKE = ethers.parseUnits("1000", 18);
const UNSTAKE_COOLDOWN = 7 * 24 * 60 * 60;
const PROCESSING_TIMEOUT = 60 * 60;

const GOVERNANCE_VOTING_PERIOD = 7 * 24 * 60 * 60;
const GOVERNANCE_QUORUM = ethers.parseUnits("10000000", 18);

const MAX_FEE = ethers.parseUnits("10", 18);
const ROYALTY_AMOUNT = ethers.parseUnits("10", 18);

const DEMO_REQUEST_ID = ethers.keccak256(
  ethers.toUtf8Bytes("verimind-demo-request-001")
);

const DEMO_PROMPT_HASH = ethers.keccak256(
  ethers.toUtf8Bytes("verimind-demo-prompt")
);

function findPython() {
  for (const candidate of ["python3", "python"]) {
    try {
      execFileSync(candidate, ["--version"], {
        stdio: "ignore",
      });

      return candidate;
    } catch (_) {
      // Try next candidate.
    }
  }

  return null;
}

function parseAttributionOutput(rawOutput) {
  /*
   * Expected bridge output:
   *
   * [
   *   {
   *     "address": "0x...",
   *     "basis_points": 5000
   *   },
   *   ...
   * ]
   *
   * The parser also accepts:
   *
   * {
   *   "attributions": [
   *     {
   *       "address": "0x...",
   *       "basis_points": 5000
   *     }
   *   ]
   * }
   */

  const trimmed = rawOutput.trim();

  if (!trimmed) {
    throw new Error("Attribution bridge returned empty output.");
  }

  const lines = trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  // Prefer the last JSON-looking line because Python tools may print logs.
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(lines[i]);

      const values = Array.isArray(parsed)
        ? parsed
        : parsed.attributions;

      if (Array.isArray(values)) {
        return values;
      }
    } catch (_) {
      // Continue searching for JSON output.
    }
  }

  // Fallback: attempt to parse the entire output.
  try {
    const parsed = JSON.parse(trimmed);

    const values = Array.isArray(parsed)
      ? parsed
      : parsed.attributions;

    if (Array.isArray(values)) {
      return values;
    }
  } catch (_) {
    // Fall through to the explicit error below.
  }

  throw new Error(
    "Could not parse attribution bridge output as JSON."
  );
}

function validateAttribution(attributions) {
  if (!Array.isArray(attributions)) {
    throw new Error("Attribution output must be an array.");
  }

  if (attributions.length === 0) {
    throw new Error("Attribution output is empty.");
  }

  const creators = [];
  const scoresBps = [];

  for (const entry of attributions) {
    const address =
      entry.address ??
      entry.creator ??
      entry.creator_address;

    const rawBps =
      entry.basis_points ??
      entry.bps ??
      entry.score_bps;

    if (!address) {
      throw new Error(
        "Attribution entry is missing creator address."
      );
    }

    if (rawBps === undefined || rawBps === null) {
      throw new Error(
        `Attribution entry for ${address} is missing basis points.`
      );
    }

    let checksumAddress;

    try {
      checksumAddress = ethers.getAddress(address);
    } catch (_) {
      throw new Error(
        `Invalid creator address in attribution output: ${address}`
      );
    }

    const basisPoints = Number(rawBps);

    if (
      !Number.isInteger(basisPoints) ||
      basisPoints <= 0 ||
      basisPoints > 10000
    ) {
      throw new Error(
        `Invalid basis points for ${checksumAddress}: ${rawBps}`
      );
    }

    if (creators.includes(checksumAddress)) {
      throw new Error(
        `Duplicate creator in attribution output: ${checksumAddress}`
      );
    }

    creators.push(checksumAddress);
    scoresBps.push(basisPoints);
  }

  const totalBps = scoresBps.reduce(
    (sum, value) => sum + value,
    0
  );

  if (totalBps !== 10000) {
    throw new Error(
      `Invalid attribution vector: expected 10000 BPS, received ${totalBps}.`
    );
  }

  return {
    creators,
    scoresBps,
    totalBps,
  };
}

async function runAttributionBridge(pythonCommand) {
  const bridgePath = path.join(
    __dirname,
    "attribution_bridge.py"
  );

  if (!fs.existsSync(bridgePath)) {
    throw new Error(
      `Attribution bridge not found: ${bridgePath}`
    );
  }

  /*
   * The bridge is expected to print JSON attribution results
   * to stdout.
   */
  const output = execFileSync(
    pythonCommand,
    [bridgePath],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    }
  );

  return parseAttributionOutput(output);
}

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
    client,
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

  const vmindAddress =
    await vmindToken.getAddress();

  console.log("VMINDToken:", vmindAddress);
  console.log("");

  // --------------------------------------------------------------------------
  // 2. Deploy MockZKVerifier
  // --------------------------------------------------------------------------

  console.log("2. Deploying MockZKVerifier...");

  const MockZKVerifier =
    await ethers.getContractFactory("MockZKVerifier");

  const mockVerifier =
    await MockZKVerifier.deploy();

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

  const stakingManager =
    await StakingManager.deploy(
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

  const escrowVault =
    await EscrowVault.deploy(vmindAddress);

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

  const inferenceManager =
    await InferenceManager.deploy(
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

  const royaltyManager =
    await RoyaltyManager.deploy(vmindAddress);

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

  const governance =
    await Governance.deploy(
      vmindAddress,
      GOVERNANCE_VOTING_PERIOD,
      GOVERNANCE_QUORUM
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
    ROYALTY_AMOUNT;

  await (
    await vmindToken
      .connect(communityPool)
      .transfer(
        client.address,
        clientFunding
      )
  ).wait();

  await (
    await vmindToken
      .connect(communityPool)
      .transfer(
        creator1.address,
        nodeFunding
      )
  ).wait();

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
    ethers.formatUnits(
      clientFunding,
      18
    ),
    "VMIND"
  );

  console.log(
    "Creator 1 funded:",
    ethers.formatUnits(
      nodeFunding,
      18
    ),
    "VMIND"
  );

  console.log(
    "RoyaltyManager funded:",
    ethers.formatUnits(
      royaltyFunding,
      18
    ),
    "VMIND"
  );

  console.log("");

  // --------------------------------------------------------------------------
  // 10. Stake compute node
  // --------------------------------------------------------------------------

  console.log("10. Staking compute node...");

  await (
    await vmindToken
      .connect(creator1)
      .approve(
        stakingAddress,
        MIN_STAKE
      )
  ).wait();

  await (
    await stakingManager
      .connect(creator1)
      .stake(MIN_STAKE)
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
  // 11. Run attribution bridge
  // --------------------------------------------------------------------------

  console.log(
    "11. Running attribution engine through bridge..."
  );

  const pythonCommand =
    findPython();

  if (!pythonCommand) {
    throw new Error(
      "Python was not found on PATH. The attribution bridge is required for this E2E demo."
    );
  }

  console.log(
    "Python:",
    pythonCommand
  );

  let attributionOutput;

  try {
    attributionOutput =
      await runAttributionBridge(
        pythonCommand
      );
  } catch (error) {
    throw new Error(
      `Attribution bridge failed: ${error.message}`
    );
  }

  const {
    creators,
    scoresBps,
    totalBps,
  } =
    validateAttribution(
      attributionOutput
    );

  console.log(
    "✓ Attribution engine produced a valid attribution vector."
  );

  console.log("");

  // --------------------------------------------------------------------------
  // 12. Display attribution vector
  // --------------------------------------------------------------------------

  console.log(
    "12. Attribution scores:"
  );

  for (
    let i = 0;
    i < creators.length;
    i++
  ) {
    console.log(
      `Creator ${i + 1}:`,
      creators[i],
      "-",
      scoresBps[i],
      "BPS"
    );
  }

  console.log(
    "Total:",
    totalBps,
    "BPS"
  );

  console.log("");

  // --------------------------------------------------------------------------
  // 13. Submit inference request
  // --------------------------------------------------------------------------

  console.log(
    "13. Submitting inference request..."
  );

  await (
    await vmindToken
      .connect(client)
      .approve(
        escrowAddress,
        MAX_FEE
      )
  ).wait();

  await (
    await inferenceManager
      .connect(client)
      .submitRequest(
        DEMO_REQUEST_ID,
        MAX_FEE,
        DEMO_PROMPT_HASH
      )
  ).wait();

  console.log(
    "✓ Inference request submitted."
  );

  console.log(
    "Request ID:",
    DEMO_REQUEST_ID
  );

  console.log(
    "Max fee:",
    ethers.formatUnits(
      MAX_FEE,
      18
    ),
    "VMIND"
  );

  console.log("");

  // --------------------------------------------------------------------------
  // 14. Assign compute node
  // --------------------------------------------------------------------------

  console.log(
    "14. Assigning compute node..."
  );

  await (
    await inferenceManager
      .connect(creator1)
      .assignNode(
        DEMO_REQUEST_ID
      )
  ).wait();

  console.log(
    "✓ Creator 1 assigned as compute node."
  );

  console.log("");

  // --------------------------------------------------------------------------
  // 15. Submit mock ZK proof
  // --------------------------------------------------------------------------

  console.log(
    "15. Submitting mock ZK proof..."
  );

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
        DEMO_REQUEST_ID,
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

  console.log(
    "16. Checking inference state..."
  );

  const request =
    await inferenceManager.requests(
      DEMO_REQUEST_ID
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

  console.log(
    "17. Settling inference request..."
  );

  await (
    await inferenceManager
      .connect(deployer)
      .settle(
        DEMO_REQUEST_ID,
        MAX_FEE
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

  console.log(
    "18. Executing attribution-based royalty distribution..."
  );

  await (
    await royaltyManager
      .connect(deployer)
      .distributeRoyalties(
        DEMO_REQUEST_ID,
        ROYALTY_AMOUNT,
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

  console.log(
    "19. Final balances..."
  );

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
    ethers.formatUnits(
      clientBalance,
      18
    ),
    "VMIND"
  );

  console.log(
    "Creator 1:",
    ethers.formatUnits(
      creator1Balance,
      18
    ),
    "VMIND"
  );

  console.log(
    "Creator 2:",
    ethers.formatUnits(
      creator2Balance,
      18
    ),
    "VMIND"
  );

  console.log(
    "Creator 3:",
    ethers.formatUnits(
      creator3Balance,
      18
    ),
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

  console.log(
    "20. Final verification..."
  );

  const finalRequest =
    await inferenceManager.requests(
      DEMO_REQUEST_ID
    );

  if (finalRequest.state !== 5n) {
    throw new Error(
      `Expected SETTLED state (5), received ${finalRequest.state}.`
    );
  }

  const royaltySettled =
    await royaltyManager.settled(
      DEMO_REQUEST_ID
    );

  if (!royaltySettled) {
    throw new Error(
      "Royalty settlement flag was not recorded."
    );
  }

  const remainingEscrow =
    await escrowVault.escrowed(
      DEMO_REQUEST_ID
    );

  if (remainingEscrow !== 0n) {
    throw new Error(
      `Expected zero remaining escrow, received ${remainingEscrow}.`
    );
  }

  const finalRoyaltyManagerBalance =
    await vmindToken.balanceOf(
      royaltyAddress
    );

  if (
    finalRoyaltyManagerBalance !== 0n
  ) {
    throw new Error(
      `Expected RoyaltyManager balance to be 0, received ${ethers.formatUnits(
        finalRoyaltyManagerBalance,
        18
      )} VMIND.`
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

  console.log(
    "✓ RoyaltyManager distributed the full royalty amount."
  );

  console.log("");

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------

  console.log(
    "=============================================="
  );

  console.log(
    " Demo Completed Successfully"
  );

  console.log(
    "=============================================="
  );

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
    "4. Off-chain attribution engine execution"
  );

  console.log(
    "5. Attribution bridge output validation"
  );

  console.log(
    "6. Inference request submission"
  );

  console.log(
    "7. Compute-node assignment"
  );

  console.log(
    "8. Mock ZK proof submission"
  );

  console.log(
    "9. Inference verification"
  );

  console.log(
    "10. Inference settlement"
  );

  console.log(
    "11. Attribution-based royalty distribution"
  );

  console.log(
    "12. Final state and balance verification"
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
    "- Attribution scoring is computed off-chain."
  );

  console.log(
    "- Attribution results are validated before on-chain royalty settlement."
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
