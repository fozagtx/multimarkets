/**
 * HashKey / APRO price feed via JSON-RPC eth_call when configured.
 * Requires HASHKEY_RPC_URL (or APRO_RPC_URL) and HASHKEY_PRICE_FEED_ADDRESS.
 * NO mock fallback - throws if not configured or call fails.
 */

export class HashkeyOracleError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "HashkeyOracleError";
  }
}

export interface HashkeyOracleConfig {
  rpcUrl?: string;
  feedAddress?: string;
  /** ABI-encoded call data; defaults to latestAnswer() selector used by many aggregators */
  callData?: string;
  /** Decimals for formatting; default 8 */
  decimals?: number;
}

export interface HashkeyPrice {
  amount: string;
  raw: string;
  feedAddress: string;
  source: "hashkey-apro";
  fetchedAt: number;
  blockTag: string;
}

/** latestAnswer() selector: keccak256("latestAnswer()")[0:4] = 0x50d25bcd */
const DEFAULT_LATEST_ANSWER = "0x50d25bcd";

export async function fetchHashkeyAproPrice(
  config: HashkeyOracleConfig = {},
): Promise<HashkeyPrice> {
  const rpcUrl = (
    config.rpcUrl ??
    process.env.HASHKEY_RPC_URL ??
    process.env.APRO_RPC_URL ??
    ""
  ).trim();
  const feedAddress = (
    config.feedAddress ??
    process.env.HASHKEY_PRICE_FEED_ADDRESS ??
    process.env.APRO_PRICE_FEED_ADDRESS ??
    ""
  ).trim();
  const callData = (
    config.callData ??
    process.env.HASHKEY_PRICE_CALLDATA ??
    DEFAULT_LATEST_ANSWER
  ).trim();
  const decimals = config.decimals ?? Number(process.env.HASHKEY_PRICE_DECIMALS ?? 8);

  if (!rpcUrl) {
    throw new HashkeyOracleError(
      "HashKey/APRO oracle not configured: set HASHKEY_RPC_URL or APRO_RPC_URL",
    );
  }
  if (!feedAddress || !/^0x[a-fA-F0-9]{40}$/.test(feedAddress)) {
    throw new HashkeyOracleError(
      "HashKey/APRO oracle not configured: set HASHKEY_PRICE_FEED_ADDRESS to a valid 0x address",
    );
  }

  let response: Response;
  try {
    response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [
          {
            to: feedAddress,
            data: callData,
          },
          "latest",
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    throw new HashkeyOracleError("HashKey/APRO RPC request failed", err);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new HashkeyOracleError(
      `HashKey/APRO RPC HTTP ${response.status}: ${body.slice(0, 300)}`,
    );
  }

  const json = (await response.json()) as {
    result?: string;
    error?: { message?: string; code?: number };
  };

  if (json.error) {
    throw new HashkeyOracleError(
      `HashKey/APRO eth_call error: ${json.error.message ?? JSON.stringify(json.error)}`,
    );
  }

  const result = json.result;
  if (typeof result !== "string" || !result.startsWith("0x") || result === "0x") {
    throw new HashkeyOracleError(
      `HashKey/APRO eth_call returned empty/invalid result: ${String(result)}`,
    );
  }

  const rawBig = BigInt(result);
  // Handle int256 negative (unlikely for price feeds but safe)
  const signed =
    rawBig > BigInt("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")
      ? rawBig - BigInt("0x10000000000000000000000000000000000000000000000000000000000000000")
      : rawBig;

  if (signed <= 0n) {
    throw new HashkeyOracleError(
      `HashKey/APRO feed returned non-positive price: ${signed.toString()}`,
    );
  }

  const amount = formatUnits(signed, Number.isFinite(decimals) ? decimals : 8);

  return {
    amount,
    raw: signed.toString(),
    feedAddress,
    source: "hashkey-apro",
    fetchedAt: Date.now(),
    blockTag: "latest",
  };
}

function formatUnits(value: bigint, decimals: number): string {
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const frac = value % base;
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return fracStr.length > 0 ? `${whole}.${fracStr}` : whole.toString();
}
