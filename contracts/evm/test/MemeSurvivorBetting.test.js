const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("MemeSurvivorBetting", function () {
  let contract, owner, resolver, user1, user2;
  const TOKEN_ADDR = "0xSomeMemeToken123";
  const DURATION_1H = 3600;
  const MIN_BET = ethers.parseEther("0.001");

  beforeEach(async function () {
    [owner, resolver, user1, user2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MemeSurvivorBetting");
    contract = await Factory.deploy(resolver.address);
    await contract.waitForDeployment();

    // Fund contract for payouts
    await contract.fundContract({ value: ethers.parseEther("10") });
  });

  describe("Bet Placement", function () {
    it("should place a bet successfully", async function () {
      const tx = await contract.connect(user1).placeBet(
        TOKEN_ADDR, DURATION_1H, "0.00123", "50000",
        { value: ethers.parseEther("0.01") }
      );

      const receipt = await tx.wait();
      const bet = await contract.getBet(0);

      expect(bet.bettor).to.equal(user1.address);
      expect(bet.tokenAddress).to.equal(TOKEN_ADDR);
      expect(bet.amount).to.equal(ethers.parseEther("0.01"));
      expect(bet.duration).to.equal(DURATION_1H);
      expect(bet.status).to.equal(0); // Active
    });

    it("should emit BetPlaced event", async function () {
      await expect(
        contract.connect(user1).placeBet(
          TOKEN_ADDR, DURATION_1H, "0.05", "100000",
          { value: ethers.parseEther("0.01") }
        )
      ).to.emit(contract, "BetPlaced");
    });

    it("should reject bet below minimum", async function () {
      await expect(
        contract.connect(user1).placeBet(
          TOKEN_ADDR, DURATION_1H, "0.05", "100000",
          { value: ethers.parseEther("0.0001") }
        )
      ).to.be.revertedWithCustomError(contract, "BetTooSmall");
    });

    it("should reject invalid duration", async function () {
      await expect(
        contract.connect(user1).placeBet(
          TOKEN_ADDR, 999, "0.05", "100000",
          { value: ethers.parseEther("0.01") }
        )
      ).to.be.revertedWithCustomError(contract, "InvalidDuration");
    });

    it("should track user bets", async function () {
      await contract.connect(user1).placeBet(
        TOKEN_ADDR, DURATION_1H, "0.05", "100000",
        { value: ethers.parseEther("0.01") }
      );
      await contract.connect(user1).placeBet(
        "0xAnotherToken", DURATION_1H, "1.23", "200000",
        { value: ethers.parseEther("0.02") }
      );

      const userBetIds = await contract.getUserBets(user1.address);
      expect(userBetIds.length).to.equal(2);
    });
  });

  describe("Bet Resolution", function () {
    beforeEach(async function () {
      await contract.connect(user1).placeBet(
        TOKEN_ADDR, DURATION_1H, "0.05", "100000",
        { value: ethers.parseEther("0.1") }
      );
    });

    it("should resolve bet as won (survived) with 2x payout", async function () {
      await time.increase(DURATION_1H + 1);

      const balanceBefore = await ethers.provider.getBalance(user1.address);
      await contract.connect(resolver).resolveBet(0, true);
      const balanceAfter = await ethers.provider.getBalance(user1.address);

      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("0.2"));

      const bet = await contract.getBet(0);
      expect(bet.status).to.equal(1); // Won
      expect(bet.survived).to.equal(true);
    });

    it("should resolve bet as lost (not survived)", async function () {
      await time.increase(DURATION_1H + 1);

      await contract.connect(resolver).resolveBet(0, false);

      const bet = await contract.getBet(0);
      expect(bet.status).to.equal(2); // Lost
      expect(bet.survived).to.equal(false);
    });

    it("should emit BetResolved event", async function () {
      await time.increase(DURATION_1H + 1);

      await expect(contract.connect(resolver).resolveBet(0, true))
        .to.emit(contract, "BetResolved")
        .withArgs(0, user1.address, true, ethers.parseEther("0.2"));
    });

    it("should reject resolution before expiry", async function () {
      await expect(
        contract.connect(resolver).resolveBet(0, true)
      ).to.be.revertedWithCustomError(contract, "BetNotExpired");
    });

    it("should reject resolution from non-resolver", async function () {
      await time.increase(DURATION_1H + 1);

      await expect(
        contract.connect(user1).resolveBet(0, true)
      ).to.be.revertedWithCustomError(contract, "NotResolver");
    });

    it("should reject double resolution", async function () {
      await time.increase(DURATION_1H + 1);
      await contract.connect(resolver).resolveBet(0, false);

      await expect(
        contract.connect(resolver).resolveBet(0, true)
      ).to.be.revertedWithCustomError(contract, "BetNotActive");
    });
  });

  describe("Bet Cancellation", function () {
    beforeEach(async function () {
      await contract.connect(user1).placeBet(
        TOKEN_ADDR, DURATION_1H, "0.05", "100000",
        { value: ethers.parseEther("1") }
      );
    });

    it("should cancel and refund 90%", async function () {
      const balanceBefore = await ethers.provider.getBalance(user1.address);
      const tx = await contract.connect(user1).cancelBet(0);
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(user1.address);

      const refund = ethers.parseEther("0.9");
      expect(balanceAfter - balanceBefore + gasCost).to.equal(refund);

      const bet = await contract.getBet(0);
      expect(bet.status).to.equal(3); // Cancelled
    });

    it("should reject cancel from non-bettor", async function () {
      await expect(
        contract.connect(user2).cancelBet(0)
      ).to.be.revertedWithCustomError(contract, "NotBettor");
    });
  });

  describe("Admin Functions", function () {
    it("should update resolver", async function () {
      await contract.connect(owner).setResolver(user2.address);
      expect(await contract.resolver()).to.equal(user2.address);
    });

    it("should reject non-owner resolver update", async function () {
      await expect(
        contract.connect(user1).setResolver(user2.address)
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });
  });
});
