/**
 * test/VeriMind.coverage.test.js
 *
 * ADDITIONAL test coverage for the EXISTING, unmodified contracts in contracts/.
 * This file does not modify test/VeriMind.test.js — it exists alongside it to
 * close coverage gaps: authorization/role reverts, less-common state-machine
 * paths, and contracts (Governance, MockZKVerifier, and direct EscrowVault/
 * VMINDToken unit tests) not directly exercised by the original suite.
 *
 * Run together with the existing suite:
 *   npx hardhat test
 * Or in isolation:
 *   npx hardhat test test/VeriMind.coverage.test.js
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VeriMind Protocol — additional coverage", function () {
  const MIN_STAKE = ethers.parseUnits("1000", 18);
  const UNSTAKE_COOLDOWN = 7 * 24 * 60 * 60;
  const PROCESSING_TIMEOUT = 60 * 60;

  let deployer, communityPool, ecosystemPool, seedVesting, teamVesting, treasury;
  let client, computeNode, otherNode, stranger, creatorA, creatorB;
  let vmind, staking, escrow, mockVerifier, inference, royalty, governance;

  beforeEach(async function () {
    [deployer, communityPool, ecosystemPool, seedVesting, teamVesting, treasury,
      client, computeNode, otherNode, stranger, creatorA, creatorB] = await ethers.getSigners();

    const VMINDToken = await ethers.getContractFactory("VMINDToken");
    vmind = await VMINDToken.deploy(
      communityPool.address, ecosystemPool.address, seedVesting.address, teamVesting.address, treasury.address
    );

    const StakingManager = await ethers.getContractFactory("StakingManager");
    staking = await StakingManager.deploy(await vmind.getAddress(), MIN_STAKE, UNSTAKE_COOLDOWN);

    const EscrowVault = await ethers.getContractFactory("EscrowVault");
    escrow = await EscrowVault.deploy(await vmind.getAddress());

    const MockZKVerifier = await ethers.getContractFactory("MockZKVerifier");
    mockVerifier = await MockZKVerifier.deploy();

    const InferenceManager = await ethers.getContractFactory("InferenceManager");
    inference = await InferenceManager.deploy(
      await escrow.getAddress(), await staking.getAddress(), await mockVerifier.getAddress(), PROCESSING_TIMEOUT
    );

    const RoyaltyManager = await ethers.getContractFactory("RoyaltyManager");
    royalty = await RoyaltyManager.deploy(await vmind.getAddress());

    const Governance = await ethers.getContractFactory("Governance");
    governance = await Governance.deploy(
      await vmind.getAddress(),
      7 * 24 * 60 * 60,
      ethers.parseUnits("100000000", 18) // 100M VMIND quorum (10% of supply)
    );

    await escrow.grantRole(await escrow.CONTROLLER_ROLE(), await inference.getAddress());
    await staking.grantRole(await staking.SLASHER_ROLE(), await inference.getAddress());

    await vmind.connect(treasury).transfer(client.address, ethers.parseUnits("10000", 18));
    await vmind.connect(treasury).transfer(computeNode.address, ethers.parseUnits("10000", 18));
    await vmind.connect(treasury).transfer(otherNode.address, ethers.parseUnits("10000", 18));
  });

  // ---------------------------------------------------------------------
  // VMINDToken
  // ---------------------------------------------------------------------
  describe("VMINDToken", function () {
    it("reverts deployment with a zero address for any allocation recipient", async function () {
      const VMINDToken = await ethers.getContractFactory("VMINDToken");
      await expect(
        VMINDToken.deploy(ethers.ZeroAddress, ecosystemPool.address, seedVesting.address, teamVesting.address, treasury.address)
      ).to.be.revertedWith("zero address");
    });

    it("grants DEFAULT_ADMIN_ROLE and MINTER_ROLE to the deployer", async function () {
      expect(await vmind.hasRole(await vmind.DEFAULT_ADMIN_ROLE(), deployer.address)).to.equal(true);
      expect(await vmind.hasRole(await vmind.MINTER_ROLE(), deployer.address)).to.equal(true);
    });

    it("allows MINTER_ROLE to mint additional tokens", async function () {
      const before = await vmind.balanceOf(stranger.address);
      await vmind.mint(stranger.address, ethers.parseUnits("100", 18));
      expect(await vmind.balanceOf(stranger.address)).to.equal(before + ethers.parseUnits("100", 18));
    });

    it("reverts mint() from an address without MINTER_ROLE", async function () {
      await expect(vmind.connect(stranger).mint(stranger.address, ethers.parseUnits("100", 18)))
        .to.be.revertedWithCustomError(vmind, "AccessControlUnauthorizedAccount");
    });

    it("allows any holder to burn their own tokens (ERC20Burnable)", async function () {
      const before = await vmind.balanceOf(treasury.address);
      await vmind.connect(treasury).burn(ethers.parseUnits("100", 18));
      expect(await vmind.balanceOf(treasury.address)).to.equal(before - ethers.parseUnits("100", 18));
    });

    it("total supply stays fixed at 1B unless MINTER_ROLE mints more", async function () {
      expect(await vmind.totalSupply()).to.equal(await vmind.TOTAL_SUPPLY());
    });
  });

  // ---------------------------------------------------------------------
  // EscrowVault (direct unit tests, not routed through InferenceManager)
  // ---------------------------------------------------------------------
  describe("EscrowVault", function () {
    it("reverts escrow() from a non-CONTROLLER_ROLE caller", async function () {
      await vmind.connect(client).approve(await escrow.getAddress(), ethers.parseUnits("10", 18));
      await expect(
        escrow.connect(stranger).escrow(ethers.id("direct-req"), client.address, ethers.parseUnits("10", 18))
      ).to.be.revertedWithCustomError(escrow, "AccessControlUnauthorizedAccount");
    });

    it("reverts a second escrow() call for the same requestId", async function () {
      await escrow.grantRole(await escrow.CONTROLLER_ROLE(), deployer.address);
      const id = ethers.id("double-escrow");
      await vmind.connect(client).approve(await escrow.getAddress(), ethers.parseUnits("20", 18));
      await escrow.escrow(id, client.address, ethers.parseUnits("10", 18));
      await expect(
        escrow.escrow(id, client.address, ethers.parseUnits("10", 18))
      ).to.be.revertedWith("already escrowed");
    });

    it("reverts release() for more than the escrowed amount", async function () {
      await escrow.grantRole(await escrow.CONTROLLER_ROLE(), deployer.address);
      const id = ethers.id("over-release");
      await vmind.connect(client).approve(await escrow.getAddress(), ethers.parseUnits("10", 18));
      await escrow.escrow(id, client.address, ethers.parseUnits("10", 18));
      await expect(
        escrow.release(id, stranger.address, ethers.parseUnits("11", 18))
      ).to.be.revertedWith("exceeds escrowed amount");
    });

    it("reverts refund() when nothing is escrowed for that requestId", async function () {
      await escrow.grantRole(await escrow.CONTROLLER_ROLE(), deployer.address);
      await expect(
        escrow.refund(ethers.id("never-escrowed"), client.address)
      ).to.be.revertedWith("nothing escrowed");
    });

    it("emits Escrowed, Released, and Refunded events correctly", async function () {
      await escrow.grantRole(await escrow.CONTROLLER_ROLE(), deployer.address);
      const id = ethers.id("events-req");
      await vmind.connect(client).approve(await escrow.getAddress(), ethers.parseUnits("10", 18));
      await expect(escrow.escrow(id, client.address, ethers.parseUnits("10", 18)))
        .to.emit(escrow, "Escrowed").withArgs(id, client.address, ethers.parseUnits("10", 18));
      await expect(escrow.release(id, stranger.address, ethers.parseUnits("4", 18)))
        .to.emit(escrow, "Released").withArgs(id, stranger.address, ethers.parseUnits("4", 18));
      await expect(escrow.refund(id, client.address))
        .to.emit(escrow, "Refunded").withArgs(id, client.address, ethers.parseUnits("6", 18));
    });
  });

  // ---------------------------------------------------------------------
  // InferenceManager — state-machine guards not covered by the happy/adversarial paths
  // ---------------------------------------------------------------------
  describe("InferenceManager", function () {
    it("reverts submitRequest() for a requestId that already exists", async function () {
      const id = ethers.id("dup-req");
      await vmind.connect(client).approve(await escrow.getAddress(), ethers.parseUnits("20", 18));
      await inference.connect(client).submitRequest(id, ethers.parseUnits("10", 18), ethers.id("p1"));
      await vmind.connect(client).approve(await escrow.getAddress(), ethers.parseUnits("10", 18));
      await expect(
        inference.connect(client).submitRequest(id, ethers.parseUnits("10", 18), ethers.id("p2"))
      ).to.be.revertedWith("request already exists");
    });

    it("reverts assignNode() when the request is not in REQUEST_SUBMITTED state", async function () {
      const id = ethers.id("wrong-state-assign");
      await vmind.connect(computeNode).approve(await staking.getAddress(), MIN_STAKE);
      await staking.connect(computeNode).stake(MIN_STAKE);
      // Never submitted -> still IDLE
      await expect(inference.connect(computeNode).assignNode(id)).to.be.revertedWith("wrong state");
    });

    it("reverts submitProof() from an address that is not the assigned node", async function () {
      const id = ethers.id("wrong-caller-proof");
      await vmind.connect(client).approve(await escrow.getAddress(), ethers.parseUnits("10", 18));
      await inference.connect(client).submitRequest(id, ethers.parseUnits("10", 18), ethers.id("p"));

      await vmind.connect(computeNode).approve(await staking.getAddress(), MIN_STAKE);
      await staking.connect(computeNode).stake(MIN_STAKE);
      await inference.connect(computeNode).assignNode(id);

      await expect(
        inference.connect(otherNode).submitProof(id, "0x1234", "0x")
      ).to.be.revertedWith("not assigned node");
    });

    it("reverts settle() when the request is not VERIFIED", async function () {
      const id = ethers.id("settle-wrong-state");
      await vmind.connect(client).approve(await escrow.getAddress(), ethers.parseUnits("10", 18));
      await inference.connect(client).submitRequest(id, ethers.parseUnits("10", 18), ethers.id("p"));
      await expect(inference.settle(id, ethers.parseUnits("5", 18))).to.be.revertedWith("wrong state");
    });

    it("reverts settle() when nodePayment exceeds the request's maxFee", async function () {
      const id = ethers.id("settle-overpay");
      const maxFee = ethers.parseUnits("10", 18);
      await vmind.connect(client).approve(await escrow.getAddress(), maxFee);
      await inference.connect(client).submitRequest(id, maxFee, ethers.id("p"));

      await vmind.connect(computeNode).approve(await staking.getAddress(), MIN_STAKE);
      await staking.connect(computeNode).stake(MIN_STAKE);
      await inference.connect(computeNode).assignNode(id);
      await inference.connect(computeNode).submitProof(id, "0x1234", "0x");

      await expect(inference.settle(id, maxFee + 1n)).to.be.revertedWith("payment exceeds escrow");
    });

    it("reverts failOnTimeout() before the timeout has elapsed", async function () {
      const id = ethers.id("too-early-timeout");
      await vmind.connect(client).approve(await escrow.getAddress(), ethers.parseUnits("10", 18));
      await inference.connect(client).submitRequest(id, ethers.parseUnits("10", 18), ethers.id("p"));
      await expect(inference.failOnTimeout(id)).to.be.revertedWith("timeout not reached");
    });

    it("allows failOnTimeout() and refunds the client once the timeout has elapsed", async function () {
      const id = ethers.id("timeout-ok");
      const maxFee = ethers.parseUnits("10", 18);
      await vmind.connect(client).approve(await escrow.getAddress(), maxFee);
      await inference.connect(client).submitRequest(id, maxFee, ethers.id("p"));

      await ethers.provider.send("evm_increaseTime", [PROCESSING_TIMEOUT + 1]);
      await ethers.provider.send("evm_mine");

      const before = await vmind.balanceOf(client.address);
      await inference.connect(stranger).failOnTimeout(id); // any address may call this
      const after = await vmind.balanceOf(client.address);

      expect((await inference.requests(id)).state).to.equal(6); // FAILED
      expect(after - before).to.equal(maxFee);
    });

    it("reverts setZKVerifier() from a non-admin caller", async function () {
      await expect(
        inference.connect(stranger).setZKVerifier(await mockVerifier.getAddress())
      ).to.be.revertedWithCustomError(inference, "AccessControlUnauthorizedAccount");
    });

    it("reverts setZKVerifier() with the zero address", async function () {
      await expect(inference.setZKVerifier(ethers.ZeroAddress)).to.be.revertedWith("zero address");
    });

    it("allows the admin to swap the ZK verifier implementation", async function () {
      const MockZKVerifier = await ethers.getContractFactory("MockZKVerifier");
      const newMock = await MockZKVerifier.deploy();
      await inference.setZKVerifier(await newMock.getAddress());
      expect(await inference.zkVerifier()).to.equal(await newMock.getAddress());
    });

    it("reverts the constructor with any zero-address dependency", async function () {
      const InferenceManager = await ethers.getContractFactory("InferenceManager");
      await expect(
        InferenceManager.deploy(ethers.ZeroAddress, await staking.getAddress(), await mockVerifier.getAddress(), PROCESSING_TIMEOUT)
      ).to.be.revertedWith("zero address");
    });
  });

  // ---------------------------------------------------------------------
  // StakingManager — jail/unjail and authorization paths
  // ---------------------------------------------------------------------
  describe("StakingManager", function () {
    it("reverts stake() with a zero amount", async function () {
      await vmind.connect(computeNode).approve(await staking.getAddress(), MIN_STAKE);
      await expect(staking.connect(computeNode).stake(0)).to.be.revertedWith("amount must be > 0");
    });

    it("reverts requestUnstake() for more than the staked amount", async function () {
      await vmind.connect(computeNode).approve(await staking.getAddress(), MIN_STAKE);
      await staking.connect(computeNode).stake(MIN_STAKE);
      await expect(staking.connect(computeNode).requestUnstake(MIN_STAKE + 1n)).to.be.revertedWith("invalid amount");
    });

    it("reverts slash() from an address without SLASHER_ROLE", async function () {
      await expect(
        staking.connect(stranger).slash(computeNode.address, 5000, "unauthorized attempt")
      ).to.be.revertedWithCustomError(staking, "AccessControlUnauthorizedAccount");
    });

    it("reverts slash() with bps > 10000", async function () {
      await staking.grantRole(await staking.SLASHER_ROLE(), deployer.address);
      await expect(
        staking.slash(computeNode.address, 10001, "invalid bps")
      ).to.be.revertedWith("bps out of range");
    });

    it("jails a node, prevents new staking while jailed, and allows unjail after the period elapses", async function () {
      await vmind.connect(computeNode).approve(await staking.getAddress(), MIN_STAKE);
      await staking.connect(computeNode).stake(MIN_STAKE);

      await staking.grantRole(await staking.SLASHER_ROLE(), deployer.address);
      const jailDuration = 30 * 24 * 60 * 60; // 30 days, matches whitepaper §3.2 double-signing jail period
      await staking.jail(computeNode.address, jailDuration);
      expect((await staking.stakes(computeNode.address)).jailed).to.equal(true);

      // Jailed node cannot stake more.
      await vmind.connect(computeNode).approve(await staking.getAddress(), ethers.parseUnits("1", 18));
      await expect(staking.connect(computeNode).stake(ethers.parseUnits("1", 18))).to.be.revertedWith("node is jailed");

      // Cannot unjail before the period elapses.
      await expect(staking.connect(computeNode).unjail()).to.be.revertedWith("jail period active");

      await ethers.provider.send("evm_increaseTime", [jailDuration + 1]);
      await ethers.provider.send("evm_mine");

      await staking.connect(computeNode).unjail();
      expect((await staking.stakes(computeNode.address)).jailed).to.equal(false);
    });

    it("reverts unjail() for a node that was never jailed", async function () {
      await expect(staking.connect(computeNode).unjail()).to.be.revertedWith("not jailed");
    });

    it("isEligible() returns false for a node below minStake", async function () {
      const smallAmount = MIN_STAKE / 2n;
      await vmind.connect(computeNode).approve(await staking.getAddress(), smallAmount);
      await staking.connect(computeNode).stake(smallAmount);
      expect(await staking.isEligible(computeNode.address)).to.equal(false);
    });
  });

  // ---------------------------------------------------------------------
  // RoyaltyManager — authorization and validation paths
  // ---------------------------------------------------------------------
  describe("RoyaltyManager", function () {
    it("reverts distributeRoyalties() from an address without SETTLER_ROLE", async function () {
      await expect(
        royalty.connect(stranger).distributeRoyalties(ethers.id("r1"), 100n, [creatorA.address], [10000])
      ).to.be.revertedWithCustomError(royalty, "AccessControlUnauthorizedAccount");
    });

    it("reverts distributeRoyalties() on array length mismatch", async function () {
      await royalty.grantRole(await royalty.SETTLER_ROLE(), deployer.address);
      await expect(
        royalty.distributeRoyalties(ethers.id("r2"), 100n, [creatorA.address, creatorB.address], [10000])
      ).to.be.revertedWith("length mismatch");
    });

    it("reverts distributeRoyalties() with an empty creators array", async function () {
      await royalty.grantRole(await royalty.SETTLER_ROLE(), deployer.address);
      await expect(
        royalty.distributeRoyalties(ethers.id("r3"), 100n, [], [])
      ).to.be.revertedWith("no creators");
    });

    it("reverts distributeRoyalties() with a zero-address creator", async function () {
      await royalty.grantRole(await royalty.SETTLER_ROLE(), deployer.address);
      await expect(
        royalty.distributeRoyalties(ethers.id("r4"), 100n, [ethers.ZeroAddress], [10000])
      ).to.be.revertedWith("zero address creator");
    });

    it("emits RoyaltyBatchSettled with the correct total and creator count", async function () {
      await royalty.grantRole(await royalty.SETTLER_ROLE(), deployer.address);
      const pool = ethers.parseUnits("50", 18);
      await vmind.connect(treasury).transfer(await royalty.getAddress(), pool);
      await expect(
        royalty.distributeRoyalties(ethers.id("r5"), pool, [creatorA.address, creatorB.address], [6000, 4000])
      ).to.emit(royalty, "RoyaltyBatchSettled").withArgs(ethers.id("r5"), pool, 2);
    });
  });

  // ---------------------------------------------------------------------
  // Governance — minimal skeleton, per its own NatSpec not a production module
  // ---------------------------------------------------------------------
  describe("Governance", function () {
    it("reverts vote() from an address holding zero VMIND", async function () {
      const id = await governance.propose.staticCall(stranger.address, "0x");
      await governance.propose(stranger.address, "0x");
      await expect(governance.connect(stranger).vote(id)).to.be.revertedWith("no voting power");
    });

    it("reverts a second vote() from the same address on the same proposal", async function () {
      await governance.propose(stranger.address, "0x");
      await governance.connect(treasury).vote(0);
      await expect(governance.connect(treasury).vote(0)).to.be.revertedWith("already voted");
    });

    it("reverts vote() after the voting deadline", async function () {
      await governance.propose(stranger.address, "0x");
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");
      await expect(governance.connect(treasury).vote(0)).to.be.revertedWith("voting closed");
    });

    it("reverts execute() before the voting deadline", async function () {
      await governance.propose(stranger.address, "0x");
      await governance.connect(treasury).vote(0);
      await expect(governance.execute(0)).to.be.revertedWith("voting still open");
    });

    it("reverts execute() when quorum was not met", async function () {
      await governance.propose(stranger.address, "0x");
      // treasury alone holds far less than the 100M quorum used in this test's deployment
      await vmind.connect(treasury).approve(deployer.address, 0); // no-op, just to touch treasury
      await governance.connect(client).vote(0); // client holds only 10,000 VMIND, well under quorum
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");
      await expect(governance.execute(0)).to.be.revertedWith("quorum not met");
    });

    it("reverts a second execute() of an already-executed proposal", async function () {
      // Use a target/call that will trivially succeed: VMINDToken.balanceOf via a call
      // to a contract with no state-changing effect is awkward with raw calldata, so
      // instead target this Governance contract's own harmless view-less no-op path
      // is not available — use the token contract's `totalSupply()` selector as a
      // call that succeeds without requiring special permissions.
      const iface = new ethers.Interface(["function totalSupply()"]);
      const callData = iface.encodeFunctionData("totalSupply");

      await governance.propose(await vmind.getAddress(), callData);
      // Use ecosystemPool (20% = 200M VMIND, untouched by this file's beforeEach
      // funding transfers) rather than treasury, whose balance drops to 99,970,000
      // after beforeEach sends 30,000 VMIND to client/computeNode/otherNode — just
      // under the 100M quorum used in this test's Governance deployment.
      await governance.connect(ecosystemPool).vote(0);
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");

      await governance.execute(0);
      await expect(governance.execute(0)).to.be.revertedWith("already executed");
    });
  });

  // ---------------------------------------------------------------------
  // MockZKVerifier — direct unit test of the TEST-ONLY stand-in itself
  // ---------------------------------------------------------------------
  describe("MockZKVerifier (TEST-ONLY — not a real ZK verifier, see docs/security/zk-security.md)", function () {
    it("returns true for any non-empty proof bytes, regardless of content", async function () {
      expect(await mockVerifier.verifyProof("0xdeadbeef", "0x")).to.equal(true);
      expect(await mockVerifier.verifyProof("0x00", "0xaabbcc")).to.equal(true);
    });

    it("returns false for empty proof bytes", async function () {
      expect(await mockVerifier.verifyProof("0x", "0x")).to.equal(false);
    });

    it("ignores publicInputs entirely (ONLY checks proof.length, no cryptographic binding)", async function () {
      const result1 = await mockVerifier.verifyProof("0x01", "0xaaaa");
      const result2 = await mockVerifier.verifyProof("0x01", "0xbbbbbbbb");
      expect(result1).to.equal(result2);
      expect(result1).to.equal(true);
      // This is the concrete demonstration of why MockZKVerifier provides no
      // security guarantee: publicInputs (e.g. the prompt hash) has zero effect
      // on the verification result.
    });
  });
});
