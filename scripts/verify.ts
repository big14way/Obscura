import hre from "hardhat";

// Verify all Sepolia contracts on Etherscan. Needs ETHERSCAN_API_KEY in .env.
// Run: npx hardhat run scripts/verify.ts --network sepolia
const D = "0x3C343AD077983371b29fee386bdBC8a92E934C51"; // treasury / deployer

const A = {
  usdc: "0x603B390a66Bae8EFa530D41ae563D5D4569a00B1",
  wbtc: "0x69511f0F5a629710D113B221dCE44B8650CFeC7a",
  weth: "0x8C658bEc9BC761910144A72377FcBEd9404a0557",
  core: "0x85c8Ba069e43A63C8272cBDd83C08Afc391FfC46",
  rep: "0x27947554B362034641330B97D2b8e30A617dEF69",
  lending: "0x413890977637cF1490E12f62aFfD1236D68e5f41",
  lp: "0x0A4AE2dDcC75887100719C65E3AA2a9296374438",
  gad: "0x64368aa0Cc2385908Cd9666a866Bdb10D94d3032",
  x402: "0xFd063287E37a833d631bFD47afcFDcB0E4841330",
  flash: "0x2700E6f99dBe91283aC17bB0D03a5E34Da484451",
};

const jobs = [
  { address: A.usdc, contract: "contracts/ConfidentialMockToken.sol:ConfidentialMockToken", args: ["Confidential USDT", "cUSDT", 6] },
  { address: A.wbtc, contract: "contracts/ConfidentialMockToken.sol:ConfidentialMockToken", args: ["Confidential WBTC", "cWBTC", 8] },
  { address: A.weth, contract: "contracts/ConfidentialMockToken.sol:ConfidentialMockToken", args: ["Confidential WETH", "cWETH", 6] },
  { address: A.core, contract: "contracts/ObscuraCore.sol:ObscuraCore", args: [D] },
  { address: A.rep, contract: "contracts/ReputationRegistry.sol:ReputationRegistry", args: [] },
  { address: A.lending, contract: "contracts/ObscuraLending.sol:ObscuraLending", args: [A.core, A.rep] },
  { address: A.lp, contract: "contracts/ObscuraLP.sol:ObscuraLP", args: [A.usdc, "Obscura LP cUSDT", "obsLP"] },
  { address: A.gad, contract: "contracts/ObscuraGAD.sol:ObscuraGAD", args: [A.core, A.rep, A.lending] },
  { address: A.x402, contract: "contracts/X402Receipt.sol:X402Receipt", args: [] },
  { address: A.flash, contract: "contracts/ObscuraFlash.sol:ObscuraFlash", args: [D] },
];

async function main() {
  for (const j of jobs) {
    try {
      await hre.run("verify:verify", { address: j.address, constructorArguments: j.args, contract: j.contract });
      console.log("✓ verified", j.contract.split(":")[1], j.address);
    } catch (e: any) {
      const m = (e.message || "").toLowerCase();
      if (m.includes("already verified")) console.log("• already verified", j.address);
      else console.log("✗", j.contract.split(":")[1], j.address, "—", e.message);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
