# 3‑Minute Demo Video — Obscura (Zama Developer Program S3, Builder Track)

> **Hard rules (Builder Track):** ≤ **3:00** · deployed app + **verified contracts shown live** · **real‑person voice** (AI‑generated voice/video is rejected — speak it yourself).
> **Three hooks to land:** *composable privacy is the key · approval == denial (no front‑running) · settles in cUSDT.*

---

## 🎙️ The spoken script (read this aloud)

Founder‑pitch style, ~440 words ≈ 2:50 with the live clicks. `[ON SCREEN]` = what to show, `[DO]` = the action. Replace **[NAME]** with yours.

---

**[ON SCREEN: you on camera, or the landing page]**

"Hi, I'm **[NAME]**, and this is **Obscura** — confidential credit infrastructure for AI agents.

Here's the problem. AI agents are starting to borrow and pay for things on their own — APIs, data, compute. But on every public blockchain, an agent's balances, its debt, its credit limit are visible to *everyone*. So a competitor can copy a profitable agent's strategy, or front‑run its liquidation. Confidentiality alone doesn't fix that — **finance needs composable privacy.** And that's exactly what we built on the Zama Protocol.

With Obscura, an agent's collateral, debt, credit limit, reputation, and payments are all **encrypted on‑chain** as fully‑homomorphic ciphertexts — and the protocol still computes the credit logic *directly on that encrypted data*. Let me show you.

**[ON SCREEN: dashboard] [DO: connect wallet on Sepolia]**
I'll connect my wallet on Ethereum Sepolia. First I supply collateral — one cWETH. Watch: the amount is **encrypted in my browser** before it ever touches the chain. I sign… and it's confirmed.

**[DO: click Decrypt on the collateral card → sign]**
Now my collateral shows as dots — that's ciphertext on‑chain. Only I can read it. I click **Decrypt**, sign a quick EIP‑712 request — no gas — and there it is: one cWETH, revealed just for me.

**[ON SCREEN: Borrow tab] [DO: borrow 1000 cUSDT]**
Now I borrow against it — a thousand cUSDT, the confidential stablecoin. And here's the part that's impossible anywhere else: on‑chain, an **approved loan and a *denied* loan write the exact same encrypted bytes.** Nobody watching can tell whether I borrowed, how much, or even if I was approved. I decrypt my debt — only I see it.

**[ON SCREEN: x402 card] [DO: enable x402, pay, decrypt receipt]**
This is what the credit is *for* — paying for services. An agent hits an API, gets an HTTP 402, and pays through its credit line. I pay one cUSDT, and an **encrypted receipt** lands on‑chain. I decrypt it — one cUSDT — but on‑chain the amount is just a handle, so the service verifies the payment without ever seeing the value. And every repayment lifts the agent's **encrypted reputation** — private by default, selectively disclosable to a lender. If a position ever goes underwater, **gradual auto‑deleveraging** unwinds it in small encrypted slices — leak‑free, no hard liquidation.

**[ON SCREEN: Etherscan — the verified Lending contract, Read Contract]**
And here's the proof. This is our **verified** contract on Etherscan. I read my debt directly — it returns a **bytes32 ciphertext handle, not a number.** Real confidentiality, live on Sepolia.

Obscura — composable, confidential credit for the agentic economy, settled in cUSDT, built on the Zama Protocol. Thanks for watching."

---

## 🎬 Shot list (what's on screen, in order)
1. **0:00** Title / you on cam → landing hero ("Confidential Credit for AI Agents", "Composable privacy is the key").
2. **0:35** Dashboard → **Supply 1 cWETH** (encrypting… → sign → confirmed).
3. **0:55** **Decrypt** collateral (EIP‑712 sign → value reveals).
4. **1:15** **Borrow 1000 cUSDT** → **Decrypt** debt. Say the *approval == denial* line.
5. **1:45** **Agent Config → enable**, then **Pay 1 cUSDT via x402** → **Decrypt receipt**. Mention reputation + GAD.
6. **2:25** **Etherscan**: the verified Lending contract → `totalBorrowOf(you, cUSDT)` returns a `bytes32` handle.
7. **2:45** Close on the README "Deployed Contracts" table (verified links) / GitHub.

## ✅ Pre‑record checklist (do these BEFORE you hit record)
- [ ] MetaMask on **Ethereum Sepolia**, funded with a little ETH; **disable other wallet extensions** (HashPack) to avoid conflicts.
- [ ] **Pre‑mint** cWETH/cUSDT and **pre‑approve (setOperator)** on the Faucet — so the recording skips the slow setup.
- [ ] One **dry run** first so the relayer WASM is warm (the *first* encrypt/decrypt is slower).
- [ ] Two tabs open: the app `/dashboard` and the **verified Lending contract** on Etherscan (Read Contract).
- [ ] 1080p screen capture, mic test. You may **trim the on‑chain wait time** in editing (cutting dead air is fine) — just keep your **voice real and continuous**.
- [ ] Keep it **under 3:00**.

## 📌 Accuracy notes (so you don't mis‑state on camera)
- We're on **Ethereum Sepolia via the Zama coprocessor** — **not** zero‑gas, **not** SKALE. Don't claim "zero gas."
- There is **no plaintext "health factor"** shown — it's encrypted. Lead with *encryption*, not a visible health bar.
- Global LTV is **75%** (not 80%).
- Flash loans exist but are the plaintext "composable leg" — **don't** call them confidential.

## 📣 Submission (after the video)
- Join via **Guild** → complete the intro‑to‑FHE quests → unlock the Builder Track.
- Submit at **forms.zama.org/developer-program-mainnet-season3-builder-track** (app + repo + video + docs).
- Post on **X tagging @zama** with **#ZamaDeveloperProgram**. Suggested caption:
  > "Built **Obscura** for the @zama Developer Program S3 — confidential credit for AI agents on FHEVM. Collateral, debt, x402 payments & reputation are all encrypted on‑chain; approval and denial are indistinguishable, so no agent can be front‑run. Live + verified on Sepolia. #ZamaDeveloperProgram"
