/**
 * Argue app config — source of truth in code.
 * Deployed HashKey Testnet (133) · 2026-07-11
 * Do not put private keys here. Public addresses + public URLs only.
 */

export const NETWORK = {
  chainId: 133,
  name: "HashKey Chain Testnet",
  rpc: "https://testnet.hsk.xyz",
  explorer: "https://testnet-explorer.hsk.xyz",
  nativeCurrency: { name: "HSK", symbol: "HSK", decimals: 18 },
  faucet: "https://faucet.hsk.xyz/faucet",
} as const;

/** Deployer that published these contracts */
export const DEPLOYER = "0xDe5df44009FD2E13bBAcfED2b8e3833B5Dc4Bf21" as const;

/**
 * On-chain addresses (HashKey testnet 133).
 * From packages/contracts/deployments/hashkeyTestnet-133.json
 */
export const CONTRACTS = {
  agentRegistry: "0xA0fEF298aA72AebB5f537BF09221F0F2843c0c06",
  masterAgentGuard: "0x32A69a587488EB9664A7F7E6f6a6a2B33657446A",
  coinbaseOracleAdapter: "0x7d6803Ab43E41963f871cBffFf3F0995d36E0048",
  chatRoomFactory: "0xdE7B54ef04Bf5939505A933EBE59390504d73f75",
  /** Oracle-settled market factory; per-room market addresses come from the agents service. */
  oracleThresholdMarketFactory: "0xf58c3968ab9D75501c20097964334B95c337bA45",
  /** TestnetUSDT (tUSDT) — mintable collateral */
  collateralToken: "0x2133358Da6CeD8dD5E318A2342e5e0C237A0a09b",
  testnetUsdt: "0x2133358Da6CeD8dD5E318A2342e5e0C237A0a09b",
  /** Set when a room market is created on-chain */
  predictionMarket: "",
} as const;

/** Binary market outcomes (must match Solidity OutcomeCodes) */
export const OUTCOMES = {
  YES: 0,
  NO: 1,
} as const;

/**
 * Agents HTTP runtime.
 * Local default; override with NEXT_PUBLIC_AGENT_API_URL on Railway/prod.
 */
export const AGENT_API_URL = (
  process.env.NEXT_PUBLIC_AGENT_API_URL?.replace(/\/$/, "") ||
  "http://localhost:8787"
);

/**
 * WalletConnect Cloud project id — public client id only (not a private key).
 * Leave empty to use RainbowKit without WC cloud features if unsupported.
 * Get one at https://cloud.walletconnect.com if needed.
 */
export const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() || "";

export type Address = `0x${string}`;

export function isConfiguredAddress(value: string): value is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}
