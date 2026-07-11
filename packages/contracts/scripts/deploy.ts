import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { HASHKEY_MAINNET, HASHKEY_TESTNET } from "./constants";


/**
 * MultiMarkets / MultiMarkets deploy.
 * Default: HashKey **testnet (133)** + TestnetUSDT collateral (mint for faucet-era testing).
 * Mainnet (177) requires ALLOW_MAINNET=1 — do not use faucet flows on mainnet.
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  console.log("====================================================");
  console.log("MultiMarkets deployment (testnet-first)");
  console.log("Network:", network.name);
  console.log("Chain ID:", chainId);
  console.log("Deployer:", deployer.address);
  console.log(
    "Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "HSK",
  );
  console.log("====================================================");

  if (chainId === HASHKEY_MAINNET.chainId) {
    if (process.env.ALLOW_MAINNET !== "1") {
      throw new Error(
        "Refusing mainnet (177). MultiMarkets builds against HashKey testnet 133 + faucet. " +
          "Set ALLOW_MAINNET=1 only for intentional production deploys.",
      );
    }
    console.warn("⚠ ALLOW_MAINNET=1 — deploying to HashKey MAINNET");
  }

  if (chainId === HASHKEY_TESTNET.chainId) {
    console.log("Testnet 133 — get HSK gas from https://faucet.hsk.xyz/faucet");
  }

  const coinbaseSigner =
    process.env.COINBASE_ORACLE_SIGNER && process.env.COINBASE_ORACLE_SIGNER.length > 0
      ? process.env.COINBASE_ORACLE_SIGNER
      : deployer.address;

  // 0. Testnet collateral (TestnetUSDT) — mintable on chain 133 for development
  let collateralAddress = process.env.COLLATERAL_TOKEN || "";
  let testnetUsdtAddress = "";
  const deployTestnetUsdt =
    process.env.DEPLOY_TESTNET_USDT !== "0" &&
    (chainId === HASHKEY_TESTNET.chainId ||
      chainId === 31337 ||
      network.name === "hardhat" ||
      network.name === "localhost" ||
      !collateralAddress);

  if (deployTestnetUsdt && !collateralAddress) {
    const TestnetUSDT = await ethers.getContractFactory("TestnetUSDT");
    const tUsdt = await TestnetUSDT.deploy("Testnet USDT", "tUSDT", 6);
    await tUsdt.waitForDeployment();
    testnetUsdtAddress = await tUsdt.getAddress();
    collateralAddress = testnetUsdtAddress;
    await (await tUsdt.mint(deployer.address, ethers.parseUnits("1000000", 6))).wait();
    console.log("TestnetUSDT tUSDT:", testnetUsdtAddress);
    console.log("  Minted 1000000 tUSDT to deployer — teammates can call mint(address, amount)");
  }

  // 1. AgentRegistry
  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy(deployer.address);
  await agentRegistry.waitForDeployment();
  const agentRegistryAddress = await agentRegistry.getAddress();
  console.log("AgentRegistry:", agentRegistryAddress);

  // 2. MasterAgentGuard
  const MasterAgentGuard = await ethers.getContractFactory("MasterAgentGuard");
  const masterAgentGuard = await MasterAgentGuard.deploy(deployer.address);
  await masterAgentGuard.waitForDeployment();
  const masterAgentGuardAddress = await masterAgentGuard.getAddress();
  console.log("MasterAgentGuard:", masterAgentGuardAddress);

  // 3. CoinbaseOracleAdapter
  const CoinbaseOracleAdapter = await ethers.getContractFactory("CoinbaseOracleAdapter");
  const oracleAdapter = await CoinbaseOracleAdapter.deploy(deployer.address, coinbaseSigner);
  await oracleAdapter.waitForDeployment();
  const oracleAdapterAddress = await oracleAdapter.getAddress();
  console.log("CoinbaseOracleAdapter:", oracleAdapterAddress);

  // 4. ChatRoomFactory
  const ChatRoomFactory = await ethers.getContractFactory("ChatRoomFactory");
  const factory = await ChatRoomFactory.deploy(
    deployer.address,
    agentRegistryAddress,
    masterAgentGuardAddress,
    deployer.address,
  );
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("ChatRoomFactory:", factoryAddress);

  const authTx = await masterAgentGuard.setFactoryAuthorization(factoryAddress, true);
  await authTx.wait();
  console.log("Factory authorized on MasterAgentGuard");

  const webEnv: Record<string, string> = {
    NEXT_PUBLIC_HASHKEY_TESTNET_RPC: HASHKEY_TESTNET.rpc,
    NEXT_PUBLIC_CHAT_ROOM_FACTORY_ADDRESS: factoryAddress,
    NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS: agentRegistryAddress,
    NEXT_PUBLIC_ORACLE_ADAPTER_ADDRESS: oracleAdapterAddress,
    NEXT_PUBLIC_MASTER_AGENT_GUARD_ADDRESS: masterAgentGuardAddress,
  };
  if (collateralAddress) {
    webEnv.NEXT_PUBLIC_COLLATERAL_TOKEN_ADDRESS = collateralAddress;
  }

  const deployment = {
    network: network.name,
    chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    testnetOnly: chainId !== HASHKEY_MAINNET.chainId,
    faucet: {
      hsk: "https://faucet.hsk.xyz/faucet",
      rpc: HASHKEY_TESTNET.rpc,
      chainId: HASHKEY_TESTNET.chainId,
      note: "HSK for gas. tUSDT mint() for trade collateral on testnet deploys.",
    },
    outcomeCodes: {
      YES: 0,
      NO: 1,
      cancelSettlement: "use ChatRoom.cancelSettlement() for UNCLEAR/INVALID",
    },
    contracts: {
      AgentRegistry: agentRegistryAddress,
      MasterAgentGuard: masterAgentGuardAddress,
      CoinbaseOracleAdapter: oracleAdapterAddress,
      ChatRoomFactory: factoryAddress,
      ...(testnetUsdtAddress ? { TestnetUSDT: testnetUsdtAddress } : {}),
      ...(collateralAddress ? { CollateralToken: collateralAddress } : {}),
    },
    config: {
      coinbaseOracleSigner: coinbaseSigner,
      defaultSettlementAuthority: deployer.address,
    },
    webEnv,
    references:
      chainId === HASHKEY_MAINNET.chainId
        ? {
            tokens: HASHKEY_MAINNET.tokens,
            explorer: HASHKEY_MAINNET.explorer,
          }
        : chainId === HASHKEY_TESTNET.chainId
          ? {
              explorer: HASHKEY_TESTNET.explorer,
              rpc: HASHKEY_TESTNET.rpc,
            }
          : {},
  };

  const outDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outFile = path.join(outDir, `${network.name}-${chainId}.json`);
  fs.writeFileSync(outFile, JSON.stringify(deployment, null, 2));
  console.log("Wrote deployment artifact:", outFile);

  // Write TypeScript config for the web app (source of truth — not .env)
  const configTsPath = path.resolve(
    __dirname,
    "../../../apps/web/src/lib/config.ts",
  );
  const configTsFixed = `/**
 * MultiMarkets app config — source of truth in code.
 * Auto-updated by packages/contracts deploy (${deployment.timestamp})
 * Chain ${chainId} · Do not put private keys here.
 */

