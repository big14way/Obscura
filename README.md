<div align="center">

# 🔐 Obscura

### Confidential Credit Infrastructure for AI Agents

**The first credit protocol where an agent's debt, collateral, credit limit, reputation, and payments are *encrypted on‑chain* — yet the protocol still computes LTV, limits, and deleveraging directly on the ciphertext.**

Built on the **Zama Protocol (FHEVM)** · Live & verified on **Ethereum Sepolia**

[![Zama Developer Program](https://img.shields.io/badge/Zama-Developer%20Program%20S3-8B5CF6?style=for-the-badge)](https://www.zama.org/) [![Network](https://img.shields.io/badge/Ethereum-Sepolia-627EEA?style=for-the-badge)](https://sepolia.etherscan.io/) [![FHEVM](https://img.shields.io/badge/FHEVM-Confidential-0B0614?style=for-the-badge)](https://docs.zama.org/protocol)

### [🌐 Live Demo](https://obscura-fhe.vercel.app) · [▶️ Watch the Demo](https://youtu.be/QAYe7cgMxX0) · [📜 Verified Contracts](#-live-on-ethereum-sepolia-verified)

<a href="https://youtu.be/QAYe7cgMxX0">
  <img src="https://img.youtube.com/vi/QAYe7cgMxX0/maxresdefault.jpg" alt="Obscura — 3-minute demo" width="680" />
</a>

*▶️ 3‑minute demo — encrypted supply, borrow, x402 payment, and on‑chain proof it's all ciphertext.*

</div>

---

## The Problem

AI agents are starting to transact autonomously — paying for APIs, data, and compute, and increasingly **borrowing capital to operate**. But there's no credit layer built for them, and the obvious approach breaks on a fundamental flaw:

> **On every public blockchain, balances and debt are visible to everyone.**

For an autonomous agent, that transparency is a liability, not a feature:

- **Strategy leakage** — a profitable agent's positions are an open book; competitors copy it instantly.
- **Front‑running & targeted liquidation** — anyone can see an agent approaching its limit and attack it.
- **No confidential creditworthiness** — an agent can't build a credit history without exposing its entire financial life.

Confidentiality *alone* doesn't solve this either — a private chain or a mixer can hide values, but then you can't run credit logic on them. **Finance needs composable privacy: data that is confidential *and* still computable.** That is exactly what Fully Homomorphic Encryption on the Zama Protocol makes possible — and what Obscura is built on.

## The Solution

**Obscura is a confidential lending & credit protocol for the agentic economy.** Every sensitive value — collateral, debt, credit limit, reputation score, and x402 payment amount — lives on‑chain as an FHE ciphertext (`euint64`). Computation happens **directly over the encrypted data**, so the protocol enforces real credit logic without ever seeing a number.

An agent can:
- 🔒 **Deposit encrypted collateral** and **borrow confidential cUSDT** against it — the amounts never appear in plaintext.
- 🤖 **Pay for services over x402** with encrypted receipts only the counterparties can read.
- 📈 **Build an encrypted reputation** that improves with repayment history — private by default, *selectively disclosable* to a lender or auditor.
- 🛡️ Be protected by **Gradual Auto‑Deleveraging** instead of hard liquidations — unwound in small encrypted slices, leak‑free and MEV‑resistant.

## Why It Matters — the property that's impossible without FHE

Obscura's headline guarantee:

> **A granted loan and a denied loan write the *exact same encrypted bytes* on‑chain.**

Because credit checks run homomorphically over ciphertexts, an observer **cannot tell whether an agent borrowed, how much, or even whether it was approved.** No competitor can see a position, copy a strategy, or front‑run a liquidation. This is *composable privacy* — the Zama Season 3 thesis — applied to credit: **confidential and programmable, on a public chain.** No plaintext L1, no ZK circuit, and no private sidechain can offer all three at once.

---

## 🧩 Deep Zama Protocol Integration

Obscura is **FHE‑native**, not FHE‑bolted‑on. Every contract inherits `ZamaEthereumConfig` and computes on encrypted state. Highlights of how we use the protocol:

| FHEVM capability | How Obscura uses it |
|---|---|
| **Encrypted types** | Positions are `euint64`; all value/LTV math is widened to `euint128` to avoid silent 64‑bit wraparound. |
| **Encrypted inputs** | Every amount is encrypted client‑side via the relayer SDK (`createEncryptedInput().add64().encrypt()`) → submitted as `externalEuint64` + `inputProof`, imported with `FHE.fromExternal` and validated with `FHE.isSenderAllowed`. |
| **No branching on ciphertext** | Every `if`/`require` on an amount becomes `ebool` + **`FHE.select`** — this is what makes approval and denial indistinguishable. |
| **No `euint/euint` division** | LTV/health are **cross‑multiplied comparisons**; value is computed as a *single* `amount × (price·10^(scale−dec))` multiply (HCU‑efficient, division‑free). |
| **ACL discipline** | After every write: `FHE.allowThis` + `FHE.allow(handle, agent)`. Cross‑contract handles (Lending → GAD → Reputation) are passed with `FHE.allowTransient`. |
| **EIP‑712 user decryption** | Views return `bytes32` handles; only the data owner reveals their value client‑side via the relayer's EIP‑712 `userDecrypt`. Selective disclosure = the agent grants `FHE.allow` to a specific lender. |
| **ERC‑7984 confidential token** | Settles in **cUSDT** (ERC‑7984). Authorization uses the time‑bounded **operator model** (`setOperator`), not ERC‑20 `approve`. |
| **HCU‑aware design** | Positions are stored as a single aggregate per `(agent, token)` (never looped arrays), keeping every tx within the FHEVM HCU budget. |

**Proven, not claimed:** the confidential flows are covered by a Hardhat test suite on the FHEVM mock (**5/5 passing**, incl. an over‑leverage → crank → seizure test) *and* by live end‑to‑end scripts that run the full flow against the verified Sepolia contracts (`scripts/e2e.mjs`, `scripts/check-x402.mjs`).

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                 Obscura — Confidential Credit (FHEVM)          │
├───────────────┬───────────────┬───────────────┬──────────────┤
│  ObscuraCore   │ Reputation    │  ObscuraGAD    │  X402Receipt │
│  (cleartext    │ Registry      │  (gradual      │  (encrypted  │
│   risk/price   │ (enc. score,  │   deleveraging,│   HTTP-402   │
│   boundary)    │  euint64)     │  leak-free)    │   receipts)  │
├───────────────┴───────────────┴───────────────┴──────────────┤
│                        ObscuraLending                          │
│   deposit → borrow → repay → withdraw   (all euint64/euint128) │
│   approval == denial · aggregate encrypted positions           │
├──────────────────────────────┬─────────────────────────────---┤
│         ObscuraLP            │        ObscuraFlash             │
│  (confidential yield vault)  │  (composable flash-loan leg)    │
└──────────────────────────────┴─────────────────────────────---┘
        settles in ▸ cUSDT / cWETH / cWBTC  (ERC-7984)
```

*`ObscuraCore` is an intentional cleartext boundary: risk params and oracle prices stay public (FHE has no `euint/euint` division), so position **size** is private while the risk curve is public — the standard model for confidential lending.*

---

## 🚀 Live on Ethereum Sepolia (verified)

**Network:** Ethereum Sepolia · **Chain ID:** `11155111` · [**Live app →**](https://obscura-fhe.vercel.app)
All contracts are **verified on Etherscan**; the frontend is wired to them by default.

| Contract | Role | Address |
|---|---|---|
| **ObscuraLending** | Encrypted deposit / borrow / repay / withdraw | [`0x4138…5f41`](https://sepolia.etherscan.io/address/0x413890977637cF1490E12f62aFfD1236D68e5f41#code) |
| **ObscuraCore** | Protocol config (price/risk boundary) | [`0x85c8…FfC46`](https://sepolia.etherscan.io/address/0x85c8Ba069e43A63C8272cBDd83C08Afc391FfC46#code) |
| **ObscuraGAD** | Gradual Auto‑Deleveraging | [`0x6436…d3032`](https://sepolia.etherscan.io/address/0x64368aa0Cc2385908Cd9666a866Bdb10D94d3032#code) |
| **ObscuraLP** | Confidential yield vault | [`0x0A4A…374438`](https://sepolia.etherscan.io/address/0x0A4AE2dDcC75887100719C65E3AA2a9296374438#code) |
| **ReputationRegistry** | Encrypted credit score (`euint64`) | [`0x2794…7dEF69`](https://sepolia.etherscan.io/address/0x27947554B362034641330B97D2b8e30A617dEF69#code) |
| **X402Receipt** | Encrypted HTTP‑402 payment receipts | [`0xFd06…841330`](https://sepolia.etherscan.io/address/0xFd063287E37a833d631bFD47afcFDcB0E4841330#code) |
| **ObscuraFlash** | Flash loans (composable leg) | [`0x2700…484451`](https://sepolia.etherscan.io/address/0x2700E6f99dBe91283aC17bB0D03a5E34Da484451#code) |
| **cUSDT** / **cWETH** / **cWBTC** | Confidential ERC‑7984 tokens | [`0x603B…00B1`](https://sepolia.etherscan.io/address/0x603B390a66Bae8EFa530D41ae563D5D4569a00B1#code) · [`0x8C65…0557`](https://sepolia.etherscan.io/address/0x8C658bEc9BC761910144A72377FcBEd9404a0557#code) · [`0x6951…eC7a`](https://sepolia.etherscan.io/address/0x69511f0F5a629710D113B221dCE44B8650CFeC7a#code) |

---

## ✨ Feature Highlights

- **Encrypted credit lines** — borrow confidential cUSDT against encrypted collateral; limits are `euint64`, and *approval is indistinguishable from denial* on‑chain.
- **Confidential x402 payments** — agents pay for services over HTTP‑402; the receipt amount is an encrypted handle only the payer & recipient can decrypt.
- **Encrypted reputation (ERC‑8004‑style)** — a `euint64` score built from repayment history; only the agent can decrypt it, or grant a lender read access.
- **Gradual Auto‑Deleveraging (GAD)** — permissionless crank that seizes only a small encrypted slice when the *encrypted* LTV is over threshold; a healthy crank is a no‑op indistinguishable from a real one.
- **Confidential LP yield** — supply liquidity for encrypted vault shares; your position size stays private.

## How the confidential flow works

```
Encrypt client-side  →  submit handle + proof  →  compute homomorphically  →  decrypt (EIP-712, owner only)

Supply cWETH ─┐
              ├─► ObscuraLending: FHE.add to encrypted collateral (euint64)
Borrow cUSDT ─┘        ├─ ebool ok = under-limit AND healthy   (all on ciphertext)
                       └─ grant = FHE.select(ok, requested, 0)  ← approval == denial
Pay via x402 ───────► X402Receipt.record(id, payer, recipient, encAmount, proof)  → encrypted receipt
Repay ──────────────► reputation improves (homomorphically); GAD keeps positions safe
```

---

## 🛠️ Quick Start

```bash
# 1. Contracts
npm install
npx hardhat compile
npx hardhat test              # 5/5 confidential tests on the FHEVM mock

# 2. Deploy your own set to Sepolia  (needs DEPLOYER_PK + SEPOLIA_RPC in .env)
npm run deploy
npx hardhat run scripts/verify.ts --network sepolia   # verify on Etherscan

# 3. Frontend  (paste the printed NEXT_PUBLIC_* into app/.env.local)
cd app && npm install && npm run dev   # → http://localhost:3000
```

**Live e2e proof against the deployed contracts** (relayer SDK + real encrypted inputs):

```bash
node scripts/e2e.mjs          # mint → supply → borrow → repay → withdraw → LP → x402
node scripts/check-x402.mjs   # record + read back a confidential x402 receipt
```

## 🧱 Tech Stack

**Contracts:** Solidity `0.8.27` · `@fhevm/solidity` (FHEVM v0.9+) · `@openzeppelin/confidential-contracts` (ERC‑7984) · Hardhat + `@fhevm/hardhat-plugin`
**Frontend:** Next.js 16 · wagmi + viem · `@zama-fhe/relayer-sdk` (encrypt + EIP‑712 user decryption) · Tailwind
**Network:** Ethereum Sepolia (Zama coprocessor) · deployed on Vercel

---

## 🗺️ Roadmap

**Now (Builder Track submission)** — verified confidential lending core, x402 receipts, encrypted reputation, GAD, and LP live on Sepolia with a working dApp.

- **Q3 2026 — Production hardening:** per‑collateral LTV weighting, interest accrual, a real per‑share LP rate via `ERC7984ERC20Wrapper`, two‑step ownership + reorg‑safe reveal timelocks, and a full audit.
- **Q4 2026 — Official registry & mainnet:** migrate to the official Zama Wrappers Registry cTokens, add more confidential collateral pairs, and deploy to Ethereum mainnet.
- **2027 — Agent SDK & credit passport:** a drop‑in SDK/skill so any agent framework can open a credit line in a few calls, plus a portable **encrypted credit passport** an agent carries across protocols (selective disclosure to lenders).
- **Composable rails:** confidential agent‑to‑agent settlement, streaming x402 subscriptions, and a keeper network for permissionless GAD cranking.

---

## 🔎 Scope & honest engineering

A testnet demo built for the Builder Track — we state the trade‑offs rather than hide them:

- **Demo tokens** — collateral/settlement use our own `ConfidentialMockToken` (ERC‑7984) with an open faucet, not the official Sepolia cTokenMocks (the frontend can point at either).
- **Risk model** — a single protocol‑wide `globalMaxLtvBps`; interest accrual omitted.
- **LP vault** — 1:1 share model (a private per‑share price can't be computed purely homomorphically with private aggregates; production path is the `ERC7984ERC20Wrapper` `rate()` model).
- **Flash loans** — `ObscuraFlash` keeps the amount **plaintext on purpose** (an atomic balance invariant can't be evaluated on an `ebool`); it's the composable, non‑confidential leg.
- **Governance** — single admin keys, no timelock (fine for testnet).

What **is** real: the confidential lending/credit core, encrypted x402, encrypted reputation, and GAD — all live on verified Sepolia contracts with end‑to‑end encryption.

---

<div align="center">

**Obscura** — composable, confidential credit for the agentic economy.

[🌐 Live Demo](https://obscura-fhe.vercel.app) · [▶️ Demo Video](https://youtu.be/QAYe7cgMxX0) · [💻 GitHub](https://github.com/big14way/Obscura) · [⚡ Zama Protocol](https://www.zama.org/)

*Built for the Zama Developer Program — Mainnet Season 3 (Builder Track). #ZamaDeveloperProgram*

</div>
