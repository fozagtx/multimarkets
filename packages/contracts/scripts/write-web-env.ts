/**
 * Merge deployment webEnv into apps/web/.env.local
 * Keeps existing non-contract keys (WalletConnect, agent API, etc.)
 */
import * as fs from "fs";
import * as path from "path";

export type WebEnvMap = Record<string, string>;

const WEB_ENV_KEYS = [
  "NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS",
  "NEXT_PUBLIC_CHAT_ROOM_FACTORY_ADDRESS",
  "NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS",
  "NEXT_PUBLIC_ORACLE_ADAPTER_ADDRESS",
  "NEXT_PUBLIC_COLLATERAL_TOKEN_ADDRESS",
  "NEXT_PUBLIC_MASTER_AGENT_GUARD_ADDRESS",
] as const;

export function mergeWebEnvFile(
  envPath: string,
  updates: WebEnvMap,
  extraLines: string[] = [],
): void {
  let existing = "";
  if (fs.existsSync(envPath)) {
    existing = fs.readFileSync(envPath, "utf8");
  }

  const lines = existing.split(/\r?\n/);
  const map = new Map<string, string>();
  const order: string[] = [];
  const comments: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      if (trimmed) comments.push(line);
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const k = trimmed.slice(0, eq).trim();
    const v = trimmed.slice(eq + 1);
    if (!map.has(k)) order.push(k);
    map.set(k, v);
  }

  for (const [k, v] of Object.entries(updates)) {
    if (!map.has(k)) order.push(k);
    map.set(k, v);
  }

  // Ensure defaults for local agents
  if (!map.has("NEXT_PUBLIC_AGENT_API_URL")) {
    order.unshift("NEXT_PUBLIC_AGENT_API_URL");
    map.set("NEXT_PUBLIC_AGENT_API_URL", "http://localhost:8787");
  }
  if (!map.has("NEXT_PUBLIC_HASHKEY_TESTNET_RPC")) {
    order.unshift("NEXT_PUBLIC_HASHKEY_TESTNET_RPC");
    map.set("NEXT_PUBLIC_HASHKEY_TESTNET_RPC", "https://testnet.hsk.xyz");
  }

  const out: string[] = [
    "# MultiMarkets — generated / merged by contracts deploy (HashKey testnet 133)",
    "# Gas faucet: https://faucet.hsk.xyz/faucet",
    "# Do not commit real secrets. PRIVATE_KEY never goes here.",
    "",
  ];

  for (const k of order) {
    out.push(`${k}=${map.get(k) ?? ""}`);
  }

  if (extraLines.length) {
    out.push("", "# --- deploy notes ---", ...extraLines);
  }

  fs.mkdirSync(path.dirname(envPath), { recursive: true });
  fs.writeFileSync(envPath, out.join("\n") + "\n", "utf8");
}

export function webEnvPathFromContracts(): string {
  // packages/contracts/scripts -> packages/contracts -> packages -> mm -> apps/web
  return path.resolve(__dirname, "../../../apps/web/.env.local");
}

export { WEB_ENV_KEYS };
