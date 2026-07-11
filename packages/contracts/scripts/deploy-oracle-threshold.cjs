const { readFileSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");
const {
  ContractFactory,
  JsonRpcProvider,
  Wallet,
} = require("ethers");

async function main() {
  const rpcUrl = process.env.HASHKEY_RPC_URL || "https://testnet.hsk.xyz";
  const provider = new JsonRpcProvider(rpcUrl, 133, { staticNetwork: true });
  const network = await provider.getNetwork();
  if (network.chainId !== 133n) throw new Error(`Expected HashKey testnet, received ${network.chainId}.`);

  const privateKey = process.env.MASTER_RELAYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!privateKey) throw new Error("MASTER_RELAYER_PRIVATE_KEY is required.");
  const signer = new Wallet(privateKey, provider);
  const existing = JSON.parse(
    readFileSync(resolve(__dirname, "../deployments/hashkeyTestnet-133.json"), "utf8"),
  );
  const collateral =
    process.env.COLLATERAL_TOKEN ||
    existing.contracts.CollateralToken ||
    existing.contracts.TestnetUSDT;
  if (!collateral) throw new Error("COLLATERAL_TOKEN is required.");

  const artifact = JSON.parse(
    readFileSync(
      resolve(
        __dirname,
        "../artifacts/contracts/OracleThresholdMarketFactory.sol/OracleThresholdMarketFactory.json",
      ),
      "utf8",
    ),
  );
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, signer);
  const contract = await factory.deploy(
    signer.address,
    collateral,
    process.env.ORACLE_SIGNER_ADDRESS || signer.address,
    signer.address,
    Number(process.env.ORACLE_MARKET_MAX_PRICE_AGE || 3600),
    Number(process.env.ORACLE_MARKET_FEE_BPS || 0),
    BigInt(process.env.ORACLE_MARKET_MIN_STAKE || "1000000"),
  );
  const deploymentTx = contract.deploymentTransaction();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  const output = {
    network: "hashkeyTestnet",
    chainId: 133,
    testnetOnly: true,
    deployer: signer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      OracleThresholdMarketFactory: address,
      CollateralToken: collateral,
    },
    config: {
      oracleSigner: process.env.ORACLE_SIGNER_ADDRESS || signer.address,
      settlementAuthority: signer.address,
      maxPriceAge: Number(process.env.ORACLE_MARKET_MAX_PRICE_AGE || 3600),
      feeBps: Number(process.env.ORACLE_MARKET_FEE_BPS || 0),
      minStake: process.env.ORACLE_MARKET_MIN_STAKE || "1000000",
    },
    transactionHash: deploymentTx.hash,
  };
  const destination = resolve(__dirname, "../deployments/oracleThreshold-hashkeyTestnet-133.json");
  writeFileSync(destination, `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify(output));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
