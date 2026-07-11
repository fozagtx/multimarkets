import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("OracleThresholdMarket", function () {
  const decimals = 6;
  const scale = 10n ** 8n;
  const threshold = 100_000n * scale;

  async function fixture() {
    const [owner, oracle, alice, bob, attacker] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("TestnetUSDT");
    const token = await Token.deploy("Test USDT", "tUSDT", decimals);
    await token.waitForDeployment();
    await token.mint(alice.address, ethers.parseUnits("1000", decimals));
    await token.mint(bob.address, ethers.parseUnits("1000", decimals));

    const Factory = await ethers.getContractFactory("OracleThresholdMarketFactory");
    const factory = await Factory.deploy(
      owner.address,
      await token.getAddress(),
      oracle.address,
      owner.address,
      60 * 60,
      0,
      ethers.parseUnits("1", decimals),
    );
    await factory.waitForDeployment();

    const deadline = BigInt((await time.latest()) + 60);
    await factory.createMarket("BTC", "USD", threshold, deadline);
    const market = await ethers.getContractAt(
      "OracleThresholdMarket",
      await factory.marketAt(0),
    );
    return { owner, oracle, alice, bob, attacker, token, factory, market, deadline };
  }

  async function signature(
    market: Awaited<ReturnType<typeof fixture>>["market"],
    signer: Awaited<ReturnType<typeof fixture>>["oracle"],
    price: bigint,
    timestamp: bigint,
  ) {
    const packed = ethers.solidityPackedKeccak256(
      ["address", "string", "string", "string", "int256", "uint64"],
      [await market.getAddress(), "BTC", "/", "USD", price, timestamp],
    );
    return signer.signMessage(ethers.getBytes(packed));
  }

  async function buyBoth(f: Awaited<ReturnType<typeof fixture>>) {
    const stake = ethers.parseUnits("100", decimals);
    await f.token.connect(f.alice).approve(await f.market.getAddress(), stake);
    await f.token.connect(f.bob).approve(await f.market.getAddress(), stake);
    await f.market.connect(f.alice).buyShares(0, stake);
    await f.market.connect(f.bob).buyShares(1, stake);
    return stake;
  }

  it("resolves YES at the exact threshold and pays winning shares", async function () {
    const f = await fixture();
    await buyBoth(f);
    await time.increaseTo(f.deadline);
    const timestamp = f.deadline;
    await f.market.resolve(threshold, timestamp, await signature(f.market, f.oracle, threshold, timestamp));
    expect(await f.market.winningOutcome()).to.equal(0n);

    const before = await f.token.balanceOf(f.alice.address);
    await f.market.connect(f.alice).claim();
    expect((await f.token.balanceOf(f.alice.address)) - before).to.equal(
      ethers.parseUnits("200", decimals),
    );
  });

  it("resolves NO below the threshold", async function () {
    const f = await fixture();
    await buyBoth(f);
    await time.increaseTo(f.deadline);
    const price = threshold - 1n;
    await f.market.resolve(price, f.deadline, await signature(f.market, f.oracle, price, f.deadline));
    expect(await f.market.winningOutcome()).to.equal(1n);
  });

  it("rejects malformed or stale signed observations", async function () {
    const f = await fixture();
    await time.increaseTo(f.deadline + 3601n);
    const staleTimestamp = f.deadline;
    await expect(
      f.market.resolve(threshold, staleTimestamp, await signature(f.market, f.oracle, threshold, staleTimestamp)),
    ).to.be.revertedWithCustomError(f.market, "StalePrice");

    const freshTimestamp = BigInt(await time.latest());
    await expect(
      f.market.resolve(
        threshold,
        freshTimestamp,
        await signature(f.market, f.attacker, threshold, freshTimestamp),
      ),
    ).to.be.revertedWithCustomError(f.market, "InvalidSignature");
  });

  it("rejects settlement before the deadline and closes trading at deadline", async function () {
    const f = await fixture();
    const timestamp = BigInt(await time.latest());
    await expect(
      f.market.resolve(threshold, timestamp, await signature(f.market, f.oracle, threshold, timestamp)),
    ).to.be.revertedWithCustomError(f.market, "MarketNotResolvable");

    await time.increaseTo(f.deadline);
    await f.token.connect(f.alice).approve(await f.market.getAddress(), ethers.parseUnits("1", decimals));
    await expect(f.market.connect(f.alice).buyShares(0, ethers.parseUnits("1", decimals)))
      .to.be.revertedWithCustomError(f.market, "MarketNotOpen");
    await f.market.closeMarket();
    expect(await f.market.marketState()).to.equal(1n);
  });

  it("cancels safely and refunds traders", async function () {
    const f = await fixture();
    const stake = await buyBoth(f);
    await f.market.cancel();
    const before = await f.token.balanceOf(f.alice.address);
    await f.market.connect(f.alice).claim();
    expect((await f.token.balanceOf(f.alice.address)) - before).to.equal(stake);
    await expect(f.market.connect(f.alice).claim()).to.be.revertedWithCustomError(
      f.market,
      "AlreadyClaimed",
    );
  });
});
