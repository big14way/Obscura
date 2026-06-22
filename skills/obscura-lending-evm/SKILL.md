---
name: obscura-lending-evm
description: Confidential USDC-style borrowing for AI agents on Ethereum Sepolia (Zama Protocol / FHEVM). Deposit encrypted collateral, borrow encrypted cUSDT, earn confidential LP yield. Amounts are euint64; only the agent can decrypt their own values.
homepage: https://github.com/big14way/Obscura
metadata: {"clawdbot":{"emoji":"🔐","requires":{"bins":["node","npm"]}}}
---

# Obscura Confidential Lending (FHEVM) Skill

Enable your agent to borrow **cUSDT** and earn yield with **encrypted positions** on **Ethereum Sepolia**, built on the Zama Protocol (FHEVM). Collateral, debt, credit limits, shares and reputation are all `euint64` ciphertexts — only the agent can decrypt their own values via EIP-712.

## Network

- Chain: **Ethereum Sepolia**
- Chain ID: `11155111`
- Explorer: `https://sepolia.etherscan.io`

## Contracts

Read addresses from `@/lib/evmContracts` (`CONTRACTS`, `SEPOLIA_CONFIG`); they are produced by `npm run deploy`.

```typescript
import { CONTRACTS, SEPOLIA_CONFIG } from '@/lib/evmContracts';
// CONTRACTS = { core, lending, lp, gad, reputation, x402, usdc, weth, wbtc }
//   usdc = cUSDT, weth = cWETH, wbtc = cUSDC (stand-in) — all ERC-7984
// SEPOLIA_CONFIG = { chainId: 11155111, name: 'Ethereum Sepolia', rpc, explorer }
```

## Confidential primitives

```typescript
import { useObscura } from '@/hooks/useObscura';
const { address, connected, encrypt, decrypt } = useObscura();
```

- **encrypt(contractThatReads, amount)** → `{ handle, inputProof }`. Encrypt the amount for the contract that reads it: LENDING for deposit/borrow/repay/withdraw/configureAgent; LP for LP deposit/withdraw; X402 for record.
- **decrypt(handle, contractAddress)** → `bigint`. EIP-712 user decryption of an encrypted view handle.
- Token authorization is **`setOperator(spender, until)`** (unix-ts `uint48`), not ERC-20 `approve`. Call it before any deposit / repay / LP deposit.
- View reads return a `bytes32` handle, not a number. Decrypt to display (`formatUnits`). Render masked as `•••••` until decrypted.

## Quick Start

### 1) Install
```bash
npm install viem wagmi
```

### 2) Confidential credit flow

