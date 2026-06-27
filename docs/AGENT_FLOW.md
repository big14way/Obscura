# Agent Flow (FHEVM) — Obscura on Ethereum Sepolia

This is the **end‑to‑end confidential agent flow**: configure → LP yield → collateral → borrow → repay → withdraw. Every amount is encrypted (`euint64`); token authorization uses `setOperator`, not ERC-20 `approve`.

## 0) Network
- Chain: **Ethereum Sepolia**
- Chain ID: `11155111`
- Explorer: `https://sepolia.etherscan.io`
- Contracts: see `docs/DEPLOYMENTS.md` (addresses from `npm run deploy`)

## 1) Confidential primitives

All writes that take an amount follow the same two-step pattern:

1. **Encrypt** the amount for the contract that will read it:
   `const { handle, inputProof } = await encrypt(contractThatReads, parseUnits(amount, decimals));`
   - `contractThatReads` = LENDING for deposit/borrow/repay/withdraw/configureAgent; LP for LP deposit/withdraw; X402 for record.
2. **Submit** `(..., handle, inputProof)` to the write function.

All reads return a `bytes32` handle that you decrypt client-side via EIP-712:
`const value = await decrypt(handle, contractAddress);`

Token authorization is `setOperator(spender, until)` where `until` is a unix-ts `uint48` — call it before any deposit / repay / LP deposit.

In the frontend these are provided by the hook:
```ts
import { useObscura } from '@/hooks/useObscura';
const { address, connected, encrypt, decrypt } = useObscura();
```

## 2) Get confidential test tokens (Faucet)
Open: **https://obscura-fhe.vercel.app/faucet** — mints **cUSDT / cWETH / cWBTC** (`ConfidentialMockToken.mint`).

**Token decimals**
- cUSDT: 6
- cWETH: 6
- cWBTC: 8

Balances are encrypted: `confidentialBalanceOf(address)` returns a `bytes32` handle, decrypt it with `decrypt(handle, tokenAddress)`.

## 3) Confidential LP Yield (cUSDT)
### Steps
1. **setOperator** cUSDT → LP (`setOperator(LP, now + 1h)`)
2. **Encrypt** the deposit amount for LP
3. **Deposit** encrypted amount to LP
4. **Withdraw** later by encrypting a shares amount for LP

### Contract calls
- `LP.deposit(bytes32 enc, bytes inputProof)`
- `LP.withdraw(bytes32 enc, bytes inputProof)`
- `LP.sharesOf(address) → bytes32` (decrypt to read)

## 4) Collateral → Borrow → Repay → Withdraw
### Steps
1. **Initialize** position
2. **setOperator** collateral (cWETH/cWBTC) → LENDING
3. **Encrypt + deposit** collateral
4. **Encrypt + borrow** cUSDT
5. **setOperator** cUSDT → LENDING, then **encrypt + repay**
6. **Encrypt + withdraw** collateral

### Contract calls (ObscuraLending)
- `initializePosition()`
- `deposit(address token, bytes32 enc, bytes inputProof)`
- `borrow(address token, bytes32 enc, bytes inputProof)`
- `repay(address token, bytes32 enc, bytes inputProof)`
- `withdraw(address token, bytes32 enc, bytes inputProof)`
- `totalCollateralOf(address,address) → bytes32`, `totalBorrowOf(address,address) → bytes32`, `agentLimit(address) → bytes32`, `agentBorrowed(address) → bytes32` (all decrypt to read)

> **Approval == denial:** because the credit checks run homomorphically over ciphertexts, an approved borrow and a denied borrow are **computationally indistinguishable on-chain**.

## 5) Minimal confidential agent flow (frontend hook)

