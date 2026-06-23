# 3-Minute Video Pitch — Obscura (Zama Developer Program S3, Builder Track)

> **Hard rules (Builder Track):** ≤ **3:00**, deployed app + verified contracts shown live, and a **real-person pitch** — AI‑generated video or voice is not accepted. Speak it yourself.
>
> **Three hooks to repeat:** *composable privacy is the key · approval == denial (no front-running) · settles in cUSDT.*

---

### 0:00–0:25 — Problem (talking head + title card)
> "AI agents are starting to borrow and pay on their own. But on every public chain, an agent's debt, collateral, and credit score are visible to everyone — so competitors can copy its strategy or front-run its liquidation. Confidentiality alone doesn't fix that. **Finance needs composable privacy.**"

On screen: Obscura landing page (`/`) — the "Confidential Credit for AI Agents" hero, "Composable privacy is the key" line.

### 0:25–0:50 — Thesis + what it is
> "Obscura is confidential agentic credit on the Zama Protocol. Collateral, debt, credit limits, reputation, and x402 payments are all encrypted on-chain as `euint64` — and the protocol still computes LTV, limits, and deleveraging directly on the ciphertext with FHE. It settles in cUSDT, the same confidential token this program rewards in."

On screen: scroll the "Why Zama FHE" cards.

### 0:50–2:10 — Live demo (screen share, MetaMask on Sepolia)
Narrate each step as you click:
1. **Faucet** → "Mint All" — *"confidential ERC-7984 test tokens"* → "Approve Obscura (setOperator)".
2. **Dashboard → Supply** ~5 cWETH — *"the amount is encrypted in my browser before it's sent."*
3. Click **Decrypt** on collateral → MetaMask **signature** (no gas) → value appears. *"Only I can decrypt my own position — EIP-712 user decryption."*
4. **Borrow** ~1000 cUSDT → confirm → **Decrypt** debt → shows ~1000. *"My debt is live on-chain — but as ciphertext."*
5. **The money shot — open Etherscan** on the Lending contract → `totalBorrowOf(me, cUSDT)` → returns a **`bytes32` handle**, not a number. *"On-chain, this is just ciphertext. And a borrow that's denied writes the exact same bytes — approval and denial are indistinguishable, so no one can see, copy, or front-run me."*
6. (If time) **Repay** → debt drops on decrypt; mention **GAD** ("gradual, leak-free deleveraging — no sudden liquidations") and **reputation** ("encrypted credit score, selectively disclosable to a lender").

### 2:10–2:40 — Why it's impossible without FHE
> "Every other lending protocol leaks position size. Here the protocol enforces real credit logic — LTV, daily limits, deleveraging — without ever seeing a number. That's composable privacy: confidential *and* programmable, on a public chain."

On screen: the "Full Credit Stack" feature grid.

### 2:40–3:00 — Close + proof
> "Confidential agentic credit, live and verified on Ethereum Sepolia, settling in cUSDT. Obscura — composable privacy for onchain credit."

On screen: README "Deployed Contracts" table with the verified Etherscan links + the GitHub repo.

---

## Pre-record checklist
- [ ] MetaMask on **Ethereum Sepolia**, account funded with a little ETH, **already has minted cTokens** (mint before recording so the demo is fast).
- [ ] Do one full dry-run so the relayer WASM is warm (first encrypt/decrypt is slower).
- [ ] Two tabs ready: the app (`/dashboard`) and the Lending contract on Etherscan (Read Contract).
- [ ] Screen recording at 1080p; mic test; keep total **under 3:00**.
- [ ] Hosted demo URL on the title/closing card if deployed (Vercel); otherwise show it running locally and link the repo.
- [ ] Post on X tagging **@zama** with **#ZamaDeveloperProgram**.
