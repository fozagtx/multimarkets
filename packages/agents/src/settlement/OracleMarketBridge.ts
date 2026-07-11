import {
  Contract,
  JsonRpcProvider,
  type Log,
  Wallet,
  getBytes,
  parseUnits,
  solidityPackedKeccak256,
} from "ethers";

import type {
  OnChainMarketBinding,
  RoomSession,
} from "../types.js";

const FACTORY_ABI = [
  "function createMarket(string baseAsset, string quoteAsset, int256 threshold, uint64 deadline) returns (address)",
  "event MarketCreated(address indexed market, address indexed creator, string baseAsset, string quoteAsset, int256 threshold, uint64 deadline)",
];
const MARKET_ABI = [
  "function marketState() view returns (uint8)",
  "function deadline() view returns (uint64)",
  "function resolve(int256 price, uint64 priceTimestamp, bytes signature)",
  "function closeMarket()",
];

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required to provision oracle markets.`);
  return value;
}

function stateName(state: number): OnChainMarketBinding["status"] {
  return ["open", "closed", "resolved", "cancelled"][state] as OnChainMarketBinding["status"] ?? "failed";
}

export class OracleMarketBridge {
  private readonly provider: JsonRpcProvider;
  private readonly relayer: Wallet;
  private readonly oracle: Wallet;
  private readonly factory: Contract;
  private readonly chainId: number;

  constructor() {
    const rpcUrl = requiredEnv("HASHKEY_RPC_URL");
    this.chainId = Number(process.env.HASHKEY_CHAIN_ID ?? 133);
    this.provider = new JsonRpcProvider(rpcUrl, this.chainId, {
      staticNetwork: true,
    });
    this.relayer = new Wallet(requiredEnv("MASTER_RELAYER_PRIVATE_KEY"), this.provider);
    this.oracle = new Wallet(
      process.env.ORACLE_SIGNER_PRIVATE_KEY?.trim() || this.relayer.privateKey,
      this.provider,
    );
    this.factory = new Contract(
      requiredEnv("ORACLE_THRESHOLD_FACTORY_ADDRESS"),
      FACTORY_ABI,
      this.relayer,
    );
  }

  async provision(session: RoomSession): Promise<OnChainMarketBinding> {
    const config = session.config.oracleMarket;
    if (!config) throw new Error("Oracle market configuration is required.");
    const deadlineSeconds = Math.floor(config.deadline / 1000);
    if (deadlineSeconds <= Math.floor(Date.now() / 1000) + 30) {
      throw new Error("The market deadline must be at least 30 seconds in the future.");
    }
    const threshold = parseUnits(config.threshold, 8);
    const tx = await this.factory.createMarket(
      config.baseAsset.toUpperCase(),
      config.quoteAsset.toUpperCase(),
      threshold,
      deadlineSeconds,
    );
    const receipt = await tx.wait();
    if (!receipt) throw new Error("Market creation transaction did not return a receipt.");
    const parsedLogs: Array<{ name?: string; args?: { market?: string } }> = [];
    for (const log of receipt.logs as Log[]) {
      try {
        parsedLogs.push(
          this.factory.interface.parseLog(log) as {
            name?: string;
            args?: { market?: string };
          },
        );
      } catch {
        // Ignore transfer and unrelated event logs.
      }
    }
    const created = parsedLogs.find(
      (parsed: { name?: string; args?: { market?: string } }) =>
        parsed.name === "MarketCreated",
    );
    const marketAddress = created?.args?.market;
    if (!marketAddress) throw new Error("Market creation did not emit a market address.");

    return {
      chainId: this.chainId,
      marketAddress,
      factoryAddress: await this.factory.getAddress(),
      createTxHash: tx.hash,
      baseAsset: config.baseAsset.toUpperCase(),
      quoteAsset: config.quoteAsset.toUpperCase(),
      threshold: config.threshold,
      deadline: config.deadline,
      status: "open",
      updatedAt: Date.now(),
    };
  }

  async sync(binding: OnChainMarketBinding): Promise<OnChainMarketBinding> {
    const market = new Contract(binding.marketAddress, MARKET_ABI, this.relayer);
    const state = Number(await market.marketState());
    const next = { ...binding, status: stateName(state), updatedAt: Date.now() };
    if (state >= 2 || Date.now() < binding.deadline) return next;

    try {
      if (state === 0) {
        const closeTx = await market.closeMarket();
        await closeTx.wait();
        next.status = "closed";
        next.closeTxHash = closeTx.hash;
      }

      const observation = await this.fetchPrice(binding.baseAsset, binding.quoteAsset);
      const timestamp = BigInt(Math.floor(observation.fetchedAt / 1000));
      const price = parseUnits(observation.amount, 8);
      const packedHash = solidityPackedKeccak256(
        ["address", "string", "string", "string", "int256", "uint64"],
        [binding.marketAddress, binding.baseAsset, "/", binding.quoteAsset, price, timestamp],
      );
      const signature = await this.oracle.signMessage(getBytes(packedHash));
      const resolveTx = await market.resolve(price, timestamp, signature);
      await resolveTx.wait();
      next.status = "resolved";
      next.resolveTxHash = resolveTx.hash;
      next.resolvedPrice = observation.amount;
      next.outcome =
        price >= parseUnits(binding.threshold, 8) ? "YES" : "NO";
      next.error = undefined;
    } catch (error) {
      next.status = "failed";
      next.error = error instanceof Error ? error.message : String(error);
    }
    next.updatedAt = Date.now();
    return next;
  }

  private async fetchPrice(baseAsset: string, quoteAsset: string): Promise<{
    amount: string;
    fetchedAt: number;
  }> {
    const response = await fetch(
      `https://api.coinbase.com/v2/prices/${encodeURIComponent(baseAsset)}-${encodeURIComponent(quoteAsset)}/spot`,
      { headers: { Accept: "application/json" } },
    );
    if (!response.ok) throw new Error("Price source is temporarily unavailable.");
    const payload = (await response.json()) as { data?: { amount?: string } };
    const amount = payload.data?.amount;
    if (!amount || !/^\d+(\.\d+)?$/.test(amount)) {
      throw new Error("Price source returned an invalid observation.");
    }
    return { amount, fetchedAt: Date.now() };
  }
}
