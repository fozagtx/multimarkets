import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Contract, JsonRpcProvider } from "ethers";

type Deployment = {
  chainId: number;
  faucet: { rpc: string };
  contracts: {
    AgentRegistry: string;
    MasterAgentGuard: string;
    CoinbaseOracleAdapter: string;
    ChatRoomFactory: string;
    TestnetUSDT: string;
  };
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const deploymentPath = resolve(
  __dirname,
  "../deployments/hashkeyTestnet-133.json",
);

async function main(): Promise<void> {
  const deployment = JSON.parse(
    await readFile(deploymentPath, "utf8"),
  ) as Deployment;
  if (deployment.chainId !== 133) {
    throw new Error(`Expected chain 133, received ${deployment.chainId}`);
  }

  const provider = new JsonRpcProvider(
    process.env.HASHKEY_TESTNET_RPC || deployment.faucet.rpc,
    deployment.chainId,
    { staticNetwork: true },
  );
  const network = await provider.getNetwork();
  if (network.chainId !== BigInt(deployment.chainId)) {
    throw new Error(`RPC returned unexpected chain ${network.chainId}`);
  }

  const entries = Object.entries(deployment.contracts);
  for (const [name, address] of entries) {
    const code = await provider.getCode(address);
    if (code === "0x") throw new Error(`${name} has no deployed bytecode`);
    console.log(`${name}: deployed (${(code.length - 2) / 2} bytes)`);
  }

  const registry = new Contract(
    deployment.contracts.AgentRegistry,
    ["function agentCount() view returns (uint256)"],
    provider,
  );
  const factory = new Contract(
    deployment.contracts.ChatRoomFactory,
    [
      "function roomCount() view returns (uint256)",
      "function agentRegistry() view returns (address)",
      "function masterAgentGuard() view returns (address)",
      "function defaultSettlementAuthority() view returns (address)",
    ],
    provider,
  );

  const [agentCount, roomCount, registryAddress, guardAddress, authority] =
    await Promise.all([
      registry.agentCount(),
      factory.roomCount(),
      factory.agentRegistry(),
      factory.masterAgentGuard(),
      factory.defaultSettlementAuthority(),
    ]);
  if (
    registryAddress.toLowerCase() !==
    deployment.contracts.AgentRegistry.toLowerCase()
  ) {
    throw new Error("Factory points to an unexpected agent registry");
  }
  if (
    guardAddress.toLowerCase() !==
    deployment.contracts.MasterAgentGuard.toLowerCase()
  ) {
    throw new Error("Factory points to an unexpected master guard");
  }

  console.log(`Agent registry count: ${agentCount}`);
  console.log(`Factory room count: ${roomCount}`);
  console.log(`Settlement authority: ${authority}`);
  console.log("HashKey testnet read-only probe passed.");
}

main().catch((error: unknown) => {
  console.error("HashKey testnet probe failed:", error);
  process.exitCode = 1;
});
