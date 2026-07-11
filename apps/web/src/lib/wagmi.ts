"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { hashkey, hashkeyTestnet } from "./chains";
import { NETWORK, WALLETCONNECT_PROJECT_ID } from "./config";

/**
 * Argue: HashKey testnet 133 first (from config.ts).
 * WalletConnect project id lives in config.ts if you need it — not .env.
 */
const transports = {
  [hashkeyTestnet.id]: http(NETWORK.rpc),
  [hashkey.id]: http("https://mainnet.hsk.xyz"),
};

export const isWalletConnectConfigured =
  Boolean(WALLETCONNECT_PROJECT_ID.trim()) &&
  !/^0+$/.test(WALLETCONNECT_PROJECT_ID.trim());

export const config = isWalletConnectConfigured
  ? getDefaultConfig({
      appName: "Argue",
      projectId: WALLETCONNECT_PROJECT_ID,
      chains: [hashkeyTestnet, hashkey],
      ssr: true,
      transports,
    })
  : createConfig({
      chains: [hashkeyTestnet, hashkey],
      connectors: [injected()],
      ssr: true,
      transports,
    });


export const DEFAULT_CHAIN = hashkeyTestnet;
export const DEFAULT_CHAIN_ID = hashkeyTestnet.id;
