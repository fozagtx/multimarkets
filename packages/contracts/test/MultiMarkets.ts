import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
  AgentRegistry,
  ChatRoom,
  ChatRoomFactory,
  CoinbaseOracleAdapter,
  MasterAgentGuard,
  TestnetUSDT,
  PredictionMarket,
} from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("MultiMarkets", function () {
  let owner: HardhatEthersSigner;
  let master: HardhatEthersSigner;
  let backup: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let coinbaseSigner: HardhatEthersSigner;

  let registry: AgentRegistry;
  let guard: MasterAgentGuard;
  let oracle: CoinbaseOracleAdapter;
  let factory: ChatRoomFactory;
  let usdt: TestnetUSDT;

  const personaHashA = ethers.id("eliza-character-agent-a-v1");
  const personaHashB = ethers.id("eliza-character-agent-b-v1");

  async function deployFixture() {
    [owner, master, backup, alice, bob, coinbaseSigner] = await ethers.getSigners();

    const TestnetUSDTF = await ethers.getContractFactory("TestnetUSDT");
    usdt = (await TestnetUSDTF.deploy("Testnet USDT", "tUSDT", 6)) as unknown as TestnetUSDT;
    await usdt.waitForDeployment();

    const RegistryF = await ethers.getContractFactory("AgentRegistry");
    registry = (await RegistryF.deploy(owner.address)) as unknown as AgentRegistry;
    await registry.waitForDeployment();

    const GuardF = await ethers.getContractFactory("MasterAgentGuard");
    guard = (await GuardF.deploy(owner.address)) as unknown as MasterAgentGuard;
    await guard.waitForDeployment();

    const OracleF = await ethers.getContractFactory("CoinbaseOracleAdapter");
    oracle = (await OracleF.deploy(
      owner.address,
      coinbaseSigner.address
    )) as unknown as CoinbaseOracleAdapter;
    await oracle.waitForDeployment();

    const FactoryF = await ethers.getContractFactory("ChatRoomFactory");
    factory = (await FactoryF.deploy(
      owner.address,
      await registry.getAddress(),
      await guard.getAddress(),
      owner.address
    )) as unknown as ChatRoomFactory;
    await factory.waitForDeployment();

    await guard.setFactoryAuthorization(await factory.getAddress(), true);

    // Mint collateral
    const mintAmt = ethers.parseUnits("100000", 6);
    await usdt.mint(alice.address, mintAmt);
    await usdt.mint(bob.address, mintAmt);
  }

  async function registerTwoAgents() {
    await registry.connect(owner).registerAgent(personaHashA, "BullAgent", ["macro", "btc"]);
    await registry.connect(owner).registerAgent(personaHashB, "BearAgent", ["macro", "eth"]);
    return { agentA: 1n, agentB: 2n };
  }

  async function createRoomAndMarket() {
    const { agentA, agentB } = await registerTwoAgents();
    const now = await time.latest();

    const params = {
      topic: "Will BTC close above 100k this week?",
      agentA,
      agentB,
      masterAgent: master.address,
      collateralToken: await usdt.getAddress(),
      settlementAuthority: owner.address,
      backupMasters: [backup.address],
      marketParams: {
        marketType: 0, // Binary
        outcomeCount: 2,
        feeBps: 100, // 1%
        minStake: ethers.parseUnits("1", 6),
        openAt: BigInt(now),
        closeAt: BigInt(now + 7 * 24 * 3600),
      },
    };

    const tx = await factory.createRoom(params);
    const receipt = await tx.wait();
    expect(receipt).to.not.be.null;

    const roomId = await factory.nextRoomId().then((n) => n - 1n);
    const roomAddress = await factory.rooms(roomId);
    const marketAddress = await factory.markets(roomId);

    const room = (await ethers.getContractAt("ChatRoom", roomAddress)) as unknown as ChatRoom;
    const market = (await ethers.getContractAt(
      "PredictionMarket",
      marketAddress
    )) as unknown as PredictionMarket;

    return { roomId, room, market, agentA, agentB };
  }

  beforeEach(async function () {
    await deployFixture();
  });

  describe("AgentRegistry", function () {
    it("registers and updates agents", async function () {
      await expect(
        registry.connect(alice).registerAgent(personaHashA, "Alpha", ["debate"])
      )
        .to.emit(registry, "AgentRegistered")
        .withArgs(1n, alice.address, personaHashA, "Alpha");

      const agent = await registry.getAgent(1n);
      expect(agent.creator).to.equal(alice.address);
      expect(agent.name).to.equal("Alpha");
      expect(agent.active).to.equal(true);
      expect(agent.tags.length).to.equal(1);

      const newHash = ethers.id("updated-persona");
      await expect(
        registry.connect(alice).updateAgent(1n, newHash, "Alpha v2", ["debate", "crypto"], true)
      )
        .to.emit(registry, "AgentUpdated")
        .withArgs(1n, alice.address, newHash, "Alpha v2", true);

      const updated = await registry.getAgent(1n);
      expect(updated.name).to.equal("Alpha v2");
      expect(updated.personaHash).to.equal(newHash);
      expect(updated.tags.length).to.equal(2);
    });

    it("only owner or creator can update", async function () {
      await registry.connect(alice).registerAgent(personaHashA, "Alpha", []);
      await expect(
        registry.connect(bob).updateAgent(1n, personaHashA, "Hijack", [], false)
      ).to.be.revertedWithCustomError(registry, "NotAuthorized");

      await expect(
        registry.connect(owner).updateAgent(1n, personaHashA, "OwnerEdit", [], true)
      ).to.emit(registry, "AgentUpdated");
    });
  });

  describe("Market create + settle flow", function () {
    it("creates room + market, trades, settles, and pays winners pro-rata", async function () {
      const { roomId, room, market } = await createRoomAndMarket();

      expect(await room.state()).to.equal(0); // Created
      expect(await market.marketState()).to.equal(0); // Open
      expect(await guard.currentMaster(roomId)).to.equal(master.address);
      expect(await guard.isBackupMaster(roomId, backup.address)).to.equal(true);

      // Buy shares while open (before or during live - market is independent once open)
      const aliceYes = ethers.parseUnits("100", 6);
      const bobNo = ethers.parseUnits("300", 6);

      await usdt.connect(alice).approve(await market.getAddress(), aliceYes);
      await usdt.connect(bob).approve(await market.getAddress(), bobNo);

      await market.connect(alice).buyShares(0, aliceYes); // YES
      await market.connect(bob).buyShares(1, bobNo); // NO

      // fee 1% → net shares
      const aliceShares = aliceYes - aliceYes / 100n;
      const bobShares = bobNo - bobNo / 100n;
      expect(await market.getUserShares(alice.address, 0)).to.equal(aliceShares);
      expect(await market.getUserShares(bob.address, 1)).to.equal(bobShares);

      // Master starts debate, posts batches, ends debate
      await room.connect(master).goLive();
      expect(await room.state()).to.equal(1); // Live

      const root1 = ethers.id("batch-1-messages");
      const root2 = ethers.id("batch-2-messages");
      await expect(room.connect(master).commitMessageBatch(root1))
        .to.emit(room, "MessageBatchCommitted")
        .withArgs(roomId, 0n, root1, master.address);
      await room.connect(master).commitMessageBatch(root2);
      expect(await room.batchCount()).to.equal(2n);
      expect(await room.getMessageRoot(0)).to.equal(root1);

      await room.connect(master).endDebate();
      expect(await room.state()).to.equal(2); // DebateEnded
      expect(await market.marketState()).to.equal(1); // Closed

      // Settle YES (outcome 0) wins
      await expect(room.connect(master).settle(0))
        .to.emit(room, "RoomSettled")
        .withArgs(roomId, 0);
      expect(await room.state()).to.equal(3); // Settled
      expect(await market.marketState()).to.equal(2); // Resolved
      expect(await market.winningOutcome()).to.equal(0);

      // Alice claims full pool pro-rata (she has all YES shares)
      const totalPool = await market.totalPool();
      const aliceBalBefore = await usdt.balanceOf(alice.address);
      await market.connect(alice).claim();
      const aliceBalAfter = await usdt.balanceOf(alice.address);
      expect(aliceBalAfter - aliceBalBefore).to.equal(totalPool);

      // Bob has no winning shares
      await expect(market.connect(bob).claim()).to.be.revertedWithCustomError(
        market,
        "NothingToClaim"
      );
    });

    it("rejects share purchases after debate ends", async function () {
      const { room, market } = await createRoomAndMarket();
      await room.connect(master).goLive();
      await room.connect(master).endDebate();

      await usdt.connect(alice).approve(await market.getAddress(), ethers.parseUnits("10", 6));
      await expect(
        market.connect(alice).buyShares(0, ethers.parseUnits("10", 6))
      ).to.be.revertedWithCustomError(market, "MarketNotOpen");
    });

    it("rejects direct market.resolve (must go through ChatRoom.settle)", async function () {
      const { room, market } = await createRoomAndMarket();
      await room.connect(master).goLive();
      await room.connect(master).endDebate();

      // Even owner/settlement authority cannot resolve without ChatRoom
      await expect(market.connect(owner).resolve(0)).to.be.revertedWithCustomError(
        market,
        "NotChatRoom",
      );
    });

    it("cancelSettlement refunds both sides", async function () {
      const { room, market } = await createRoomAndMarket();
      const stake = ethers.parseUnits("50", 6);
      await usdt.connect(alice).approve(await market.getAddress(), stake);
      await usdt.connect(bob).approve(await market.getAddress(), stake);
      await market.connect(alice).buyShares(0, stake);
      await market.connect(bob).buyShares(1, stake);

      await room.connect(master).goLive();
      await room.connect(master).endDebate();
      await room.connect(master).cancelSettlement();

      expect(await market.marketState()).to.equal(3); // Cancelled
      expect(await room.state()).to.equal(3); // Settled (closed room)

      const aliceBefore = await usdt.balanceOf(alice.address);
      await market.connect(alice).claim();
      const aliceAfter = await usdt.balanceOf(alice.address);
      // fee 1% → net refund is 99% of stake
      expect(aliceAfter - aliceBefore).to.equal(stake - stake / 100n);
    });
  });

  describe("MasterAgentGuard", function () {
    it("allows backup takeover after heartbeat timeout", async function () {
      const { roomId, room } = await createRoomAndMarket();
      await room.connect(master).goLive();

      // Advance past HEARTBEAT_TIMEOUT (10 minutes)
      await time.increase(11 * 60);

      expect(await guard.isHeartbeatStale(roomId)).to.equal(true);

      await expect(guard.connect(backup).takeover(roomId, await room.getAddress()))
        .to.emit(guard, "MasterTakeover")
        .withArgs(roomId, master.address, backup.address);

      expect(await room.masterAgent()).to.equal(backup.address);
      expect(await guard.currentMaster(roomId)).to.equal(backup.address);

      // New master can operate the room
      await room.connect(backup).commitMessageBatch(ethers.id("after-takeover"));
      expect(await room.batchCount()).to.equal(1n);
    });
  });

  describe("CoinbaseOracleAdapter", function () {
    it("accepts EIP-191 signed Coinbase-style prices and rejects bad signatures", async function () {
      const base = "BTC";
      const quote = "USD";
      const price = 100_000n * 10n ** 8n; // 8 decimals
      const decimals = 8;
      const timestamp = BigInt(await time.latest());

      const messageHash = ethers.solidityPackedKeccak256(
        ["string", "string", "string", "int256", "uint8", "uint64"],
        [base, "/", quote, price, decimals, timestamp]
      );
      // personal_sign / EIP-191
      const signature = await coinbaseSigner.signMessage(ethers.getBytes(messageHash));

      await expect(
        oracle.submitCoinbasePrice(base, quote, price, decimals, timestamp, signature)
      )
        .to.emit(oracle, "CoinbasePriceSubmitted");

      const [p, d, t] = await oracle.getCoinbasePrice(base, quote);
      expect(p).to.equal(price);
      expect(d).to.equal(decimals);
      expect(t).to.equal(timestamp);

      // Bad signer
      const badSig = await alice.signMessage(ethers.getBytes(messageHash));
      const ts2 = timestamp + 1n;
      const messageHash2 = ethers.solidityPackedKeccak256(
        ["string", "string", "string", "int256", "uint8", "uint64"],
        [base, "/", quote, price, decimals, ts2]
      );
      // Use alice sig on a valid message hash for ts2
      const badSig2 = await alice.signMessage(
        ethers.getBytes(
          ethers.solidityPackedKeccak256(
            ["string", "string", "string", "int256", "uint8", "uint64"],
            [base, "/", quote, price, decimals, ts2]
          )
        )
      );
      await expect(
        oracle.submitCoinbasePrice(base, quote, price, decimals, ts2, badSig2)
      ).to.be.revertedWithCustomError(oracle, "InvalidSignature");

      // silence unused
      void badSig;
      void messageHash2;
    });
  });
});
