const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VeriMind Protocol — end-to-end PoC", function () {
  const ONE = ethers.parseUnits("1", 18);
  const MIN_STAKE = ethers.parseUnits("1000", 18);
  const UNSTAKE_COOLDOWN = 7 * 24 * 60 * 60;
  const PROCESSING_TIMEOUT = 60 * 60;

  let deployer;
  let communityPool;
  let ecosystemPool;
  let seedVesting;
  let teamVesting;
  let treasury;

  let client;
  let computeNode;
  let badNode;
  let creatorA;
  let creatorB;

  let vmind;
  let staking;
  let escrow;
  let mockVerifier;
  let inference;
  let royalty;

  beforeEach(async function () {
    [
      deployer,
      communityPool,
      ecosystemPool,
      seedVesting,
      teamVesting,
      treasury,
      client,
      computeNode,
      badNode,
      creatorA,
      creatorB,
    ] = await ethers.getSigners();

    // -----------------------------------------------------------------------
    // Deploy VMIND token
    // -----------------------------------------------------------------------

    const VMINDToken = await ethers.getContractFactory("VMINDToken");

    vmind = await VMINDToken.deploy(
      communityPool.address,
      ecosystemPool.address,
      seedVesting.address,
      teamVesting.address,
      treasury.address
    );

    // -----------------------------------------------------------------------
    // Deploy staking manager
    // -----------------------------------------------------------------------

    const StakingManager =
      await ethers.getContractFactory("StakingManager");

    staking = await StakingManager.deploy(
      await vmind.getAddress(),
      MIN_STAKE,
      UNSTAKE_COOLDOWN
    );

    // -----------------------------------------------------------------------
    // Deploy escrow vault
    // -----------------------------------------------------------------------

    const EscrowVault =
      await ethers.getContractFactory("EscrowVault");

    escrow = await EscrowVault.deploy(
      await vmind.getAddress()
    );

    // -----------------------------------------------------------------------
    // Deploy test-only ZK verifier
    // -----------------------------------------------------------------------

    const MockZKVerifier =
      await ethers.getContractFactory("MockZKVerifier");

    mockVerifier = await MockZKVerifier.deploy();

    // -----------------------------------------------------------------------
    // Deploy inference manager
    // -----------------------------------------------------------------------

    const InferenceManager =
      await ethers.getContractFactory("InferenceManager");

    inference = await InferenceManager.deploy(
      await escrow.getAddress(),
      await staking.getAddress(),
      await mockVerifier.getAddress(),
      PROCESSING_TIMEOUT
    );

    // -----------------------------------------------------------------------
    // Deploy royalty manager
    // -----------------------------------------------------------------------

    const RoyaltyManager =
      await ethers.getContractFactory("RoyaltyManager");

    royalty = await RoyaltyManager.deploy(
      await vmind.getAddress()
    );

    // -----------------------------------------------------------------------
    // Configure protocol roles
    // -----------------------------------------------------------------------

    await escrow.grantRole(
      await escrow.CONTROLLER_ROLE(),
      await inference.getAddress()
    );

    await staking.grantRole(
      await staking.SLASHER_ROLE(),
      await inference.getAddress()
    );

    // -----------------------------------------------------------------------
    // Fund test accounts
    // -----------------------------------------------------------------------

    const testAccountFunding = ethers.parseUnits("10000", 18);

    await vmind
      .connect(treasury)
      .transfer(
        client.address,
        testAccountFunding
      );

    await vmind
      .connect(treasury)
      .transfer(
        computeNode.address,
        testAccountFunding
      );

    await vmind
      .connect(treasury)
      .transfer(
        badNode.address,
        testAccountFunding
      );

    // -----------------------------------------------------------------------
    // Stake eligible compute node
    // -----------------------------------------------------------------------

    await vmind
      .connect(computeNode)
      .approve(
        await staking.getAddress(),
        MIN_STAKE
      );

    await staking
      .connect(computeNode)
      .stake(MIN_STAKE);

    // -----------------------------------------------------------------------
    // Stake adversarial node
    // -----------------------------------------------------------------------

    await vmind
      .connect(badNode)
      .approve(
        await staking.getAddress(),
        MIN_STAKE
      );

    await staking
      .connect(badNode)
      .stake(MIN_STAKE);
  });

  // =========================================================================
  // TOKENOMICS
  // =========================================================================

  describe("Tokenomics (Section 9.1)", function () {
    it("mints the fixed 1B supply split across the five allocations", async function () {
      const total = await vmind.TOTAL_SUPPLY();

      expect(total).to.equal(
        ethers.parseUnits("1000000000", 18)
      );

      expect(
        await vmind.balanceOf(communityPool.address)
      ).to.equal(
        (total * 40n) / 100n
      );

      expect(
        await vmind.balanceOf(ecosystemPool.address)
      ).to.equal(
        (total * 20n) / 100n
      );

      expect(
        await vmind.balanceOf(seedVesting.address)
      ).to.equal(
        (total * 15n) / 100n
      );

      expect(
        await vmind.balanceOf(teamVesting.address)
      ).to.equal(
        (total * 15n) / 100n
      );

      expect(
        await vmind.balanceOf(treasury.address)
      ).to.equal(
        (total * 10n) / 100n
      );
    });
  });

  // =========================================================================
  // INFERENCE MANAGER — HAPPY PATH
  // =========================================================================

  describe(
    "Happy path: submit -> assign -> valid proof -> verify -> settle (Section 2.2, 7)",
    function () {
      it("moves a request through the full state machine and pays the compute node", async function () {
        const requestId = ethers.id("req-001");
        const maxFee = ethers.parseUnits("50", 18);
        const promptHash = ethers.id("prompt-001");

        // Client authorizes escrow to pull the inference fee.
        await vmind
          .connect(client)
          .approve(
            await escrow.getAddress(),
            maxFee
          );

        // Submit inference request.
        await inference
          .connect(client)
          .submitRequest(
            requestId,
            maxFee,
            promptHash
          );

        expect(
          (await inference.requests(requestId)).state
        ).to.equal(1n);

        // Eligible compute node assigns itself.
        await inference
          .connect(computeNode)
          .assignNode(requestId);

        expect(
          (await inference.requests(requestId)).state
        ).to.equal(2n);

        // Mock proof for the PoC.
        const proof = "0x1234";

        const publicInputs =
          ethers.AbiCoder.defaultAbiCoder().encode(
            ["bytes32"],
            [promptHash]
          );

        await inference
          .connect(computeNode)
          .submitProof(
            requestId,
            proof,
            publicInputs
          );

        expect(
          (await inference.requests(requestId)).state
        ).to.equal(4n);

        // InferenceManager requires the full maxFee for settlement.
        const nodePayment = maxFee;

        const balanceBefore =
          await vmind.balanceOf(
            computeNode.address
          );

        await inference.settle(
          requestId,
          nodePayment
        );

        const balanceAfter =
          await vmind.balanceOf(
            computeNode.address
          );

        expect(
          (await inference.requests(requestId)).state
        ).to.equal(5n);

        expect(
          balanceAfter - balanceBefore
        ).to.equal(nodePayment);
      });
    }
  );

  // =========================================================================
  // INFERENCE MANAGER — INVALID PROOF
  // =========================================================================

  describe(
    "Adversarial path: invalid proof triggers slashing + client refund (Section 3.2, 8)",
    function () {
      it("slashes the node's full collateral and refunds the client on an invalid proof", async function () {
        const requestId = ethers.id("req-002");
        const maxFee = ethers.parseUnits("50", 18);

        // Client funds the inference request.
        await vmind
          .connect(client)
          .approve(
            await escrow.getAddress(),
            maxFee
          );

        await inference
          .connect(client)
          .submitRequest(
            requestId,
            maxFee,
            ethers.id("prompt-002")
          );

        // Adversarial node assigns itself.
        await inference
          .connect(badNode)
          .assignNode(requestId);

        const clientBalanceBefore =
          await vmind.balanceOf(
            client.address
          );

        // Empty proof is rejected by MockZKVerifier.
        await inference
          .connect(badNode)
          .submitProof(
            requestId,
            "0x",
            "0x"
          );

        // Request must enter FAILED state.
        expect(
          (await inference.requests(requestId)).state
        ).to.equal(6n);

        // Full collateral is slashed.
        expect(
          (await staking.stakes(badNode.address)).amount
        ).to.equal(0n);

        // Client receives the escrowed amount back.
        const clientBalanceAfter =
          await vmind.balanceOf(
            client.address
          );

        expect(
          clientBalanceAfter - clientBalanceBefore
        ).to.equal(maxFee);
      });
    }
  );

  // =========================================================================
  // NODE ELIGIBILITY
  // =========================================================================

  describe("Rejects ineligible nodes (Section 3.1)", function () {
    it("reverts if an unstaked address tries to assign itself a request", async function () {
      const requestId = ethers.id("req-003");
      const maxFee = ethers.parseUnits("10", 18);

      // Client funds the request.
      await vmind
        .connect(client)
        .approve(
          await escrow.getAddress(),
          maxFee
        );

      await inference
        .connect(client)
        .submitRequest(
          requestId,
          maxFee,
          ethers.id("prompt-003")
        );

      // Client has VMIND but is not a staked node.
      await expect(
        inference
          .connect(client)
          .assignNode(requestId)
      ).to.be.revertedWith(
        "node not eligible"
      );
    });
  });

  // =========================================================================
  // ROYALTY MANAGER
  // =========================================================================

  describe("RoyaltyManager (Section 5.1)", function () {
    it("distributes a royalty pool across creators proportional to their basis-point scores", async function () {
      const poolAmount =
        ethers.parseUnits("100", 18);

      // Fund the royalty manager.
      await vmind
        .connect(treasury)
        .transfer(
          await royalty.getAddress(),
          poolAmount
        );

      // Configure the deployer as the PoC settlement authority.
      await royalty.grantRole(
        await royalty.SETTLER_ROLE(),
        deployer.address
      );

      const creators = [
        creatorA.address,
        creatorB.address,
      ];

      // 89.33% + 10.67% = 100%.
      const scoresBps = [
        8933,
        1067,
      ];

      await royalty.distributeRoyalties(
        ethers.id("req-004"),
        poolAmount,
        creators,
        scoresBps
      );

      expect(
        await vmind.balanceOf(
          creatorA.address
        )
      ).to.equal(
        (poolAmount * 8933n) / 10000n
      );

      expect(
        await vmind.balanceOf(
          creatorB.address
        )
      ).to.equal(
        (poolAmount * 1067n) / 10000n
      );
    });

    it("reverts if scores do not sum to 10000 bps", async function () {
      await royalty.grantRole(
        await royalty.SETTLER_ROLE(),
        deployer.address
      );

      await expect(
        royalty.distributeRoyalties(
          ethers.id("req-005"),
          ONE,
          [creatorA.address],
          [9000]
        )
      ).to.be.revertedWith(
        "scores must sum to 10000 bps"
      );
    });
  });

  // =========================================================================
  // STAKING MANAGER
  // =========================================================================

  describe(
    "StakingManager unstake cooldown (Section 3)",
    function () {
      it("prevents withdrawal before the cooldown period elapses", async function () {
        // Request unstake.
        await staking
          .connect(computeNode)
          .requestUnstake(MIN_STAKE);

        // Withdrawal must fail while cooldown is active.
        await expect(
          staking
            .connect(computeNode)
            .withdrawUnstaked()
        ).to.be.revertedWith(
          "cooldown active"
        );

        // Advance blockchain time beyond cooldown.
        await ethers.provider.send(
          "evm_increaseTime",
          [UNSTAKE_COOLDOWN + 1]
        );

        await ethers.provider.send(
          "evm_mine"
        );

        // Withdrawal should now succeed.
        await expect(
          staking
            .connect(computeNode)
            .withdrawUnstaked()
        ).to.not.be.reverted;
      });
    }
  );
});
