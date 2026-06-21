import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Deploys the confidential Obscura protocol.
 *
 * Local (FHEVM mock):   npm run deploy:local
 * Sepolia:              npm run deploy           (needs DEPLOYER_PK + SEPOLIA_RPC in .env)
 *
 * On Sepolia you can point collateral/borrowable at the OFFICIAL cTokenMocks instead of the
 * ConfidentialMockToken (see ZAMA_PORT.md §5.8): set USE_OFFICIAL_CTOKENS=true and the
 * cUSDT/cWETH addresses below. The ConfidentialMockToken path is for local Hardhat runs.
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // --- confidential test tokens (local) ---
  const Mock = await ethers.getContractFactory("ConfidentialMockToken");

  const cUSDT = await Mock.deploy("Confidential USDT", "cUSDT", 6);
  await cUSDT.waitForDeployment();
  const usdc = await cUSDT.getAddress();
  console.log("cUSDT:", usdc);

  const cWBTC = await Mock.deploy("Confidential WBTC", "cWBTC", 8);
  await cWBTC.waitForDeployment();
  const wbtc = await cWBTC.getAddress();
  console.log("cWBTC:", wbtc);

  const cWETH = await Mock.deploy("Confidential WETH", "cWETH", 6);
  await cWETH.waitForDeployment();
  const weth = await cWETH.getAddress();
  console.log("cWETH:", weth);

  // --- core protocol ---
  const Core = await ethers.getContractFactory("ObscuraCore");
  const core = await Core.deploy(deployer.address);
  await core.waitForDeployment();
  const coreAddr = await core.getAddress();
  console.log("Core:", coreAddr);

  const Rep = await ethers.getContractFactory("ReputationRegistry");
  const rep = await Rep.deploy();
  await rep.waitForDeployment();
  const repAddr = await rep.getAddress();
  console.log("ReputationRegistry:", repAddr);

  const Lending = await ethers.getContractFactory("ObscuraLending");
  const lending = await Lending.deploy(coreAddr, repAddr);
  await lending.waitForDeployment();
  const lendingAddr = await lending.getAddress();
  console.log("Lending:", lendingAddr);

  const LP = await ethers.getContractFactory("ObscuraLP");
  const lp = await LP.deploy(usdc, "Obscura LP cUSDT", "obsLP");
  await lp.waitForDeployment();
  console.log("LP:", await lp.getAddress());

  const GAD = await ethers.getContractFactory("ObscuraGAD");
  const gad = await GAD.deploy(coreAddr, repAddr, lendingAddr);
  await gad.waitForDeployment();
  const gadAddr = await gad.getAddress();
  console.log("GAD:", gadAddr);

  const X402 = await ethers.getContractFactory("X402Receipt");
  const x402 = await X402.deploy();
  await x402.waitForDeployment();
  console.log("X402Receipt:", await x402.getAddress());

  const Flash = await ethers.getContractFactory("ObscuraFlash");
  const flash = await Flash.deploy(deployer.address);
  await flash.waitForDeployment();
  console.log("Flash:", await flash.getAddress());

  // --- wiring ---
  await (await lending.setGad(gadAddr)).wait();
  await (await rep.setWriter(lendingAddr, true)).wait();
  await (await rep.setWriter(gadAddr, true)).wait();

  // --- register collateral + borrowable ---
  await (await core.registerCollateral(weth, 7500, 8000, 500, 6)).wait(); // cWETH
  await (await core.registerCollateral(wbtc, 7000, 7500, 500, 8)).wait(); // cWBTC
  await (await core.registerBorrowable(usdc, 900, 6)).wait(); // cUSDT (9% borrow)

  // --- seed prices (USD6) ---
  await (await core.updatePrice(weth, 2600_000000)).wait();
  await (await core.updatePrice(wbtc, 45000_000000)).wait();
  await (await core.updatePrice(usdc, 1_000000)).wait();

  // --- seed lending pool with cUSDT liquidity for demo borrows ---
  await (await cUSDT.mint(lendingAddr, 1_000_000_000_000n)).wait(); // 1,000,000 cUSDT (6d)

  console.log("\nWired writers + GAD, registered markets, seeded prices + pool liquidity.");
  console.log("\nFrontend env (app/.env.local):");
  console.log("NEXT_PUBLIC_CORE=" + coreAddr);
  console.log("NEXT_PUBLIC_LENDING=" + lendingAddr);
  console.log("NEXT_PUBLIC_LP=" + (await lp.getAddress()));
  console.log("NEXT_PUBLIC_GAD=" + gadAddr);
  console.log("NEXT_PUBLIC_REPUTATION=" + repAddr);
  console.log("NEXT_PUBLIC_X402=" + (await x402.getAddress()));
  console.log("NEXT_PUBLIC_FLASH=" + (await flash.getAddress()));
  console.log("NEXT_PUBLIC_USDC=" + usdc);
  console.log("NEXT_PUBLIC_WETH=" + weth);
  console.log("NEXT_PUBLIC_WBTC=" + wbtc);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
