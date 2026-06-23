# cUSDT — Confidential Settlement Token (ERC-7984)

Obscura settles in **cUSDT**, a confidential ERC-7984 token (`ConfidentialMockToken`) deployed on **Ethereum Sepolia**.

- Standard: **ERC-7984** (confidential token) on the Zama Protocol (FHEVM)
- Implementation: `ConfidentialMockToken`
- Reference: `CONTRACTS.usdc` from `@/lib/evmContracts` (address from `npm run deploy`)
- Decimals: 6
- Network: Ethereum Sepolia (chain ID `11155111`)

## Confidential balances

Balances are encrypted (`euint64`). There is no plaintext `balanceOf`:

```ts
// Returns a bytes32 handle, NOT a number
const handle = await readContract({
  address: CONTRACTS.usdc,
  abi: [{ name: 'confidentialBalanceOf', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'bytes32' }] }],
  functionName: 'confidentialBalanceOf',
  args: [address],
});

// Decrypt client-side via EIP-712
const balance = await decrypt(handle, CONTRACTS.usdc); // bigint
```

## Authorization: setOperator (not approve)

ERC-7984 confidential tokens use operator authorization instead of ERC-20 allowances. Before depositing, repaying, or LP-depositing, authorize the spender:

```ts
const until = Math.floor(Date.now() / 1000) + 3600; // unix-ts uint48 (now + 1h)
await writeContract({
  address: CONTRACTS.usdc,
  abi: [{ name: 'setOperator', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'operator', type: 'address' }, { name: 'until', type: 'uint48' }], outputs: [] }],
  functionName: 'setOperator',
  args: [CONTRACTS.lending, until], // or CONTRACTS.lp
});
```

## Faucet

On testnet, mint confidential tokens via the faucet (faucet-only `mint`):

```ts
await writeContract({
  address: CONTRACTS.usdc,
  abi: [{ name: 'mint', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint64' }], outputs: [] }],
  functionName: 'mint',
  args: [address, 1000_000000n],
});
```

## Related confidential tokens

| Token | Maps to | Use |
|-------|---------|-----|
| cUSDT (`CONTRACTS.usdc`) | settlement / borrow asset | borrow & repay |
| cWETH (`CONTRACTS.weth`) | collateral | deposit |
| cWBTC (`CONTRACTS.wbtc`) | collateral (stand-in) | deposit |

All three are `ConfidentialMockToken` (ERC-7984) instances with encrypted balances.
