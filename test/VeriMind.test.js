const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VeriMind Protocol — end-to-end PoC", function () {
  const ONE = ethers.parseUnits("1", 18);
  const MIN_STAKE = ethers.parseUnits("1000", 18);
  const UNSTAKE_COOLDOWN = 7 * 24 * 60 * 60;
  const PROCESSING_TIMEOUT = 60 * 60;

  let deployer, communityPool, ecosystemPool, seedVesting, teamVesting, treasury;
  let client, computeNode, badNode, creatorA, creatorB;
  let vmind, staking, escrow, mockVerifier, inference, royalty;

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

    const VMINDToken = await ethers.getContractFactory("VMINDToken");
    vmind = await VMINDToken.deploy(
      communityPool.address,
      ecosystemPool.address,
      seedVesting.address,
      teamVesting.address,
      treasury.address
    );

    const StakingManager = await ethers.getContractFactory("StakingManager");
    staking = await StakingManager.deploy(
      await vmind.getAddress(),
      MIN_STAKE,
      UNSTAKE_COOLDOWN
    );

    const EscrowVault = await ethers.getContractFactory("EscrowVault");
    escrow = await EscrowVault.deploy(await vmind.getAddress());

    const MockZKVerifier = await ethers.getContractFactory("MockZKVerifier");
    mockVerifier = await MockZKVerifier.deploy();

    const InferenceManager = await ethers.getContractFactory("InferenceManager");
    inference = await InferenceManager.deploy(
      await escrow.getAddress(),
      await staking.getAddress(),
      await mockVerifier.getAddress(),
      PROCESSING_TIMEOUT
    );

    const RoyaltyManager = await ethers.getContractFactory("RoyaltyManager");
    royalty = await RoyaltyManager.deploy(await vmind.getAddress());

    await escrow.grantRole(
      await escrow.CONTROLLER_ROLE(),
      await inference.getAddress()
    );

    await staking.grantRole(
      await staking.SLASHER_ROLE(),
      await inference.getAddress()
    );

    await vmind
      .connect(treasury)
      .transfer(client.address, ethers.parseUnits("10000", 18));

    await vmind
      .connect(treasury)
      .transfer(computeNode.address, ethers.parseUnits("10000", 18));

    await vmind
      .connect(treasury)
      .transfer(badNode.address, ethers.parseUnits("10000", 18));

    await vmind
      .connect(computeNode)
      .approve(await staking.getAddress(), MIN_STAKE);

    await staking.connect(computeNode).stake(MIN_STAKE);

    await vmind
      .connect(badNode)
      .approve(await staking.getAddress(), MIN_STAKE);

    await staking.connect(badNode).stake(MIN_STAKE);
  });

  describe("Tokenomics (Section 9.1)", function () {
    it("mints the fixed 1B supply split across the five allocations", async function () {
      const total = await vmind.TOTAL_SUPPLY();

      expect(total).to.equal(
        ethers.parseUnits("1000000000", 18)
      );

      expect(
        await vmind.balanceOf(communityPool.address)
      ).to.equal((total * 40n) / 100n);

      expect(
        await vmind.balanceOf(ecosystemPool.address)
      ).to.equal((total * 20n) / 100n);

      expect(
        await vmind.balanceOf(seedVesting.address)
      ).to.equal((total * 15n) / 100n);

      expect(
        await vmind.balanceOf(teamVesting.address)
      ).to.equal((total * 15n) / 100n);

      expect(
        await vmind.balanceOf(treasury.address)
      ).to.equal((total * 10n) / 100n);
    });
  });

  describe(
    "Happy path: submit -> assign -> valid proof -> verify -> settle (Section 2.2, 7)",
    function () {
      it("moves a request through the full state machine and pays the compute node", async function () {
        const requestId = ethers.id("req-001");
        const maxFee = ethers.parseUnits("50", 18);
        const promptHash = ethers.id("prompt-001");

        await vmind
          .connect(client)
          .approve(await escrow.getAddress(), maxFee);

        await inference
          .connect(client)
          .submitRequest(
            requestId,
            maxFee,
            promptHash
          );

        expect(
          (await inference.requests(requestId)).state
        ).to.equal(1);

        await inference
          .connect(computeNode)
          .assignNode(requestId);

        expect(
          (await inference.requests(requestId)).state
        ).to.equal(2);

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
        ).to.equal(4);

        // InferenceManager now requires the full maxFee.
        const nodePayment = maxFee;

        const balanceBefore =
          await vmind.balanceOf(computeNode.address);

        await inference.settle(
          requestId,
          nodePayment
        );

        const balanceAfter =
          await vmind.balanceOf(computeNode.address);

        expect(
          (await inference.requests(requestId)).state
        ).to.equal(5);

        expect(
          balanceAfter - balanceBefore
        ).to.equal(nodePayment);
      });
    }
  );

  describe(
    "Adversarial path: invalid proof triggers slashing + client refund (Section 3.2, 8)",
    function () {
      it("slashes the node's full collateral and refunds the client on an invalid proof", async function () {
        const requestId = ethers.id("req-002");
        const maxFee = ethers.parseUnits("50", 18);

        await vmind
          .connect(client)
          .approve(await escrow.getAddress(), maxFee);

        await inference
          .connect(client)
          .submitRequest(
            requestId,
            maxFee,
            ethers.id("prompt-002")
          );

        await inference
          .connect(badNode)
          .assignNode(requestId);

        const clientBalanceBefore =
          await vmind.balanceOf(client.address);

        await inference
          .connect(badNode)
          .submitProof(
            requestId,
            "0x",
            "0x"
          );

        expect(
          (await inference.requests(requestId)).state
        ).to.equal(6);

        expect(
          (await staking.stakes(badNode.address)).amount
        ).to.equal(0);

        const clientBalanceAfter =
          await vmind.balanceOf(client.address);

        expect(
          clientBalanceAfter - clientBalanceBefore
        ).to.equal(maxFee);
      });
    }
  );

  describe("Rejects ineligible nodes (Section 3.1)", function () {
    it("reverts if an unstaked address tries to assign itself a request", async function () {
      const requestId = ethers.id("req-003");
      const maxFee = ethers.parseUnits("10", 18);

      await vmind
        .connect(client)
        .approve(await escrow.getAddress(), maxFee);

      await inference
        .connect(client)
        .submitRequest(
          requestId,
          maxFee,
          ethers.id("prompt-003")
        );

      await expect(
        inference
          .connect(client)
          .assignNode(requestId)
      ).to.be.revertedWith(
        "node not eligible: insufficient stake or jailed"
      );
    });
  });

  describe("RoyaltyManager (Section 5.1)", function () {
    it("distributes a royalty pool across creators proportional to their basis-point scores", async function () {
      const poolAmount = ethers.parseUnits("100", 18);

      await vmind
        .connect(treasury)
        .transfer(
          await royalty.getAddress(),
          poolAmount
        );

      await royalty.grantRole(
        await royalty.SETTLER_ROLE(),
        deployer.address
      );

      const creators = [
        creatorA.address,
        creatorB.address,
      ];

      const scoresBps = [8933, 1067];

      await royalty.distributeRoyalties(
        ethers.id("req-004"),
        poolAmount,
        creators,
        scoresBps
      );

      expect(
        await vmind.balanceOf(creatorA.address)
      ).to.equal(
        (poolAmount * 8933n) / 10000n
      );

      expect(
        await vmind.balanceOf(creatorB.address)
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

  describe("StakingManager unstake cooldown (Section 3)", function () {
    it("prevents withdrawal before the cooldown period elapses", async function () {
      await staking
        .connect(computeNode)
        .requestUnstake(MIN_STAKE);

      await expect(
        staking
          .connect(computeNode)
          .withdrawUnstaked()
      ).to.be.revertedWith(
        "cooldown active"
      );

      await ethers.provider.send(
        "evm_increaseTime",
        [UNSTAKE_COOLDOWN + 1]
      );

      await ethers.provider.send(
        "evm_mine"
      );

      await expect(
        staking
          .connect(computeNode)
          .withdrawUnstaked()
      ).to.not.be.reverted;
    });
  });
});
