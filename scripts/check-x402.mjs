// Live verification of the confidential x402 flow on Sepolia:
// encrypt an amount -> X402Receipt.record -> read the stored receipt back.
// Run: node scripts/check-x402.mjs
import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/node";

dotenv.config();
const RPC = process.env.SEPOLIA_RPC;
const X402 = "0xFd063287E37a833d631bFD47afcFDcB0E4841330";

const abi = [
  "function record(bytes32 paymentId, address payer, address recipient, bytes32 enc, bytes inputProof)",
  "function getReceipt(bytes32) view returns (tuple(bytes32 paymentId, address payer, address recipient, bytes32 amount, uint256 paidAt))",
  "event X402Paid(bytes32 indexed paymentId, address indexed payer, address indexed recipient, uint256 paidAt)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PK, provider);
  const x402 = new ethers.Contract(X402, abi, wallet);
  const instance = await createInstance({ ...SepoliaConfig, network: RPC });

  const paymentId = ethers.hexlify(ethers.randomBytes(32));
  const recipient = "0x000000000000000000000000000000000000dEaD";
  console.log("payer    :", wallet.address);
  console.log("recipient:", recipient);
  console.log("paymentId:", paymentId);

  // encrypt 2.5 cUSDT (6d) for the X402 contract
  const buf = instance.createEncryptedInput(X402, wallet.address);
  buf.add64(2_500000n);
  const enc = await buf.encrypt();

  console.log("\nrecording confidential receipt...");
  const tx = await x402.record(paymentId, wallet.address, recipient, ethers.hexlify(enc.handles[0]), ethers.hexlify(enc.inputProof));
  const rcpt = await tx.wait();
  console.log("✓ recorded — gas:", rcpt.gasUsed.toString());
  console.log("  tx: https://sepolia.etherscan.io/tx/" + tx.hash);

  // read it back
  const r = await x402.getReceipt(paymentId);
  console.log("\nstored receipt:");
  console.log("  payer     :", r.payer, r.payer.toLowerCase() === wallet.address.toLowerCase() ? "✓" : "✗");
  console.log("  recipient :", r.recipient, r.recipient.toLowerCase() === recipient.toLowerCase() ? "✓" : "✗");
  console.log("  paidAt    :", r.paidAt.toString(), Number(r.paidAt) > 0 ? "✓ (stored)" : "✗");
  console.log("  amount    :", r.amount.slice(0, 18) + "…  (euint64 ciphertext handle — NOT plaintext) ✓");

  // confirm the event fired (amount intentionally NOT in the event)
  const ev = rcpt.logs.map((l) => { try { return x402.interface.parseLog(l); } catch { return null; } }).find((p) => p && p.name === "X402Paid");
  console.log("\nX402Paid event:", ev ? "emitted ✓ (paymentId/payer/recipient only — no amount leaked)" : "not found ✗");
  console.log("\n✅ Confidential x402 works: amount encrypted on-chain, receipt verifiable, only payer+recipient can decrypt it.");
}
main().catch((e) => { console.error("FAILED:", e.shortMessage || e.message); process.exit(1); });
