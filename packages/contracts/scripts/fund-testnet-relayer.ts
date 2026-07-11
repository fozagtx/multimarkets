import { ethers } from "hardhat";

async function main(): Promise<void> {
  const recipient = process.env.RELAYER_ADDRESS?.trim();
  if (!recipient || !ethers.isAddress(recipient)) {
    throw new Error("RELAYER_ADDRESS must be a valid recipient address.");
  }
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  if (chainId !== 133) throw new Error("Refusing to send outside HashKey testnet (133).");

  const amount = ethers.parseEther(process.env.RELAYER_FUND_AMOUNT ?? "0.1");
  const [sender] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(sender.address);
  if (balance <= amount) throw new Error("Deployer balance is insufficient for this transfer and gas.");

  const transaction = await sender.sendTransaction({ to: recipient, value: amount });
  await transaction.wait();
  console.log(`Funded ${recipient} with ${ethers.formatEther(amount)} test HSK: ${transaction.hash}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