export const NETWORK = {
  chainId: ${chainId},
  name: "HashKey Chain Testnet",
  rpc: "https://testnet.hsk.xyz",
  explorer: "https://testnet-explorer.hsk.xyz",
  nativeCurrency: { name: "HSK", symbol: "HSK", decimals: 18 },
  faucet: "https://faucet.hsk.xyz/faucet",
} as const;

export const DEPLOYER = "${deployer.address}" as const;

export const CONTRACTS = {
  agentRegistry: "${agentRegistryAddress}",
  masterAgentGuard: "${masterAgentGuardAddress}",
  coinbaseOracleAdapter: "${oracleAdapterAddress}",
  chatRoomFactory: "${factoryAddress}",
  collateralToken: "${collateralAddress || ""}",
  testnetUsdt: "${testnetUsdtAddress || collateralAddress || ""}",
  /** Set when a room market is created on-chain */
  predictionMarket: "",
} as const;

export const OUTCOMES = {
  YES: 0,
  NO: 1,
} as const;

export const AGENT_API_URL = (
  process.env.NEXT_PUBLIC_AGENT_API_URL?.replace(/\\/$/, "") ||
  "http://localhost:8787"
);

export const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() || "";

export type Address = \`0x\${string}\`;

export function isConfiguredAddress(value: string): value is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}
`;
  fs.writeFileSync(configTsPath, configTsFixed, "utf8");
  console.log("Wrote web config.ts:", configTsPath);

  console.log("====================================================");
  console.log("Addresses are in apps/web/src/lib/config.ts (not .env)");
  console.log(JSON.stringify(webEnv, null, 2));
  console.log("Done. Restart Next.js if it is running.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
