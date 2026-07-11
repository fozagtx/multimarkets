import { ethers, network } from "hardhat";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

type ExistingDeployment = {
  chainId: number;
  contracts: {
    CollateralToken?: string;
    TestnetUSDT?: string;
  };
};

async function main(): Promise<void> {
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  if (chainId !== 133) {
    throw new Error(`Oracle threshold deployment is HashKey testnet only (received ${chainId}).`);
  }

  const [deployer] = await ethers.getSigners();
  const legacy = JSON.parse(
    await readFile(resolve(__dirname, "../deployments/hashkeyTestnet-133.json"), "utf8"),
  ) as ExistingDeployment;
  const collateral =
    process.env.COLLATERAL_TOKEN ??
    legacy.contracts.CollateralToken ??
    legacy.contracts.TestnetUSDT;
  if (!collateral) throw new Error("COLLATERAL_TOKEN is required.");

  const oracleSigner = process.env.ORACLE_SIGNER_ADDRESS ?? deployer.address;
  const minStake = BigInt(process.env.ORACLE_MARKET_MIN_STAKE ?? "1000000");
  const maxPriceAge = Number(process.env.ORACLE_MARKET_MAX_PRICE_AGE ?? 3600);
  const feeBps = Number(process.env.ORACLE_MARKET_FEE_BPS ?? 0);
  const Factory = await ethers.getContractFactory("OracleThresholdMarketFactory");
  const factory = await Factory.deploy(
    deployer.address,
    collateral,
    oracleSigner,
    deployer.address,
    maxPriceAge,
    feeBps,
    minStake,
  );
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();

  const deployment = {
    network: network.name,
    chainId,
    testnetOnly: true,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      OracleThresholdMarketFactory: factoryAddress,
      CollateralToken: collateral,
    },
    config: {
      oracleSigner,
      settlementAuthority: deployer.address,
      maxPriceAge,
      feeBps,
      minStake: minStake.toString(),
    },
    webEnv: {
      NEXT_PUBLIC_ORACLE_THRESHOLD_FACTORY_ADDRESS: factoryAddress,
      NEXT_PUBLIC_COLLATERAL_TOKEN_ADDRESS: collateral,
      NEXT_PUBLIC_HASHKEY_TESTNET_RPC: "https://testnet.hsk.xyz",
    },
  };
  const output = resolve(__dirname, "../deployments/oracleThreshold-hashkeyTestnet-133.json");
  await writeFile(output, `${JSON.stringify(deployment, null, 2)}\n`);
  console.log(`OracleThresholdMarketFactory: ${factoryAddress}`);
  console.log(`Wrote deployment artifact: ${output}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
