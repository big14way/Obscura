import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

// Idempotent post-deploy wiring for the Sepolia deployment (re-runnable after RPC hiccups).
const A = {
  core: "0x85c8Ba069e43A63C8272cBDd83C08Afc391FfC46",
  rep: "0x27947554B362034641330B97D2b8e30A617dEF69",
  lending: "0x413890977637cF1490E12f62aFfD1236D68e5f41",
  gad: "0x64368aa0Cc2385908Cd9666a866Bdb10D94d3032",
  usdc: "0x603B390a66Bae8EFa530D41ae563D5D4569a00B1", // cUSDT
  wbtc: "0x69511f0F5a629710D113B221dCE44B8650CFeC7a", // cWBTC
  weth: "0x8C658bEc9BC761910144A72377FcBEd9404a0557", // cWETH
};

async function withRetry<T>(label: string, fn: () => Promise<T>, tries = 5): Promise<T> {
  for (let i = 1; i <= tries; i++) {
    try {
      const r = await fn();
      console.log("✓", label);
      return r;
    } catch (e: any) {
      console.log(`… ${label} failed (attempt ${i}/${tries}): ${e.shortMessage || e.message}`);
      if (i === tries) throw e;
      await new Promise((res) => setTimeout(res, 4000));
    }
  }
  throw new Error("unreachable");
}

async function main() {
  const core = await ethers.getContractAt("ObscuraCore", A.core);
  const rep = await ethers.getContractAt("ReputationRegistry", A.rep);
  const lending = await ethers.getContractAt("ObscuraLending", A.lending);
  const cUSDT = await ethers.getContractAt("ConfidentialMockToken", A.usdc);

  const send = (label: string, p: () => Promise<any>) =>
    withRetry(label, async () => {
      const tx = await p();
      await tx.wait();
      return tx;
    });

  await send("setGad", () => lending.setGad(A.gad));
  await send("setWriter(lending)", () => rep.setWriter(A.lending, true));
  await send("setWriter(gad)", () => rep.setWriter(A.gad, true));
  await send("registerCollateral cWETH", () => core.registerCollateral(A.weth, 7500, 8000, 500, 6));
  await send("registerCollateral cWBTC", () => core.registerCollateral(A.wbtc, 7000, 7500, 500, 8));
  await send("registerBorrowable cUSDT", () => core.registerBorrowable(A.usdc, 900, 6));
  await send("price cWETH", () => core.updatePrice(A.weth, 2600_000000n));
  await send("price cWBTC", () => core.updatePrice(A.wbtc, 45000_000000n));
  await send("price cUSDT", () => core.updatePrice(A.usdc, 1_000000n));
  await send("seed lending cUSDT", () => cUSDT.mint(A.lending, 1_000_000_000_000n));

  console.log("\n✅ WIRED — protocol configured on Sepolia");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
