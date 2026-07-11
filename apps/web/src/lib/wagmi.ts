"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { hashkey, hashkeyTestnet } from "./chains";
import { NETWORK, WALLETCONNECT_PROJECT_ID } from "./config";

/**
 * Argue: HashKey testnet 133 first (from config.ts).
 * WalletConnect project id lives in config.ts if you need it — not .env.
 */
export const config = getDefaultConfig({
  appName: "Argue",
  projectId: WALLETCONNECT_PROJECT_ID || "00000000000000000000000000000000",
  chains: [hashkeyTestnet, hashkey],
  ssr: true,
  transports: {
    [hashkeyTestnet.id]: http(NETWORK.rpc),
    [hashkey.id]: http("https://mainnet.hsk.xyz"),
  },
});

export const isWalletConnectConfigured = Boolean(WALLETCONNECT_PROJECT_ID.trim());

export const DEFAULT_CHAIN = hashkeyTestnet;
export const DEFAULT_CHAIN_ID = hashkeyTestnet.id;