```typescript
import { parseUnits } from 'viem';

const until = Math.floor(Date.now() / 1000) + 3600; // now + 1h (uint48)

const tokenAbi = [{ name: 'setOperator', type: 'function', stateMutability: 'nonpayable',
  inputs: [{ name: 'operator', type: 'address' }, { name: 'until', type: 'uint48' }], outputs: [] }] as const;

const lendingAbi = [
  { name: 'deposit',  type: 'function', stateMutability: 'nonpayable', inputs: [
    { name: 'token', type: 'address' }, { name: 'enc', type: 'bytes32' }, { name: 'inputProof', type: 'bytes' } ], outputs: [] },
  { name: 'borrow',   type: 'function', stateMutability: 'nonpayable', inputs: [
    { name: 'token', type: 'address' }, { name: 'enc', type: 'bytes32' }, { name: 'inputProof', type: 'bytes' } ], outputs: [] },
  { name: 'repay',    type: 'function', stateMutability: 'nonpayable', inputs: [
    { name: 'token', type: 'address' }, { name: 'enc', type: 'bytes32' }, { name: 'inputProof', type: 'bytes' } ], outputs: [] },
  { name: 'withdraw', type: 'function', stateMutability: 'nonpayable', inputs: [
    { name: 'token', type: 'address' }, { name: 'enc', type: 'bytes32' }, { name: 'inputProof', type: 'bytes' } ], outputs: [] },
] as const;

// Authorize LENDING to move cWETH, then encrypt + deposit 1 cWETH
await writeContractAsync({ address: CONTRACTS.weth, abi: tokenAbi, functionName: 'setOperator', args: [CONTRACTS.lending, until] });
{
  const { handle, inputProof } = await encrypt(CONTRACTS.lending, parseUnits('1', 6));
  await writeContractAsync({ address: CONTRACTS.lending, abi: lendingAbi, functionName: 'deposit', args: [CONTRACTS.weth, handle, inputProof] });
}

// Encrypt + borrow 500 cUSDT
{
  const { handle, inputProof } = await encrypt(CONTRACTS.lending, parseUnits('500', 6));
  await writeContractAsync({ address: CONTRACTS.lending, abi: lendingAbi, functionName: 'borrow', args: [CONTRACTS.usdc, handle, inputProof] });
}

// Authorize cUSDT, then encrypt + repay
await writeContractAsync({ address: CONTRACTS.usdc, abi: tokenAbi, functionName: 'setOperator', args: [CONTRACTS.lending, until] });
{
  const { handle, inputProof } = await encrypt(CONTRACTS.lending, parseUnits('500', 6));
  await writeContractAsync({ address: CONTRACTS.lending, abi: lendingAbi, functionName: 'repay', args: [CONTRACTS.usdc, handle, inputProof] });
}

// Encrypt + withdraw collateral
{
  const { handle, inputProof } = await encrypt(CONTRACTS.lending, parseUnits('1', 6));
  await writeContractAsync({ address: CONTRACTS.lending, abi: lendingAbi, functionName: 'withdraw', args: [CONTRACTS.weth, handle, inputProof] });
}
```

> **Approval == denial:** credit checks run homomorphically over ciphertexts, so an approved borrow and a denied borrow are **computationally indistinguishable on-chain**.

### 3) Read + decrypt a position

```typescript
import { formatUnits } from 'viem';

const handle = await readContract({
  address: CONTRACTS.lending,
  abi: [{ name: 'totalBorrowOf', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }, { name: 'token', type: 'address' }], outputs: [{ type: 'bytes32' }] }],
  functionName: 'totalBorrowOf',
  args: [address, CONTRACTS.usdc],
}); // bytes32 handle

const debt = await decrypt(handle, CONTRACTS.lending);
console.log('Debt:', formatUnits(debt, 6), 'cUSDT');
```

### 4) Confidential LP yield

```typescript
const lpAbi = [{ name: 'deposit', type: 'function', stateMutability: 'nonpayable',
  inputs: [{ name: 'enc', type: 'bytes32' }, { name: 'inputProof', type: 'bytes' }], outputs: [] }] as const;

await writeContractAsync({ address: CONTRACTS.usdc, abi: tokenAbi, functionName: 'setOperator', args: [CONTRACTS.lp, until] });
const { handle, inputProof } = await encrypt(CONTRACTS.lp, parseUnits('1000', 6));
await writeContractAsync({ address: CONTRACTS.lp, abi: lpAbi, functionName: 'deposit', args: [handle, inputProof] });
// Read shares with sharesOf(address) → bytes32, then decrypt(handle, CONTRACTS.lp)
```

## Agent Configuration (encrypted limit)

Configure an **encrypted** daily credit limit no one else can read:

```typescript
const { handle: encLimit, inputProof } = await encrypt(CONTRACTS.lending, parseUnits('5000', 6));
await writeContractAsync({
  address: CONTRACTS.lending,
  abi: [{ name: 'configureAgent', type: 'function', stateMutability: 'nonpayable', inputs: [
    { name: 'encLimit', type: 'bytes32' }, { name: 'inputProof', type: 'bytes' },
    { name: 'autoRepay', type: 'bool' }, { name: 'x402', type: 'bool' } ], outputs: [] }],
  functionName: 'configureAgent',
  args: [encLimit, inputProof, true, true], // $5,000/day (encrypted), auto-repay, x402 enabled
});
```

## Full Documentation

See `docs/AGENT_FLOW.md` for the complete confidential flow and `docs/DEPLOYMENTS.md` for addresses. FHEVM SDK reference: https://docs.zama.ai