```ts
import { useObscura } from '@/hooks/useObscura';
import { CONTRACTS } from '@/lib/evmContracts';
import { useWriteContract, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';

const { address, encrypt, decrypt } = useObscura();
const { writeContractAsync } = useWriteContract();

// minimal ABIs (externalEuint64/bytes32 handle; inputProof = bytes)
const tokenAbi = [
  { name: 'setOperator', type: 'function', stateMutability: 'nonpayable', inputs: [
    { name: 'operator', type: 'address' }, { name: 'until', type: 'uint48' } ], outputs: [] },
] as const;

const lendingAbi = [
  { name: 'initializePosition', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'deposit', type: 'function', stateMutability: 'nonpayable', inputs: [
    { name: 'token', type: 'address' }, { name: 'enc', type: 'bytes32' }, { name: 'inputProof', type: 'bytes' } ], outputs: [] },
  { name: 'borrow', type: 'function', stateMutability: 'nonpayable', inputs: [
    { name: 'token', type: 'address' }, { name: 'enc', type: 'bytes32' }, { name: 'inputProof', type: 'bytes' } ], outputs: [] },
  { name: 'repay', type: 'function', stateMutability: 'nonpayable', inputs: [
    { name: 'token', type: 'address' }, { name: 'enc', type: 'bytes32' }, { name: 'inputProof', type: 'bytes' } ], outputs: [] },
  { name: 'withdraw', type: 'function', stateMutability: 'nonpayable', inputs: [
    { name: 'token', type: 'address' }, { name: 'enc', type: 'bytes32' }, { name: 'inputProof', type: 'bytes' } ], outputs: [] },
  { name: 'totalCollateralOf', type: 'function', stateMutability: 'view', inputs: [
    { name: 'user', type: 'address' }, { name: 'token', type: 'address' } ], outputs: [{ type: 'bytes32' }] },
  { name: 'totalBorrowOf', type: 'function', stateMutability: 'view', inputs: [
    { name: 'user', type: 'address' }, { name: 'token', type: 'address' } ], outputs: [{ type: 'bytes32' }] },
] as const;

const until = Math.floor(Date.now() / 1000) + 3600; // now + 1 hour (uint48)

// 0) Initialize position (once)
await writeContractAsync({ address: CONTRACTS.lending, abi: lendingAbi, functionName: 'initializePosition', args: [] });

// 1) Authorize LENDING to move your cWETH
await writeContractAsync({
  address: CONTRACTS.weth, abi: tokenAbi, functionName: 'setOperator', args: [CONTRACTS.lending, until],
});

// 2) Encrypt + deposit 1 cWETH (the reader is LENDING)
{
  const { handle, inputProof } = await encrypt(CONTRACTS.lending, parseUnits('1', 6));
  await writeContractAsync({
    address: CONTRACTS.lending, abi: lendingAbi, functionName: 'deposit',
    args: [CONTRACTS.weth, handle, inputProof],
  });
}

// 3) Encrypt + borrow 100 cUSDT
{
  const { handle, inputProof } = await encrypt(CONTRACTS.lending, parseUnits('100', 6));
  await writeContractAsync({
    address: CONTRACTS.lending, abi: lendingAbi, functionName: 'borrow',
    args: [CONTRACTS.usdc, handle, inputProof],
  });
}

// 4) Repay 100 cUSDT — authorize first, then encrypt + repay
await writeContractAsync({
  address: CONTRACTS.usdc, abi: tokenAbi, functionName: 'setOperator', args: [CONTRACTS.lending, until],
});
{
  const { handle, inputProof } = await encrypt(CONTRACTS.lending, parseUnits('100', 6));
  await writeContractAsync({
    address: CONTRACTS.lending, abi: lendingAbi, functionName: 'repay',
    args: [CONTRACTS.usdc, handle, inputProof],
  });
}

// 5) Encrypt + withdraw 1 cWETH
{
  const { handle, inputProof } = await encrypt(CONTRACTS.lending, parseUnits('1', 6));
  await writeContractAsync({
    address: CONTRACTS.lending, abi: lendingAbi, functionName: 'withdraw',
    args: [CONTRACTS.weth, handle, inputProof],
  });
}
```

### Reading + decrypting an encrypted position (EIP-712)

```ts
// Read the encrypted collateral handle, then user-decrypt it
const collHandle = await readContract({
  address: CONTRACTS.lending, abi: lendingAbi, functionName: 'totalCollateralOf',
  args: [address, CONTRACTS.weth],
}); // bytes32 handle

const collateral = await decrypt(collHandle, CONTRACTS.lending); // bigint
console.log('Collateral:', formatUnits(collateral, 6), 'cWETH');
```

In the UI, render encrypted values masked as `•••••` with a **Decrypt** button that calls `decrypt(handle, contractAddress)` on demand.

## 6) Confidential LP deposit

```ts
const lpAbi = [
  { name: 'deposit', type: 'function', stateMutability: 'nonpayable', inputs: [
    { name: 'enc', type: 'bytes32' }, { name: 'inputProof', type: 'bytes' } ], outputs: [] },
  { name: 'sharesOf', type: 'function', stateMutability: 'view', inputs: [
    { name: 'user', type: 'address' } ], outputs: [{ type: 'bytes32' }] },
] as const;

// Authorize LP, then encrypt for LP and deposit 500 cUSDT
await writeContractAsync({ address: CONTRACTS.usdc, abi: tokenAbi, functionName: 'setOperator', args: [CONTRACTS.lp, until] });
const { handle, inputProof } = await encrypt(CONTRACTS.lp, parseUnits('500', 6));
await writeContractAsync({ address: CONTRACTS.lp, abi: lpAbi, functionName: 'deposit', args: [handle, inputProof] });
```

## 7) UI alternative (no code)
- Go to **https://obscura-fhe.vercel.app**
- Connect MetaMask on **Ethereum Sepolia**
- setOperator → deposit cWETH/cWBTC as encrypted collateral
- Encrypted borrow / repay cUSDT
- LP deposit/withdraw (encrypted) via the LP section
- Decrypt any position with the per-card **Decrypt** button (EIP-712)

---

For the full FHEVM SDK reference (encryption, input proofs, EIP-712 user decryption) see the Zama Protocol docs: https://docs.zama.ai
