# Deployments — Ethereum Sepolia (Zama Protocol / FHEVM)

**Network:** Ethereum Sepolia
**Chain ID:** `11155111`
**Explorer:** https://sepolia.etherscan.io

> Addresses are produced by the deploy script. Run `npm run deploy` (hardhat → Sepolia); the resulting addresses are written into the app config and exposed as `CONTRACTS` / `SEPOLIA_CONFIG` from `@/lib/evmContracts`. The table below describes each contract's role — fill in the concrete addresses from your deployment output.

## Core Protocol (confidential)

| Contract | Address | Description |
|----------|---------|-------------|
| **ObscuraCore** | `<from deploy>` | Protocol config |
| **ObscuraLending** | `<from deploy>` | Encrypted deposit, borrow, repay, withdraw (`euint64`) |
| **ObscuraLP** | `<from deploy>` | Confidential yield vault |
| **ObscuraGAD** | `<from deploy>` | Gradual Auto-Deleveraging |
| **ReputationRegistry** | `<from deploy>` | Encrypted credit score (`euint64`) |
| **X402Receipt** | `<from deploy>` | Encrypted HTTP 402 payment receipts |

## Confidential Tokens (ERC-7984, testnet)

These are `ConfidentialMockToken` instances. Balances are encrypted (`confidentialBalanceOf` returns a `bytes32` handle); `mint` is faucet-only.

| Token | Maps to | Address | Decimals |
|-------|---------|---------|----------|
| **cUSDT** (`CONTRACTS.usdc`) | settlement / borrow asset | `<from deploy>` | 6 |
| **cWETH** (`CONTRACTS.weth`) | collateral | `<from deploy>` | 6 |
| **cUSDC** (`CONTRACTS.wbtc`) | collateral (stand-in) | `<from deploy>` | 6 |

## Notes on confidentiality

- All amounts are stored on-chain as Fully Homomorphic Encryption ciphertexts (`euint64`).
- Write inputs are submitted as `externalEuint64` handles (`bytes32`) plus an `inputProof` (`bytes`), produced by `encrypt(contractThatReads, amount)`.
- View functions return `bytes32` handles, decrypted client-side via EIP-712 user decryption (`decrypt(handle, contractAddress)`).
- Token authorization uses `setOperator(spender, until)` (a unix-ts `uint48`), not ERC-20 `approve`.
- Approval and denial of a loan are **computationally indistinguishable on-chain**.

## Collateral Config

| Token | Notes |
|-------|-------|
| cWETH | collateral asset |
| cUSDC | collateral asset (stand-in) |

LTV / threshold parameters are configured in `ObscuraCore` after deployment.

---

*Generated from your `npm run deploy` output on Ethereum Sepolia.*
