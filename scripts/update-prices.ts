import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const coreAddress = process.env.CORE_ADDRESS || "";
  if (!coreAddress) throw new Error("Missing CORE_ADDRESS in .env");

  const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,usd-coin&vs_currencies=usd");
  if (!res.ok) throw new Error(`Price fetch failed: ${res.status}`);
  const data = await res.json();

  const eth = data?.ethereum?.usd;
  const btc = data?.bitcoin?.usd;
  const usdc = data?.["usd-coin"]?.usd;
  if (!eth || !btc || !usdc) throw new Error("Invalid price response");

  const [deployer] = await ethers.getSigners();
  const core = await ethers.getContractAt("ObscuraCore", coreAddress, deployer);

  const toUsd6 = (v: number) => BigInt(Math.round(v * 1e6));

  const weth = (process.env.WETH_ADDRESS || "").trim();
  const wbtc = (process.env.WBTC_ADDRESS || "").trim();
  const usdcAddr = (process.env.USDC_ADDRESS || "").trim();

  await (await core.updatePrice(weth, toUsd6(eth))).wait();
  await (await core.updatePrice(wbtc, toUsd6(btc))).wait();
  await (await core.updatePrice(usdcAddr, toUsd6(usdc))).wait();

  console.log("Updated prices:", { eth, btc, usdc });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
