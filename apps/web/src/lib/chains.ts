import { defineChain } from "viem";
import {
  NETWORK,
  CONTRACTS as CONFIG_CONTRACTS,
  AGENT_API_URL as CONFIG_AGENT_API_URL,
} from "./config";

/** HashKey Chain Testnet — from config.ts (not env) */
export const hashkeyTestnet = defineChain({
  id: NETWORK.chainId,
  name: NETWORK.name,
  nativeCurrency: { ...NETWORK.nativeCurrency },
  rpcUrls: {
    default: { http: [NETWORK.rpc] },
  },
  blockExplorers: {
    default: { name: "HashKey Testnet Explorer", url: NETWORK.explorer },
  },
  testnet: true,
});

/** Mainnet kept for later — not the app default */
export const hashkey = defineChain({
  id: 177,
  name: "HashKey Chain",
  nativeCurrency: { name: "HSK", symbol: "HSK", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://mainnet.hsk.xyz"] },
  },
  blockExplorers: {
    default: { name: "HashKey Explorer", url: "https://hashkey.blockscout.com" },
  },
});

export const HASHKEY_TOKENS = {
  mainnet: {
    USDT: "0xf1b50ed67a9e2cc94ad3c477779e2d4cbfff9029" as const,
    USDC: "0x054ed45810DbBAb8B27668922D110669c9D88D0a" as const,
    WHSK: "0xB210D2120d57b758EE163cFfb43e73728c471Cf1" as const,
    WETH: "0xefd4bC9afD210517803f293ABABd701CaeeCdfd0" as const,
  },
} as const;

/** On-chain addresses — from config.ts */
export const CONTRACTS = {
  agentRegistry: CONFIG_CONTRACTS.agentRegistry as `0x${string}`,
  chatRoomFactory: CONFIG_CONTRACTS.chatRoomFactory as `0x${string}`,
  predictionMarket: CONFIG_CONTRACTS.predictionMarket as `0x${string}`,
  collateralToken: CONFIG_CONTRACTS.collateralToken as `0x${string}`,
  coinbaseOracleAdapter: CONFIG_CONTRACTS.coinbaseOracleAdapter as `0x${string}`,
  masterAgentGuard: CONFIG_CONTRACTS.masterAgentGuard as `0x${string}`,
  testnetUsdt: CONFIG_CONTRACTS.testnetUsdt as `0x${string}`,
};

export const AGENT_API_URL = CONFIG_AGENT_API_URL;

export const FAUCET_URL = NETWORK.faucet;
