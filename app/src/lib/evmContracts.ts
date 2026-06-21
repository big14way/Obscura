// Obscura — confidential agentic credit on the Zama Protocol (FHEVM), deployed on Sepolia.
// Protocol addresses come from the deploy script (scripts/deploy-all.ts) via NEXT_PUBLIC_* env.
// Token defaults point at the OFFICIAL Sepolia cTokenMocks + Wrappers Registry (ZAMA_PORT.md §5.8).

export const CONTRACTS = {
  // Confidential Obscura protocol (fill from deploy output -> app/.env.local)
  core: process.env.NEXT_PUBLIC_CORE || "",
  lending: process.env.NEXT_PUBLIC_LENDING || "",
  lp: process.env.NEXT_PUBLIC_LP || "",
  gad: process.env.NEXT_PUBLIC_GAD || "",
  reputation: process.env.NEXT_PUBLIC_REPUTATION || "",
  x402: process.env.NEXT_PUBLIC_X402 || "",
  flash: process.env.NEXT_PUBLIC_FLASH || "",

  // Confidential ERC-7984 tokens (official Sepolia cTokenMocks by default)
  usdc: process.env.NEXT_PUBLIC_USDC || "0x4E7B06D78965594eB5EF5414c357ca21E1554491", // cUSDT
  wbtc: process.env.NEXT_PUBLIC_WBTC || "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639", // cUSDC (stand-in)
  weth: process.env.NEXT_PUBLIC_WETH || "0x46208622DA27d91db4f0393733C8BA082ed83158", // cWETH
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
