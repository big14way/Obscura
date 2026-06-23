// Live END-TO-END test against Sepolia: full confidential flow with per-op gas.
// mint -> setOperator -> deposit -> borrow -> repay -> withdraw -> configureAgent -> LP deposit -> x402 record
// Run: node scripts/e2e.mjs
import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/node";

dotenv.config();
const RPC = process.env.SEPOLIA_RPC;
const PK = process.env.DEPLOYER_PK;

const A = {
  lending: "0x413890977637cF1490E12f62aFfD1236D68e5f41",
  lp: "0x0A4AE2dDcC75887100719C65E3AA2a9296374438",
  x402: "0xFd063287E37a833d631bFD47afcFDcB0E4841330",
  usdc: "0x603B390a66Bae8EFa530D41ae563D5D4569a00B1", // cUSDT 6d
  weth: "0x8C658bEc9BC761910144A72377FcBEd9404a0557", // cWETH 6d
};
const tokenAbi = ["function mint(address,uint64)", "function setOperator(address,uint48)"];
const lendingAbi = [
  "function deposit(address,bytes32,bytes)", "function borrow(address,bytes32,bytes)",
  "function repay(address,bytes32,bytes)", "function withdraw(address,bytes32,bytes)",
  "function configureAgent(bytes32,bytes,bool,bool)",
];
const lpAbi = ["function deposit(bytes32,bytes)"];
const x402Abi = ["function record(bytes32,address,address,bytes32,bytes)"];

const provider = new ethers.JsonRpcProvider(RPC);
const wallet = new ethers.Wallet(PK, provider);
const gas = {};

async function main() {
  console.log("wallet:", wallet.address);
  const instance = await createInstance({ ...SepoliaConfig, network: RPC });
  const until = Math.floor(Date.now() / 1000) + 3600;

  const weth = new ethers.Contract(A.weth, tokenAbi, wallet);
  const usdt = new ethers.Contract(A.usdc, tokenAbi, wallet);
  const lending = new ethers.Contract(A.lending, lendingAbi, wallet);
  const lp = new ethers.Contract(A.lp, lpAbi, wallet);
  const x402 = new ethers.Contract(A.x402, x402Abi, wallet);

  const enc = async (forContract, amt) => {
    const b = instance.createEncryptedInput(forContract, wallet.address);
    b.add64(amt);
    const e = await b.encrypt();
    return [ethers.hexlify(e.handles[0]), ethers.hexlify(e.inputProof)];
  };
  const run = async (label, txPromise) => {
    try { const r = await (await txPromise).wait(); gas[label] = Number(r.gasUsed); console.log(`  ✓ ${label}: ${r.gasUsed} gas`); }
    catch (e) { gas[label] = "FAIL"; console.log(`  ✗ ${label}: ${e.shortMessage || e.message}`); throw e; }
  };

  console.log("\n[setup] mint 5 cWETH + 2000 cUSDT, setOperators");
  await run("mint cWETH", weth.mint(wallet.address, 5_000000n));
  await run("mint cUSDT", usdt.mint(wallet.address, 2000_000000n));
  await run("setOperator cWETH", weth.setOperator(A.lending, until));
  await run("setOperator cUSDT->lending", usdt.setOperator(A.lending, until));
  await run("setOperator cUSDT->lp", usdt.setOperator(A.lp, until));

  console.log("\n[flow]");
  let [h, p] = await enc(A.lending, 1000_000000n);
  await run("configureAgent (limit 1000)", lending.configureAgent(h, p, true, true));
  [h, p] = await enc(A.lending, 3_000000n);
  await run("deposit 3 cWETH", lending.deposit(A.weth, h, p));
  [h, p] = await enc(A.lending, 500_000000n);
  await run("borrow 500 cUSDT", lending.borrow(A.usdc, h, p));
  [h, p] = await enc(A.lending, 200_000000n);
  await run("repay 200 cUSDT", lending.repay(A.usdc, h, p));
  [h, p] = await enc(A.lending, 1_000000n);
  await run("withdraw 1 cWETH", lending.withdraw(A.weth, h, p));
  [h, p] = await enc(A.lp, 300_000000n);
  await run("LP deposit 300 cUSDT", lp.deposit(h, p));
  [h, p] = await enc(A.x402, 1_500000n);
  const pid = ethers.hexlify(ethers.randomBytes(32));
  await run("x402 record", x402.record(pid, wallet.address, A.lending, h, p));

  console.log("\n=== GAS SUMMARY ===");
  for (const [k, v] of Object.entries(gas)) console.log(`  ${k.padEnd(28)} ${v}`);
  const writes = ["deposit 3 cWETH", "borrow 500 cUSDT", "repay 200 cUSDT", "withdraw 1 cWETH", "configureAgent (limit 1000)", "LP deposit 300 cUSDT", "x402 record"];
  const max = Math.max(...writes.map(w => typeof gas[w] === "number" ? gas[w] : 0));
  console.log(`\n  heaviest write: ${max} gas → suggest frontend gas limit ~${Math.ceil(max * 1.6 / 100000) * 100000}`);
}
main().catch((e) => { console.error("\nSTOPPED:", e.shortMessage || e.message); process.exit(1); });
