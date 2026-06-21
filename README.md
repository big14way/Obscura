# Obscura — Confidential Agentic Credit on the Zama Protocol

**Confidential credit infrastructure for AI agents, built on the Zama Protocol (FHEVM) and deployed on Ethereum Sepolia.**

> 🔐 **Composable privacy for onchain credit**: an AI agent's debt, collateral, credit limit, reputation and x402 payment amounts are **encrypted on-chain** (`euint64`) via Fully Homomorphic Encryption. Only the agent can decrypt their own values (EIP-712 user decryption).

> 📄 **Zama port:** this repo was re‑architected from a plaintext build into a **confidential** agentic‑credit dApp for the **Zama Developer Program — Mainnet Season 3 (Builder Track)**. See **[ZAMA_PORT.md](ZAMA_PORT.md)** for the full re‑architecture plan.

🌐 **Live Demo:** https://evm.obscura.io

---

## What is Obscura?

Obscura is a **confidential lending and credit protocol** for the agentic economy. Every sensitive amount — collateral, debt, credit limit, reputation score, and x402 payment value — lives on-chain as a Fully Homomorphic Encryption ciphertext (`euint64`). Computation happens directly over the encrypted data, so the protocol can enforce credit logic without ever revealing it.

- **Encrypted positions** — Collateral, debt and credit limits are stored as `euint64`; balances surface as `bytes32` handles, never plaintext.
- **Approval == denial** — A loan that is approved and one that is denied are **computationally indistinguishable on-chain**. Observers cannot tell whether an agent borrowed, or how much.
- **Confidential reputation** — An agent's credit score is encrypted; only the agent can decrypt it via EIP-712.
- **Confidential x402 payments** — Machine-to-machine payment amounts are recorded as encrypted receipts.
- **Gradual Auto-Deleveraging (GAD)** — Positions unwind smoothly instead of being hard-liquidated.
- **Settles in cUSDT** — Confidential ERC-7984 token (`ConfidentialMockToken`).

### The confidential x402 flow

```
Agent → Service (HTTP 402) → Agent pays via encrypted X402Receipt → Service delivers
```

The payment amount is encrypted; only the payer (and authorized parties) can decrypt the receipt.

### Why the Zama Protocol (FHEVM)?

- **On-chain confidentiality** — Amounts stay encrypted end-to-end via FHE; logic runs over ciphertexts.
- **Indistinguishable outcomes** — Approval and denial of credit are not observable on-chain.
- **EIP-712 user decryption** — Only the data owner can reveal their own values.
- **EVM compatible** — Standard tooling on **Ethereum Sepolia** (wagmi, viem, hardhat, FHEVM SDK).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Obscura — Confidential Credit (FHEVM)           │
├─────────────┬─────────────┬─────────────┬──────────────────┤
│ ObscuraCore  │ Reputation  │ ObscuraGAD   │ X402Receipt      │
│ (Config)    │ (enc score) │ (Deleverage)│ (enc HTTP 402)   │
├─────────────┴─────────────┴─────────────┴──────────────────┤
│                     ObscuraLending                           │
│   deposit → borrow → repay → withdraw   (all euint64)       │
├─────────────────────────────────────────────────────────────┤
│                        ObscuraLP                             │
│                (confidential yield vault)                    │
└─────────────────────────────────────────────────────────────┘
```

*All amounts (collateral, debt, limits, shares, scores, payments) are encrypted `euint64` values. Inputs are submitted as `externalEuint64` handles + `inputProof`; reads return `bytes32` handles decrypted client-side via EIP-712.*

---

## Deployed Contracts

Addresses are written by the deploy script (`npm run deploy`) to your environment / `app/src/lib/evmContracts` after deploying to **Ethereum Sepolia**. The frontend reads them from `CONTRACTS` and `SEPOLIA_CONFIG`.

| Contract | Role |
|----------|------|
| ObscuraCore | Protocol config |
| ObscuraLending | Confidential deposit / borrow / repay / withdraw (`euint64`) |
| ObscuraLP | Confidential yield vault |
| ObscuraGAD | Gradual Auto-Deleveraging |
| ReputationRegistry | Encrypted credit score (`euint64`) |
| X402Receipt | Encrypted HTTP 402 payment receipts |
| cUSDT / cWETH / cUSDC | Confidential ERC-7984 tokens (`ConfidentialMockToken`) |

**Network:** Ethereum Sepolia · **Chain ID:** `11155111` · **Explorer:** https://sepolia.etherscan.io

See `docs/DEPLOYMENTS.md` for the full table.

---

## Quick Start

### 1. Run the Demo

1. Open https://evm.obscura.io
2. Connect MetaMask on **Ethereum Sepolia**
3. Get confidential test tokens via **Faucet** (mints cUSDT / cWETH / cUSDC)
4. Set operator → Supply (encrypted) → Borrow (encrypted) → Decrypt position → Repay → Withdraw

### 2. Local Development

```bash
# Install
npm install
cd app && npm install && cd ..

# Compile contracts
npx hardhat compile

# Test
npx hardhat test

# Deploy to Ethereum Sepolia
npm run deploy
```

### 3. Frontend

```bash
cd app
npm run dev
# Open http://localhost:3000
```

---

## Key Features

### 🤖 Confidential agent-native credit

Credit limits and borrow amounts are encrypted. Inputs are encrypted client-side, then submitted as a handle + proof.

```typescript
import { useObscura } from '@/hooks/useObscura';
import { CONTRACTS } from '@/lib/evmContracts';
import { parseUnits } from 'viem';

