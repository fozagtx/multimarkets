import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

// Only from process env for this run (set by deploy-testnet.sh prompt). Never required in .env.
const configuredPrivateKey =
  process.env.PRIVATE_KEY || process.env.MASTER_RELAYER_PRIVATE_KEY;
const PRIVATE_KEY =
  configuredPrivateKey && configuredPrivateKey.length > 0
    ? configuredPrivateKey
    : "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // hardhat default — local only

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
      evmVersion: "cancun",
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    hashkeyTestnet: {
      url: process.env.HASHKEY_TESTNET_RPC || "https://testnet.hsk.xyz",
      chainId: 133,
      accounts: [PRIVATE_KEY],
    },
    hashkey: {
      url: process.env.HASHKEY_MAINNET_RPC || "https://mainnet.hsk.xyz",
      chainId: 177,
      accounts: [PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      hashkey: process.env.HASHKEY_EXPLORER_API_KEY || "empty",
      hashkeyTestnet: process.env.HASHKEY_EXPLORER_API_KEY || "empty",
    },
    customChains: [
      {
        network: "hashkey",
        chainId: 177,
        urls: {
          apiURL: "https://hashkey.blockscout.com/api",
          browserURL: "https://hashkey.blockscout.com",
        },
      },
      {
        network: "hashkeyTestnet",
        chainId: 133,
        urls: {
          apiURL: "https://testnet-explorer.hsk.xyz/api",
          browserURL: "https://testnet-explorer.hsk.xyz",
        },
      },
    ],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
  mocha: {
    timeout: 120_000,
  },
};

export default config;
