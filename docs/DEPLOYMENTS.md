# Deployments — Ethereum Sepolia (Zama Protocol / FHEVM)

**Network:** Ethereum Sepolia · **Chain ID:** `11155111` · **Explorer:** https://sepolia.etherscan.io
**Status:** ✅ live & **verified on Etherscan** · **Deployer / treasury:** `0x3C343AD077983371b29fee386bdBC8a92E934C51`

The frontend reads these by default from `@/lib/evmContracts` (`CONTRACTS` / `SEPOLIA_CONFIG`), overridable via `NEXT_PUBLIC_*`.

## Core Protocol (confidential)

| Contract | Address (verified) | Role |
|----------|--------------------|------|
| **ObscuraLending** | [`0x413890977637cF1490E12f62aFfD1236D68e5f41`](https://sepolia.etherscan.io/address/0x413890977637cF1490E12f62aFfD1236D68e5f41#code) | Encrypted deposit / borrow / repay / withdraw (`euint64`) |
| **ObscuraCore** | [`0x85c8Ba069e43A63C8272cBDd83C08Afc391FfC46`](https://sepolia.etherscan.io/address/0x85c8Ba069e43A63C8272cBDd83C08Afc391FfC46#code) | Protocol config (cleartext price/risk boundary) |
| **ObscuraGAD** | [`0x64368aa0Cc2385908Cd9666a866Bdb10D94d3032`](https://sepolia.etherscan.io/address/0x64368aa0Cc2385908Cd9666a866Bdb10D94d3032#code) | Gradual Auto-Deleveraging (permissionless, leak-free) |
| **ObscuraLP** | [`0x0A4AE2dDcC75887100719C65E3AA2a9296374438`](https://sepolia.etherscan.io/address/0x0A4AE2dDcC75887100719C65E3AA2a9296374438#code) | Confidential yield vault |
| **ReputationRegistry** | [`0x27947554B362034641330B97D2b8e30A617dEF69`](https://sepolia.etherscan.io/address/0x27947554B362034641330B97D2b8e30A617dEF69#code) | Encrypted credit score (`euint64`) |
| **X402Receipt** | [`0xFd063287E37a833d631bFD47afcFDcB0E4841330`](https://sepolia.etherscan.io/address/0xFd063287E37a833d631bFD47afcFDcB0E4841330#code) | Encrypted HTTP 402 payment receipts |
| **ObscuraFlash** | [`0x2700E6f99dBe91283aC17bB0D03a5E34Da484451`](https://sepolia.etherscan.io/address/0x2700E6f99dBe91283aC17bB0D03a5E34Da484451#code) | Flash loans (composable plaintext-amount leg) |

## Confidential Tokens (ERC-7984 `ConfidentialMockToken`)

Balances are encrypted — `confidentialBalanceOf` returns a `bytes32` handle; `mint(to, uint64)` is faucet-only.

| Token | `CONTRACTS` key | Address (verified) | Decimals | Role |
|-------|-----------------|--------------------|----------|------|
| **cUSDT** | `usdc` | [`0x603B390a66Bae8EFa530D41ae563D5D4569a00B1`](https://sepolia.etherscan.io/address/0x603B390a66Bae8EFa530D41ae563D5D4569a00B1#code) | 6 | settlement / borrow asset |
| **cWETH** | `weth` | [`0x8C658bEc9BC761910144A72377FcBEd9404a0557`](https://sepolia.etherscan.io/address/0x8C658bEc9BC761910144A72377FcBEd9404a0557#code) | 6 | collateral |
| **cWBTC** | `wbtc` | [`0x69511f0F5a629710D113B221dCE44B8650CFeC7a`](https://sepolia.etherscan.io/address/0x69511f0F5a629710D113B221dCE44B8650CFeC7a#code) | 8 | collateral (the faucet labels it "cUSDC stand-in") |

## Market configuration (set on `ObscuraCore`)

| Token | Max LTV | Liq. threshold | Borrow rate | Seed price (USD6) |
|-------|---------|----------------|-------------|-------------------|
| cWETH | 75% | 80% | — | `$2,600` |
| cWBTC | 70% | 75% | — | `$45,000` |
| cUSDT | — | — | 9% | `$1` |

Lending pool seeded with **1,000,000 cUSDT** liquidity. GAD is wired to Lending and both Lending + GAD are authorized writers on the ReputationRegistry.

## Notes on confidentiality

- All amounts are stored on-chain as FHE ciphertexts (`euint64` / `euint128` for value math).
- Write inputs are `externalEuint64` handles (`bytes32`) + an `inputProof` (`bytes`), produced by `encrypt(contractThatReads, amount)`.
- View functions return `bytes32` handles, decrypted client-side via EIP-712 (`decrypt(handle, contractAddress)`).
- Token authorization uses `setOperator(spender, until)` (a unix-ts `uint48`), not ERC-20 `approve`.
- A granted loan and a denied one write **identical ciphertext** — computationally indistinguishable on-chain.

## Redeploy your own set

```bash
npm run deploy                                   # → Sepolia (needs DEPLOYER_PK + SEPOLIA_RPC)
# paste the printed NEXT_PUBLIC_* into app/.env.local, then:
npx hardhat run scripts/verify.ts --network sepolia   # verify on Etherscan
```