const { encrypt } = useObscura();

// Configure an encrypted daily credit limit ($5,000), auto-repay + x402 on
const { handle: limitHandle, inputProof } =
  await encrypt(CONTRACTS.lending, parseUnits('5000', 6));

await writeContract({
  address: CONTRACTS.lending,
  abi: lendingAbi,
  functionName: 'configureAgent',
  args: [limitHandle, inputProof, true, true], // encLimit, proof, autoRepay, x402
});
```

The agent then borrows autonomously within an **encrypted** limit — neither the limit nor the borrow amount is visible on-chain.

### 🕶️ Approval == denial

Because every amount is a ciphertext and the credit checks run homomorphically, a successful borrow and a rejected borrow are **computationally indistinguishable on-chain**. An observer cannot tell whether an agent was approved, denied, or how much was drawn.

### 📊 Confidential reputation

An agent's credit score is stored as `euint64` and improves with on-chain repayment history. Only the agent can read it:

```typescript
const handle = await readContract({
  address: CONTRACTS.reputation,
  abi: reputationAbi,
  functionName: 'scoreOf',
  args: [address],
}); // returns bytes32 handle

const score = await decrypt(handle, CONTRACTS.reputation); // EIP-712 user decryption
```

### 🛡️ Gradual Auto-Deleveraging (GAD)

No sudden liquidations. When a position drifts over its threshold, GAD unwinds it gradually via `crank`, guarded by `canCrank`. Thresholds are configured in basis points:

```typescript
await writeContract({
  address: CONTRACTS.gad,
  abi: gadAbi,
  functionName: 'configureGad',
  args: [true, 9000], // enabled, thresholdBps
});
```

### 💸 Confidential x402 receipts

Payment amounts for machine-to-machine x402 settlements are recorded encrypted:

```typescript
const { handle, inputProof } = await encrypt(CONTRACTS.x402, parseUnits('1.5', 6));
await writeContract({
  address: CONTRACTS.x402,
  abi: x402Abi,
  functionName: 'record',
  args: [paymentId, payer, recipient, handle, inputProof],
});
```

---

## Agent Integration

Confidential writes follow the same two-step pattern: **encrypt the amount**, then **submit handle + proof**. Token transfers use `setOperator(spender, until)` instead of ERC-20 `approve`.

```typescript
import { useObscura } from '@/hooks/useObscura';
import { CONTRACTS } from '@/lib/evmContracts';
import { parseUnits } from 'viem';

const { address, encrypt, decrypt } = useObscura();

// 1) Authorize the lending contract to move your cWETH (operator until now+1h)
const until = Math.floor(Date.now() / 1000) + 3600;
await writeContract({
  address: CONTRACTS.weth, // cWETH (ERC-7984)
  abi: tokenAbi,
  functionName: 'setOperator',
  args: [CONTRACTS.lending, until],
});

// 2) Encrypt the deposit amount for the contract that reads it (LENDING)
const { handle, inputProof } = await encrypt(CONTRACTS.lending, parseUnits('1', 6));

// 3) Deposit encrypted collateral
await writeContract({
  address: CONTRACTS.lending,
  abi: lendingAbi,
  functionName: 'deposit',
  args: [CONTRACTS.weth, handle, inputProof],
});

// 4) Read + decrypt the encrypted collateral position
const collHandle = await readContract({
  address: CONTRACTS.lending,
  abi: lendingAbi,
  functionName: 'totalCollateralOf',
  args: [address, CONTRACTS.weth],
}); // bytes32 handle
const collateral = await decrypt(collHandle, CONTRACTS.lending);
```

See `docs/AGENT_FLOW.md` for the complete confidential flow.

---

## Documentation

| Doc | Description |
|-----|-------------|
| `docs/DEPLOYMENTS.md` | Contract addresses (from deploy) |
| `docs/DEMO_FLOW.md` | Confidential demo script |
| `docs/AGENT_FLOW.md` | Full confidential agent integration |
| `docs/REPUTATION_ERC8004.md` | Encrypted reputation system |
| `docs/X402_FLOW.md` | Confidential HTTP 402 payments |
| `docs/USDC.md` | cUSDT (ERC-7984) settlement token |

---

## Repo Structure

```
obscura/
├── contracts/           # Solidity (FHEVM) smart contracts
│   ├── ObscuraCore.sol
│   ├── ObscuraLending.sol
│   ├── ObscuraLP.sol
│   ├── ObscuraGAD.sol
│   ├── ReputationRegistry.sol
│   ├── X402Receipt.sol
│   └── ConfidentialMockToken.sol   # cUSDT / cWETH / cUSDC (ERC-7984)
├── scripts/             # Deployment scripts (npm run deploy → Sepolia)
├── test/                # Contract tests (npx hardhat test)
├── app/                 # Next.js frontend
│   └── src/
│       ├── app/         # Pages (dashboard, faucet)
│       ├── hooks/       # useObscura (encrypt/decrypt)
│       └── lib/         # evmContracts (CONTRACTS, SEPOLIA_CONFIG)
├── docs/                # Documentation
└── skills/              # Obscura confidential lending skill
```

---

## Links

- 🌐 **Live Demo:** https://evm.obscura.io
- 🔐 **Zama Protocol / FHEVM:** https://docs.zama.ai
- 🔎 **Explorer:** https://sepolia.etherscan.io

---

*Built for the Zama Developer Program — Mainnet Season 3 (Builder Track)*
