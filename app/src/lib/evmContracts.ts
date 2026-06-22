// Obscura — confidential agentic credit on the Zama Protocol (FHEVM), deployed on Ethereum Sepolia.
// Defaults below are the LIVE, Etherscan-verified deployment (deployed 2026-06; see README).
// Override any of them with NEXT_PUBLIC_* env vars (e.g. app/.env.local after a fresh deploy).

export const CONTRACTS = {
  // Confidential Obscura protocol (live Sepolia deployment)
  core: process.env.NEXT_PUBLIC_CORE || "0x85c8Ba069e43A63C8272cBDd83C08Afc391FfC46",
  lending: process.env.NEXT_PUBLIC_LENDING || "0x413890977637cF1490E12f62aFfD1236D68e5f41",
  lp: process.env.NEXT_PUBLIC_LP || "0x0A4AE2dDcC75887100719C65E3AA2a9296374438",
  gad: process.env.NEXT_PUBLIC_GAD || "0x64368aa0Cc2385908Cd9666a866Bdb10D94d3032",
  reputation: process.env.NEXT_PUBLIC_REPUTATION || "0x27947554B362034641330B97D2b8e30A617dEF69",
  x402: process.env.NEXT_PUBLIC_X402 || "0xFd063287E37a833d631bFD47afcFDcB0E4841330",
  flash: process.env.NEXT_PUBLIC_FLASH || "0x2700E6f99dBe91283aC17bB0D03a5E34Da484451",

  // Confidential ERC-7984 tokens (our deployed ConfidentialMockTokens — faucet-mintable)
  usdc: process.env.NEXT_PUBLIC_USDC || "0x603B390a66Bae8EFa530D41ae563D5D4569a00B1", // cUSDT
  wbtc: process.env.NEXT_PUBLIC_WBTC || "0x69511f0F5a629710D113B221dCE44B8650CFeC7a", // cWBTC
  weth: process.env.NEXT_PUBLIC_WETH || "0x8C658bEc9BC761910144A72377FcBEd9404a0557", // cWETH
};

// Official Zama Wrappers Registry on Sepolia (ERC-20 <-> ERC-7984 pairs).
export const WRAPPERS_REGISTRY = "0x2f0750Bbb0A246059d80e94c454586a7F27a128e";

// Network config — Ethereum Sepolia (FHEVM coprocessor)
export const SEPOLIA_CONFIG = {
  chainId: 11155111,
  name: "Ethereum Sepolia",
  rpc: process.env.NEXT_PUBLIC_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
  explorer: "https://sepolia.etherscan.io",
};

// Token display decimals (must match the on-chain ERC-7984 token decimals).
export const TOKEN_DECIMALS: Record<string, number> = {
  [CONTRACTS.usdc.toLowerCase()]: 6,
  [CONTRACTS.weth.toLowerCase()]: 6,
  [CONTRACTS.wbtc.toLowerCase()]: 8,
};
