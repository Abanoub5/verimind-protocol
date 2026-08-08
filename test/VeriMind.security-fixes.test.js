/**
 * test/VeriMind.security-fixes.test.js
 *
 * Focused tests for two specific fixes made to the EXISTING contracts ahead of
 * public release:
 *
 *   1. StakingManager.slash() now applies against a node's TOTAL collateral
 *      (active `amount` + `pendingUnstake`), so a node cannot evade slashing
 *      by calling requestUnstake() on its full stake beforehand.
 *   2. RoyaltyManager.distributeRoyalties() now rejects a second settlement
 *      of the same requestId (replay/idempotency protection).
 *
 * This file does not modify or replace test/VeriMind.test.js or
 * test/VeriMind.coverage.test.js — it is additive.
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VeriMind Protocol — security fixes", function () {
  const MIN_STAKE = ethers.parseUnits("1000", 18);
  const UNSTAKE_COOLDOWN = 7 * 24 * 60 * 60;

  let deployer, treasury, node, creatorA, creatorB;
  let vmind, staking, royalty;

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    [deployer, treasury, node, creatorA, creatorB] = signers;

    const VMINDToken = await ethers.getContractFactory("VMINDToken");
    vmind = await VMINDToken.deploy(
      deployer.address, deployer.address, deployer.address, deployer.address, treasury.address
    );

    const StakingManager = await ethers.getContractFactory("StakingManager");
    staking = await StakingManager.deploy(await vmind.getAddress(), MIN_STAKE, UNSTAKE_COOLDOWN);

    const RoyaltyManager = await ethers.getContractFactory("RoyaltyManager");
    royalty = await RoyaltyManager.deploy(await vmind.getAddress());
    await royalty.grantRole(await royalty.SETTLER_ROLE(), deployer.address);

    await vmind.connect(treasury).transfer(node.address, ethers.parseUnits("10000", 18));
  });

  // ---------------------------------------------------------------------
  // ISSUE 1 — StakingManager slash() vs. pendingUnstake
  // ---------------------------------------------------------------------
  describe("Staking / slashing interaction fix", function () {
    it("1. normal unstake/withdraw still works exactly as before (no slash involved)", async function () {
      await vmind.connect(node).approve(await staking.getAddress(), MIN_STAKE);
      await staking.connect(node).stake(MIN_STAKE);

      await staking.connect(node).requestUnstake(MIN_STAKE);
      expect((await staking.stakes(node.address)).amount).to.equal(0);
      expect((await staking.stakes(node.address)).pendingUnstake).to.equal(MIN_STAKE);

      await expect(staking.connect(node).withdrawUnstaked()).to.be.revertedWith("cooldown active");

      await ethers.provider.send("evm_increaseTime", [UNSTAKE_COOLDOWN + 1]);
      await ethers.provider.send("evm_mine");

      const before = await vmind.balanceOf(node.address);
      await staking.connect(node).withdrawUnstaked();
      const after = await vmind.balanceOf(node.address);

      expect(after - before).to.equal(MIN_STAKE);
      expect((await staking.stakes(node.address)).pendingUnstake).to.equal(0);
    });

    it("2. slashing reaches collateral that is mid-cooldown (pendingUnstake)", async function () {
      await vmind.connect(node).approve(await staking.getAddress(), MIN_STAKE);
      await staking.connect(node).stake(MIN_STAKE);

      // Node moves its entire stake into the unstake cooldown BEFORE any slash.
      await staking.connect(node).requestUnstake(MIN_STAKE);
      expect((await staking.stakes(node.address)).amount).to.equal(0);
      expect((await staking.stakes(node.address)).pendingUnstake).to.equal(MIN_STAKE);

      await staking.grantRole(await staking.SLASHER_ROLE(), deployer.address);

      // Slash 50% (5000 bps). Under the OLD logic this would have computed
      // penalty = amount * bps / 10000 = 0 * 0.5 = 0, since `amount` is empty.
      // Under the FIX, penalty is computed against total (amount + pendingUnstake).
      await staking.slash(node.address, 5000, "misconduct detected after unstake request");

      const s = await staking.stakes(node.address);
      const expectedPenalty = MIN_STAKE / 2n;
      expect(s.amount).to.equal(0); // was already 0, untouched further
      expect(s.pendingUnstake).to.equal(MIN_STAKE - expectedPenalty); // penalty came out of pendingUnstake
    });

    it("3. a node cannot bypass slashing by requesting a full unstake beforehand", async function () {
      await vmind.connect(node).approve(await staking.getAddress(), MIN_STAKE);
      await staking.connect(node).stake(MIN_STAKE);
      await staking.connect(node).requestUnstake(MIN_STAKE);

      await staking.grantRole(await staking.SLASHER_ROLE(), deployer.address);

      // Full (100%) slash for misconduct, even though the node pre-emptively
      // moved its entire stake into pendingUnstake.
      await staking.slash(node.address, 10_000, "attempted evasion via requestUnstake");

      expect((await staking.stakes(node.address)).pendingUnstake).to.equal(0);

      await ethers.provider.send("evm_increaseTime", [UNSTAKE_COOLDOWN + 1]);
      await ethers.provider.send("evm_mine");

      // Nothing left to withdraw — the evasion attempt did not preserve any funds.
      await expect(staking.connect(node).withdrawUnstaked()).to.be.revertedWith("nothing pending");
    });

    it("slash correctly splits a penalty across BOTH active amount and pendingUnstake when neither alone covers it", async function () {
      const stakeAmount = ethers.parseUnits("1000", 18);
      await vmind.connect(node).approve(await staking.getAddress(), stakeAmount);
      await staking.connect(node).stake(stakeAmount);

      // Move only part of the stake into pendingUnstake, leaving some active.
      const unstakePortion = ethers.parseUnits("400", 18); // -> amount=600, pendingUnstake=400
      await staking.connect(node).requestUnstake(unstakePortion);

      await staking.grantRole(await staking.SLASHER_ROLE(), deployer.address);

      // Slash 80% of total (1000 * 0.8 = 800). Active amount (600) alone is not
      // enough, so the remaining 200 must come from pendingUnstake (400 -> 200).
      await staking.slash(node.address, 8000, "large penalty spanning both buckets");

      const s = await staking.stakes(node.address);
      expect(s.amount).to.equal(0); // 600 fully consumed
      expect(s.pendingUnstake).to.equal(ethers.parseUnits("200", 18)); // 400 - 200 remainder
    });
  });

  // ---------------------------------------------------------------------
  // ISSUE 2 — RoyaltyManager replay protection
  // ---------------------------------------------------------------------
  describe("Royalty settlement replay protection fix", function () {
    it("settled(requestId) is false before distribution and true after", async function () {
      const requestId = ethers.id("replay-req-001");
      expect(await royalty.settled(requestId)).to.equal(false);

      const pool = ethers.parseUnits("10", 18);
      await vmind.connect(treasury).transfer(await royalty.getAddress(), pool);
      await royalty.distributeRoyalties(requestId, pool, [creatorA.address], [10000]);

      expect(await royalty.settled(requestId)).to.equal(true);
    });

    it("reverts a second distributeRoyalties() call for the same requestId", async function () {
      const requestId = ethers.id("replay-req-002");
      const pool = ethers.parseUnits("10", 18);
      await vmind.connect(treasury).transfer(await royalty.getAddress(), pool * 2n);

      await royalty.distributeRoyalties(requestId, pool, [creatorA.address], [10000]);

      await expect(
        royalty.distributeRoyalties(requestId, pool, [creatorA.address], [10000])
      ).to.be.revertedWith("requestId already settled");
    });

    it("rejects replay even with different creators/scores on the second attempt", async function () {
      const requestId = ethers.id("replay-req-003");
      const pool = ethers.parseUnits("10", 18);
      await vmind.connect(treasury).transfer(await royalty.getAddress(), pool * 2n);

      await royalty.distributeRoyalties(requestId, pool, [creatorA.address], [10000]);

      // Attempting to "correct" or re-settle the same requestId with a different
      // split must still be rejected — the replay guard is keyed on requestId alone.
      await expect(
        royalty.distributeRoyalties(requestId, pool, [creatorA.address, creatorB.address], [5000, 5000])
      ).to.be.revertedWith("requestId already settled");
    });

    it("a different requestId is unaffected by a prior settlement", async function () {
      const requestIdA = ethers.id("replay-req-004a");
      const requestIdB = ethers.id("replay-req-004b");
      const pool = ethers.parseUnits("10", 18);
      await vmind.connect(treasury).transfer(await royalty.getAddress(), pool * 2n);

      await royalty.distributeRoyalties(requestIdA, pool, [creatorA.address], [10000]);
      await expect(royalty.distributeRoyalties(requestIdB, pool, [creatorB.address], [10000])).to.not.be.reverted;
    });

    it("does not mark settled if the call reverts on validation (e.g. bad scores sum)", async function () {
      const requestId = ethers.id("replay-req-005");
      await expect(
        royalty.distributeRoyalties(requestId, ethers.parseUnits("10", 18), [creatorA.address], [9000])
      ).to.be.revertedWith("scores must sum to 10000 bps");

      // Since the first attempt reverted (bad input), requestId must NOT be
      // marked settled, and a valid retry with the same id must succeed.
      expect(await royalty.settled(requestId)).to.equal(false);

      const pool = ethers.parseUnits("10", 18);
      await vmind.connect(treasury).transfer(await royalty.getAddress(), pool);
      await expect(
        royalty.distributeRoyalties(requestId, pool, [creatorA.address], [10000])
      ).to.not.be.reverted;
    });
  });
});
