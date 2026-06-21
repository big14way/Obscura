# Demo Flow — Confidential Agentic Credit (FHEVM on Ethereum Sepolia)

## 5-Minute Confidential Demo Script

### Setup (30s)
1. Open https://evm.obscura.io
2. Connect MetaMask on **Ethereum Sepolia** (chain ID `11155111`)
3. Go to **Faucet** → mint confidential tokens (**cUSDT / cWETH / cUSDC**). The faucet calls `mint(to, amount)` on each `ConfidentialMockToken`.

### Confidential Credit Flow (2.5min)
1. Go to **Dashboard**
2. **Authorize the lending contract** (operator): on cWETH call `setOperator(LENDING, now + 1h)`. This replaces the old ERC-20 approve.
3. **Supply collateral (encrypted)**: select cWETH, enter `5`. The app encrypts the amount for LENDING (`encrypt(LENDING, parseUnits('5', 6))`) and calls `deposit(cWETH, handle, inputProof)`.
4. **Decrypt position**: collateral shows masked as `•••••`. Click **Decrypt** → calls `decrypt(handle, LENDING)` on the handle from `totalCollateralOf(you, cWETH)` and renders the value via `formatUnits`.
5. **Borrow (encrypted)**: enter `1000` cUSDT → `encrypt(LENDING, parseUnits('1000', 6))` → `borrow(cUSDT, handle, inputProof)`.
6. **Point out**: on-chain, an approved borrow and a denied borrow are **computationally indistinguishable** — observers cannot tell what happened or how much.
7. **Repay**: `setOperator(LENDING, now + 1h)` on cUSDT, then encrypt the repay amount and call `repay(cUSDT, handle, inputProof)`.
8. **Withdraw**: encrypt the withdraw amount and call `withdraw(cWETH, handle, inputProof)`.
9. Show **Reputation** card: masked score; click **Decrypt** → `decrypt(scoreOf(you), REPUTATION)` reveals the increased score after repay.

### Confidential LP Yield (1min)
1. Switch to **LP** tab
2. `setOperator(LP, now + 1h)` on cUSDT
3. **Deposit**: enter `500` → `encrypt(LP, parseUnits('500', 6))` → `LP.deposit(handle, inputProof)`
4. **Shares** display masked; **Decrypt** via `decrypt(sharesOf(you), LP)`
5. **Withdraw**: encrypt shares → `LP.withdraw(handle, inputProof)`

### Agent Configuration (30s)
1. Show **Agent Configuration** panel
2. Set an **encrypted** daily credit limit: `encrypt(LENDING, parseUnits('5000', 6))` → `configureAgent(encLimit, inputProof, autoRepay, x402)`
3. Explain: agents borrow autonomously within an encrypted limit no one else can read.

### Key Differentiators (1min)
- **Encrypted positions**: collateral, debt, limits, shares and scores are all `euint64` ciphertexts.
- **Approval == denial**: credit outcomes are computationally indistinguishable on-chain.
- **Confidential reputation**: score improves with repayments; only the agent can decrypt it.
- **Confidential x402**: machine-to-machine payment amounts recorded encrypted.
- **Gradual deleveraging (GAD)**: no sudden liquidations.
- Settles in **cUSDT** (confidential ERC-7984).

---

## Contracts
See `docs/DEPLOYMENTS.md` (addresses come from `npm run deploy` on Sepolia).

## Full Agent Integration
See `docs/AGENT_FLOW.md` for the complete confidential code flow (encrypt + setOperator + handle/inputProof + EIP-712 decrypt).
