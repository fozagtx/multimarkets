/**
 * Live Coinbase Exchange/API spot price oracle.
 * NO mock fallback - throws if the price cannot be fetched.
 *
 * Endpoint: https://api.coinbase.com/v2/prices/{pair}/spot
 * pair examples: BTC-USD, ETH-USD
 */

export class CoinbaseOracleError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "CoinbaseOracleError";
  }
}

export interface CoinbaseSpotPrice {
  pair: string;
  amount: string;
  base: string;
  currency: string;
  source: "coinbase";
  fetchedAt: number;
  raw: unknown;
}

/**
 * Fetch LIVE spot price from Coinbase public API.
 * @param pair e.g. "BTC-USD" (also accepts "BTCUSD" or "BTC/USD")
 */
export async function fetchCoinbaseSpotPrice(
  pair: string,
): Promise<CoinbaseSpotPrice> {
  const normalized = normalizePair(pair);
  if (!normalized) {
    throw new CoinbaseOracleError(
      `Invalid Coinbase pair: "${pair}". Expected format like BTC-USD.`,
    );
  }

  const url = `https://api.coinbase.com/v2/prices/${encodeURIComponent(normalized)}/spot`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    throw new CoinbaseOracleError(
      `Coinbase oracle unreachable for ${normalized}`,
      err,
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new CoinbaseOracleError(
      `Coinbase oracle HTTP ${response.status} for ${normalized}: ${body.slice(0, 300)}`,
    );
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch (err) {
    throw new CoinbaseOracleError(
      `Coinbase oracle returned non-JSON for ${normalized}`,
      err,
    );
  }

  const data = (json as { data?: { amount?: string; base?: string; currency?: string } })
    ?.data;
  const amount = data?.amount;
  const base = data?.base;
  const currency = data?.currency;

  if (
    typeof amount !== "string" ||
    !amount ||
    Number.isNaN(Number(amount)) ||
    typeof base !== "string" ||
    typeof currency !== "string"
  ) {
    throw new CoinbaseOracleError(
      `Coinbase oracle returned invalid payload for ${normalized}: ${JSON.stringify(json).slice(0, 300)}`,
    );
  }

  return {
    pair: normalized,
    amount,
    base,
    currency,
    source: "coinbase",
    fetchedAt: Date.now(),
    raw: json,
  };
}

function normalizePair(pair: string): string | null {
  const cleaned = pair.trim().toUpperCase().replace(/\//g, "-");
  if (/^[A-Z0-9]{2,10}-[A-Z0-9]{2,10}$/.test(cleaned)) {
    return cleaned;
  }
  // BTCUSD → BTC-USD heuristic for common quote currencies
  const quotes = ["USDT", "USDC", "USD", "EUR", "GBP", "BTC", "ETH"];
  for (const q of quotes) {
    if (cleaned.endsWith(q) && cleaned.length > q.length) {
      const base = cleaned.slice(0, cleaned.length - q.length);
      if (base.length >= 2) return `${base}-${q}`;
    }
  }
  return null;
}
