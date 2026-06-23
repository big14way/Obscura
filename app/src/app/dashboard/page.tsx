"use client";

import { useState, useEffect, Suspense } from "react";
import { useAccount, useConnect, useDisconnect, useWriteContract, useReadContract, usePublicClient, useChainId, useSwitchChain } from "wagmi";
import { injected } from "wagmi/connectors";
import { sepolia } from "wagmi/chains";
import Link from "next/link";
import { parseUnits, formatUnits } from "viem";
import { CONTRACTS, SEPOLIA_CONFIG } from "@/lib/evmContracts";
import { useObscura } from "@/hooks/useObscura";

// Toast
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-sm flex items-center gap-3 animate-slide-up ${
      type === "success" ? "bg-green-500/90 text-white" : "bg-red-500/90 text-white"
    }`}>
      <span className="text-xl">{type === "success" ? "✅" : "❌"}</span>
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">✕</button>
    </div>
  );
}

// Wrapper for Suspense boundary
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <Dashboard />
    </Suspense>
  );
}

function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#0B0614] text-white flex items-center justify-center">
      <div className="animate-pulse text-[#8B5CF6]">Loading...</div>
    </div>
  );
}

// Token display decimals (cUSDT = 6, cWETH = 6, cUSDC stand-in = 8).
const DECIMALS = { USDC: 6, WETH: 6, WBTC: 8 } as const;

// A zero ciphertext handle — used to detect "no encrypted value yet".
const ZERO_HANDLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

const MASK = "•••••";

// ERC-7984 / ConfidentialMockToken — operator-based authorization + encrypted balance.
const tokenAbi = [
  { name: "setOperator", type: "function", stateMutability: "nonpayable", inputs: [
    { name: "operator", type: "address" },
    { name: "until", type: "uint48" },
  ], outputs: [] },
  { name: "confidentialBalanceOf", type: "function", stateMutability: "view", inputs: [
    { name: "account", type: "address" },
  ], outputs: [{ name: "", type: "bytes32" }] },
  { name: "mint", type: "function", stateMutability: "nonpayable", inputs: [
    { name: "to", type: "address" },
    { name: "amount", type: "uint64" },
  ], outputs: [] },
] as const;

// ObscuraLending — all amounts are externalEuint64 (bytes32 handle) + inputProof (bytes).
const lendingAbi = [
  { name: "initializePosition", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "configureAgent", type: "function", stateMutability: "nonpayable", inputs: [
    { name: "encLimit", type: "bytes32" },
    { name: "inputProof", type: "bytes" },
    { name: "autoRepay", type: "bool" },
    { name: "x402", type: "bool" },
  ], outputs: [] },
  { name: "deposit", type: "function", stateMutability: "nonpayable", inputs: [
    { name: "token", type: "address" },
    { name: "enc", type: "bytes32" },
    { name: "inputProof", type: "bytes" },
  ], outputs: [] },
  { name: "borrow", type: "function", stateMutability: "nonpayable", inputs: [
    { name: "token", type: "address" },
    { name: "enc", type: "bytes32" },
    { name: "inputProof", type: "bytes" },
  ], outputs: [] },
  { name: "repay", type: "function", stateMutability: "nonpayable", inputs: [
    { name: "token", type: "address" },
    { name: "enc", type: "bytes32" },
    { name: "inputProof", type: "bytes" },
  ], outputs: [] },
  { name: "withdraw", type: "function", stateMutability: "nonpayable", inputs: [
    { name: "token", type: "address" },
    { name: "enc", type: "bytes32" },
    { name: "inputProof", type: "bytes" },
  ], outputs: [] },
  { name: "totalCollateralOf", type: "function", stateMutability: "view", inputs: [
    { name: "owner", type: "address" },
    { name: "token", type: "address" },
  ], outputs: [{ name: "", type: "bytes32" }] },
  { name: "totalBorrowOf", type: "function", stateMutability: "view", inputs: [
    { name: "owner", type: "address" },
    { name: "token", type: "address" },
  ], outputs: [{ name: "", type: "bytes32" }] },
  { name: "agentLimit", type: "function", stateMutability: "view", inputs: [
    { name: "agent", type: "address" },
  ], outputs: [{ name: "", type: "bytes32" }] },
  { name: "agentBorrowed", type: "function", stateMutability: "view", inputs: [
    { name: "agent", type: "address" },
  ], outputs: [{ name: "", type: "bytes32" }] },
] as const;

// ObscuraLP — encrypted deposit/withdraw, encrypted share balance.
const lpAbi = [
  { name: "deposit", type: "function", stateMutability: "nonpayable", inputs: [
    { name: "enc", type: "bytes32" },
    { name: "inputProof", type: "bytes" },
  ], outputs: [] },
  { name: "withdraw", type: "function", stateMutability: "nonpayable", inputs: [
    { name: "enc", type: "bytes32" },
    { name: "inputProof", type: "bytes" },
  ], outputs: [] },
  { name: "sharesOf", type: "function", stateMutability: "view", inputs: [
    { name: "account", type: "address" },
  ], outputs: [{ name: "", type: "bytes32" }] },
] as const;

// ReputationRegistry — encrypted score.
const reputationAbi = [
  { name: "scoreOf", type: "function", stateMutability: "view", inputs: [
    { name: "agent", type: "address" },
  ], outputs: [{ name: "", type: "bytes32" }] },
] as const;

// X402Receipt — confidential machine-to-machine payment receipts.
const x402Abi = [
  { name: "record", type: "function", stateMutability: "nonpayable", inputs: [
    { name: "paymentId", type: "bytes32" },
    { name: "payer", type: "address" },
    { name: "recipient", type: "address" },
    { name: "enc", type: "bytes32" },
    { name: "inputProof", type: "bytes" },
  ], outputs: [] },
] as const;

function Dashboard() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContractAsync } = useWriteContract();
  // FHEVM txs can't be reliably gas-estimated by wallets (the coprocessor/proof path isn't
  // simulatable), which makes MetaMask submit a bad limit ("gas limit too high"). Set an
  // explicit limit on every write — measured heaviest op is ~1.3M; 5M is safe headroom.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sendTx = (o: any) => writeContractAsync({ gas: BigInt(5000000), ...o });
  const publicClient = usePublicClient();
  const { encrypt, decrypt } = useObscura();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const wrongNetwork = isConnected && chainId !== sepolia.id;

  const usdc = CONTRACTS.usdc as `0x${string}`;
  const lending = CONTRACTS.lending as `0x${string}`;
  const lp = CONTRACTS.lp as `0x${string}`;
  const wbtc = CONTRACTS.wbtc as `0x${string}`;
  const weth = CONTRACTS.weth as `0x${string}`;
  const reputation = CONTRACTS.reputation as `0x${string}`;
  const x402 = CONTRACTS.x402 as `0x${string}`;

  const zeroAddr = "0x0000000000000000000000000000000000000000" as const;

  // Encrypted view handles (bytes32). These are opaque ciphertext references, not numbers.
  const { data: collWBTCHandle, refetch: refetchCollWBTC } = useReadContract({ address: lending, abi: lendingAbi, functionName: "totalCollateralOf", args: [address ?? zeroAddr, wbtc] });
  const { data: collWETHHandle, refetch: refetchCollWETH } = useReadContract({ address: lending, abi: lendingAbi, functionName: "totalCollateralOf", args: [address ?? zeroAddr, weth] });
  const { data: borrowUSDCHandle, refetch: refetchBorrowUSDC } = useReadContract({ address: lending, abi: lendingAbi, functionName: "totalBorrowOf", args: [address ?? zeroAddr, usdc] });
  const { data: limitHandle, refetch: refetchLimit } = useReadContract({ address: lending, abi: lendingAbi, functionName: "agentLimit", args: [address ?? zeroAddr] });
  const { data: agentBorrowedHandle, refetch: refetchAgentBorrowed } = useReadContract({ address: lending, abi: lendingAbi, functionName: "agentBorrowed", args: [address ?? zeroAddr] });
  const { data: scoreHandle, refetch: refetchScore } = useReadContract({ address: reputation, abi: reputationAbi, functionName: "scoreOf", args: [address ?? zeroAddr] });
  const { data: lpSharesHandle, refetch: refetchLpShares } = useReadContract({ address: lp, abi: lpAbi, functionName: "sharesOf", args: [address ?? zeroAddr] });
  const { data: usdcBalHandle, refetch: refetchUsdcBal } = useReadContract({ address: usdc, abi: tokenAbi, functionName: "confidentialBalanceOf", args: [address ?? zeroAddr] });

  const [mainTab, setMainTab] = useState<"borrow" | "lp">("borrow");
  const [actionTab, setActionTab] = useState<"supply" | "borrow" | "repay" | "withdraw">("supply");
  const [lpTab, setLpTab] = useState<"deposit" | "withdraw">("deposit");

  const [depositAmount, setDepositAmount] = useState("");
  const [depositAsset, setDepositAsset] = useState<"WETH" | "WBTC">("WETH");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAsset, setWithdrawAsset] = useState<"WETH" | "WBTC">("WETH");
  const [lpAmount, setLpAmount] = useState("");
  const [agentLimitInput, setAgentLimitInput] = useState("1000");

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [lastTx, setLastTx] = useState<string | null>(null);
  const showToast = (message: string, type: "success" | "error" = "success") => setToast({ message, type });

  // Locally-revealed (decrypted) values keyed by a logical slot. undefined = still masked.
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [decrypting, setDecrypting] = useState<Record<string, boolean>>({});

  const [agentConfig, setAgentConfig] = useState({
    enabled: false,
    autoRepay: false,
    x402Enabled: false,
  });
  const [positionInitialized, setPositionInitialized] = useState(false);

  // Avoid SSR/client hydration mismatch: wagmi reconnects the wallet only on the client, so
  // gate wallet-dependent UI until after mount (server + first client render both show the
  // connect screen, then the dashboard renders post-hydration).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Obscura is only deployed on Ethereum Sepolia — auto-switch the wallet there if it's elsewhere.
  useEffect(() => {
    if (mounted && isConnected && chainId !== sepolia.id) switchChain?.({ chainId: sepolia.id });
  }, [mounted, isConnected, chainId, switchChain]);

  const refreshAll = () => {
    refetchCollWBTC();
    refetchCollWETH();
    refetchBorrowUSDC();
    refetchLimit();
    refetchAgentBorrowed();
    refetchScore();
    refetchLpShares();
    refetchUsdcBal();
    // Reading encrypted handles changed → previously-revealed values are stale.
    setRevealed({});
  };

  useEffect(() => {
    refreshAll();
    const t = setInterval(refreshAll, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const decimalsFor = (asset: "USDC" | "WETH" | "WBTC") => DECIMALS[asset];

  const requireAddress = (addr: string | undefined, label: string) => {
    if (!addr || !addr.startsWith("0x") || addr === zeroAddr) {
      showToast(`${label} address missing`, "error");
      return false;
    }
    return true;
  };

  const ensurePosition = async () => {
    if (positionInitialized) return;
    try {
      const hash = await sendTx({ address: lending, abi: lendingAbi, functionName: "initializePosition" });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
    } catch {
      // ignore "already initialized" errors
    } finally {
      setPositionInitialized(true);
    }
  };

  // ERC-7984 authorization: grant the spender operator rights for 1 hour (replaces ERC-20 approve).
  const setOperator = async (token: `0x${string}`, spender: `0x${string}`) => {
    const until = Math.floor(Date.now() / 1000) + 3600; // now + 1 hour (uint48 unix-ts)
    const hash = await sendTx({ address: token, abi: tokenAbi, functionName: "setOperator", args: [spender, until] });
    if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
  };

  async function safeTx(fn: () => Promise<`0x${string}` | void>, label: string) {
    try {
      const hash = await fn();
      if (!hash) {
        showToast(`${label} sent`, "success");
        refreshAll();
        return;
      }
      setLastTx(hash);
      showToast(`${label} sent ${hash.slice(0, 6)}…${hash.slice(-4)}`, "success");
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      showToast(`${label} confirmed`, "success");
      refreshAll();
    } catch {
      showToast(`${label} failed`, "error");
    }
  }

  // EIP-712 user decryption of a single encrypted view handle (only the agent can decrypt their own).
  const reveal = async (
    slot: string,
    handle: unknown,
    contractAddress: string,
    asset: "USDC" | "WETH" | "WBTC" | "SCORE",
  ) => {
    const h = typeof handle === "string" ? handle : undefined;
    if (!h || h === ZERO_HANDLE) {
      setRevealed((p) => ({ ...p, [slot]: asset === "SCORE" ? "0" : "0.00" }));
      return;
    }
    setDecrypting((p) => ({ ...p, [slot]: true }));
    try {
      const value = await decrypt(h, contractAddress);
      const text = asset === "SCORE"
        ? value.toString()
        : Number(formatUnits(value, decimalsFor(asset))).toLocaleString(undefined, { maximumFractionDigits: 6 });
      setRevealed((p) => ({ ...p, [slot]: text }));
    } catch {
      showToast("Decryption failed", "error");
    } finally {
      setDecrypting((p) => ({ ...p, [slot]: false }));
    }
  };

  if (!mounted || !isConnected) {
    return (
      <div className="min-h-screen bg-[#0B0614] text-white flex flex-col gradient-bg">
        <Nav connected={false} onConnect={() => connect({ connector: injected({ target: 'metaMask' }), chainId: sepolia.id })} />
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="relative">
            <div className="absolute inset-0 bg-[#8B5CF6]/20 rounded-full blur-3xl scale-150"></div>
            <img src="/obscura-logo.svg" alt="Obscura" className="h-16 w-auto mb-6 relative z-10" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Connect MetaMask</h1>
          <p className="text-[#8F84A8] mb-8 text-center max-w-sm">
            Connect MetaMask to use Obscura — composable, confidential agentic credit on Ethereum Sepolia. Your debt, collateral and reputation stay encrypted; only you can decrypt them.
          </p>
          <button className="!bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-semibold rounded-xl h-14 px-8" onClick={() => connect({ connector: injected({ target: 'metaMask' }), chainId: sepolia.id })}>
            Connect MetaMask
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0614] text-white gradient-bg">
      <Nav connected address={address} onConnect={() => disconnect()} />

      <div className="max-w-6xl mx-auto px-6 pt-20 pb-8">
        {/* Wrong-network banner */}
        {wrongNetwork && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/40 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-sm text-red-300">⚠️ Wrong network detected. Obscura runs on <b>Ethereum Sepolia</b> — switch to continue.</span>
            <button onClick={() => switchChain?.({ chainId: sepolia.id })} className="h-9 px-4 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-sm font-semibold rounded-lg whitespace-nowrap">Switch to Sepolia</button>
          </div>
        )}
        {/* Confidentiality banner */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-[#160C24]/50 border border-[#2A1B40] rounded-xl">
          <div className="text-center">
            <div className="text-xs text-[#8F84A8] uppercase tracking-wider">Network</div>
            <div className={`text-lg font-bold ${wrongNetwork ? "text-red-400" : "text-white"}`}>{wrongNetwork ? "Wrong network" : SEPOLIA_CONFIG.name}</div>
          </div>
          <div className="text-center border-x border-[#2A1B40]">
            <div className="text-xs text-[#8F84A8] uppercase tracking-wider">Confidentiality</div>
            <div className="text-lg font-bold text-white">FHE · euint64</div>
          </div>
          <div className="text-center border-r border-[#2A1B40]">
            <div className="text-xs text-[#8F84A8] uppercase tracking-wider">Settlement</div>
            <div className="text-lg font-bold text-white">cUSDT (ERC-7984)</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-[#8F84A8] uppercase tracking-wider">Visibility</div>
            <div className="text-lg font-bold text-[#8B5CF6]">Encrypted</div>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setMainTab("borrow")}
            className={`flex-1 py-4 rounded-xl font-medium transition-all ${
              mainTab === "borrow" ? "bg-[#8B5CF6] text-white" : "bg-[#160C24]/80 text-[#A89CC0] border border-[#2A1B40] hover:border-[#321F4A] hover:text-white"
            }`}
          >
            Borrow
          </button>
          <button
            onClick={() => setMainTab("lp")}
            className={`flex-1 py-4 rounded-xl font-medium transition-all ${
              mainTab === "lp" ? "bg-[#8B5CF6] text-white" : "bg-[#160C24]/80 text-[#A89CC0] border border-[#2A1B40] hover:border-[#321F4A] hover:text-white"
            }`}
          >
            Provide Liquidity
          </button>
        </div>

        {mainTab === "borrow" && (
          <>
            {/* Overview Cards — encrypted on-chain, masked until the agent decrypts. */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <DecryptCard label="Collateral WETH" slot="m-collWETH" revealed={revealed} decrypting={decrypting}
                onDecrypt={() => reveal("m-collWETH", collWETHHandle, lending, "WETH")} suffix="WETH" />
              <DecryptCard label="Collateral WBTC" slot="m-collWBTC" revealed={revealed} decrypting={decrypting}
                onDecrypt={() => reveal("m-collWBTC", collWBTCHandle, lending, "WBTC")} suffix="WBTC" />
              <DecryptCard label="Borrowed" slot="m-borrow" revealed={revealed} decrypting={decrypting}
                onDecrypt={() => reveal("m-borrow", borrowUSDCHandle, lending, "USDC")} suffix="cUSDT" color="#8B5CF6" />
              <DecryptCard label="Credit Limit" slot="m-limit" revealed={revealed} decrypting={decrypting}
                onDecrypt={() => reveal("m-limit", limitHandle, lending, "USDC")} suffix="cUSDT" color="#ffd93d" />
              <DecryptCard label="Reputation" slot="m-score" revealed={revealed} decrypting={decrypting}
                onDecrypt={() => reveal("m-score", scoreHandle, reputation, "SCORE")} />
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="flex gap-1 p-1 bg-[#160C24] border border-[#2A1B40] rounded-xl mb-6">
                  {(["supply", "borrow", "repay", "withdraw"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActionTab(tab)}
                      className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                        actionTab === tab ? "bg-[#8B5CF6] text-white shadow-lg shadow-[#8B5CF6]/20" : "text-[#8F84A8] hover:text-white hover:bg-[#2A1B40]"
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="p-6 bg-[#160C24]/80 border border-[#2A1B40] rounded-2xl backdrop-blur-sm card-shine">
                  {/* Supply */}
                  {actionTab === "supply" && (
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Supply Collateral</h3>
                      <p className="text-sm text-[#8F84A8] mb-6">Deposit encrypted collateral to borrow against. The amount is encrypted client-side and stays confidential on-chain.</p>
                      <div className="flex gap-2 mb-4">
                        {(["WETH", "WBTC"] as const).map((asset) => (
                          <button
                            key={asset}
                            onClick={() => setDepositAsset(asset)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              depositAsset === asset ? "bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]" : "bg-[#0B0614] text-[#8F84A8] border border-[#2A1B40] hover:border-[#8B5CF6]/30"
                            }`}
                          >
                            {asset}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1 relative">
                          <input type="number" placeholder="0.00" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} className="w-full h-14 bg-[#0B0614] border border-[#2A1B40] rounded-xl px-4 pr-20 text-white placeholder-[#4A4060] focus:outline-none focus:border-[#8B5CF6] transition-all" />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8F84A8] text-sm font-medium">{depositAsset}</span>
                        </div>
                        <div className="h-14 px-4 flex items-center text-xs text-[#8F84A8]">Operator + encrypt</div>
                        <button onClick={() => safeTx(async () => {
                          if (!requireAddress(lending, "Lending")) return;
                          await ensurePosition();
                          const token = depositAsset === "WETH" ? weth : wbtc;
                          const amt = parseUnits(depositAmount || "0", decimalsFor(depositAsset));
                          // 1) Authorize lending as operator (replaces ERC-20 approve)
                          await setOperator(token, lending);
                          // 2) Encrypt amount against the contract that reads it (LENDING)
                          const { handle, inputProof } = await encrypt(lending, amt);
                          // 3) Confidential deposit
                          return sendTx({ address: lending, abi: lendingAbi, functionName: "deposit", args: [token, handle, inputProof] });
                        }, "Supply")}
                          disabled={!depositAmount}
                          className="h-14 px-8 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-semibold rounded-xl transition-all hover:scale-105 disabled:bg-[#2A1B40] disabled:text-[#4A4060] disabled:hover:scale-100">
                          Supply
                        </button>
                      </div>
                      <div className="mt-3 text-xs text-[#8F84A8]">Amount encrypted (euint64) — value is computationally indistinguishable on-chain.</div>
                    </div>
                  )}

                  {/* Borrow */}
                  {actionTab === "borrow" && (
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Borrow</h3>
                      <p className="text-sm text-[#8F84A8] mb-6">Borrow confidential cUSDT against your encrypted collateral. Approval and denial are indistinguishable on-chain.</p>
                      <div className="flex gap-2 mb-4">
                        <span className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]">
                          cUSDT <span className="text-xs opacity-60">confidential</span>
                        </span>
                      </div>
                      <div className="flex gap-3 mb-4">
                        <div className="flex-1 relative">
                          <input type="number" placeholder="0.00" value={borrowAmount} onChange={(e) => setBorrowAmount(e.target.value)} className="w-full h-14 bg-[#0B0614] border border-[#2A1B40] rounded-xl px-4 pr-20 text-white placeholder-[#4A4060] focus:outline-none focus:border-[#8B5CF6] transition-all" />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8F84A8] text-sm font-medium">cUSDT</span>
                        </div>
                        <button onClick={() => safeTx(async () => {
                          if (!requireAddress(lending, "Lending")) return;
                          await ensurePosition();
                          const amt = parseUnits(borrowAmount || "0", DECIMALS.USDC);
                          const { handle, inputProof } = await encrypt(lending, amt);
                          return sendTx({ address: lending, abi: lendingAbi, functionName: "borrow", args: [usdc, handle, inputProof] });
                        }, "Borrow")}
                          disabled={!borrowAmount}
                          className="h-14 px-8 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-semibold rounded-xl transition-all hover:scale-105 disabled:bg-[#2A1B40] disabled:text-[#4A4060] disabled:hover:scale-100">
                          Borrow
                        </button>
                      </div>
                      <div className="p-4 bg-[#0B0614]/50 rounded-xl space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-[#8F84A8]">Credit limit</span><span className="text-[#8B5CF6] font-semibold">{revealed["m-limit"] ? `${revealed["m-limit"]} cUSDT` : MASK}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-[#8F84A8]">Current debt</span><span className="text-white">{revealed["m-borrow"] ? `${revealed["m-borrow"]} cUSDT` : MASK}</span></div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-[#8F84A8]">Borrowed today</span>
                          <span className="text-white flex items-center gap-2">
                            {revealed["m-agentBorrowed"] ? `${revealed["m-agentBorrowed"]} cUSDT` : MASK}
                            <button onClick={() => reveal("m-agentBorrowed", agentBorrowedHandle, lending, "USDC")} disabled={decrypting["m-agentBorrowed"]} className="text-xs text-[#8B5CF6] hover:underline">Decrypt</button>
                          </span>
                        </div>
                        <div className="flex justify-between text-sm"><span className="text-[#8F84A8]">Decryption</span><span className="text-white">EIP-712 (agent only)</span></div>
                      </div>
                      <p className="text-xs text-[#8F84A8] mt-3">Whether a borrow succeeds or is denied for exceeding your encrypted limit is indistinguishable on-chain.</p>
                    </div>
                  )}

                  {/* Repay */}
                  {actionTab === "repay" && (
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Repay</h3>
                      <p className="text-sm text-[#8F84A8] mb-6">Repay your encrypted debt in confidential cUSDT to unlock collateral.</p>
                      <div className="flex gap-3 mb-4">
                        <div className="flex-1 relative">
                          <input type="number" placeholder="0.00" value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} className="w-full h-14 bg-[#0B0614] border border-[#2A1B40] rounded-xl px-4 pr-20 text-white placeholder-[#4A4060] focus:outline-none focus:border-[#4ade80] transition-all" />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8F84A8] text-sm font-medium">cUSDT</span>
                        </div>
                        <div className="h-14 px-4 flex items-center text-xs text-[#8F84A8]">Operator + encrypt</div>
                        <button onClick={() => safeTx(async () => {
                          if (!requireAddress(lending, "Lending")) return;
                          const amt = parseUnits(repayAmount || "0", DECIMALS.USDC);
                          await setOperator(usdc, lending);
                          const { handle, inputProof } = await encrypt(lending, amt);
                          return sendTx({ address: lending, abi: lendingAbi, functionName: "repay", args: [usdc, handle, inputProof] });
                        }, "Repay")}
                          disabled={!repayAmount}
                          className="h-14 px-8 bg-[#4ade80] hover:bg-[#22c55e] text-black font-semibold rounded-xl transition-all hover:scale-105 disabled:bg-[#2A1B40] disabled:text-[#4A4060] disabled:hover:scale-100">Repay</button>
                      </div>
                    </div>
                  )}

                  {/* Withdraw */}
                  {actionTab === "withdraw" && (
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Withdraw Collateral</h3>
                      <p className="text-sm text-[#8F84A8] mb-6">Withdraw your supplied encrypted collateral.</p>
                      <div className="flex gap-2 mb-4">
                        {(["WETH", "WBTC"] as const).map((asset) => (
                          <button key={asset} onClick={() => setWithdrawAsset(asset)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${withdrawAsset === asset ? "bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]" : "bg-[#0B0614] text-[#8F84A8] border border-[#2A1B40] hover:border-[#8B5CF6]/30"}`}>{asset}</button>
                        ))}
                      </div>
                      <div className="flex gap-3 mb-4">
                        <div className="flex-1 relative">
                          <input type="number" placeholder="0.00" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="w-full h-14 bg-[#0B0614] border border-[#2A1B40] rounded-xl px-4 pr-20 text-white placeholder-[#4A4060] focus:outline-none focus:border-[#8B5CF6] transition-all" />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8F84A8] text-sm font-medium">{withdrawAsset}</span>
                        </div>
                        <button onClick={() => safeTx(async () => {
                          if (!requireAddress(lending, "Lending")) return;
                          const token = withdrawAsset === "WETH" ? weth : wbtc;
                          const amt = parseUnits(withdrawAmount || "0", decimalsFor(withdrawAsset));
                          const { handle, inputProof } = await encrypt(lending, amt);
                          return sendTx({ address: lending, abi: lendingAbi, functionName: "withdraw", args: [token, handle, inputProof] });
                        }, "Withdraw")}
                        disabled={!withdrawAmount}
                        className="h-14 px-8 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-semibold rounded-xl transition-all hover:scale-105 disabled:bg-[#2A1B40] disabled:text-[#4A4060] disabled:hover:scale-100">Withdraw</button>
                      </div>
                      <div className="p-4 bg-[#0B0614]/50 rounded-xl space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-[#8F84A8]">Deposited {withdrawAsset}</span>
                          <span className="text-white font-semibold flex items-center gap-2">
                            {revealed[withdrawAsset === "WETH" ? "m-collWETH" : "m-collWBTC"] ?? MASK}
                            <button
                              onClick={() => withdrawAsset === "WETH"
                                ? reveal("m-collWETH", collWETHHandle, lending, "WETH")
                                : reveal("m-collWBTC", collWBTCHandle, lending, "WBTC")}
                              className="text-xs text-[#8B5CF6] hover:underline">Decrypt</button>
                          </span>
                        </div>
                        <div className="flex justify-between text-sm"><span className="text-[#8F84A8]">Confidentiality</span><span className="text-white font-semibold">euint64 / FHE</span></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Agent Configuration */}
                <div className="mt-6 p-6 bg-[#160C24]/80 border border-[#2A1B40] rounded-2xl backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-base font-semibold text-white">Agent Configuration</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${agentConfig.enabled ? "bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20" : "bg-[#4A4060]/20 text-[#8F84A8] border border-[#4A4060]/20"}`}>
                      {agentConfig.enabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <p className="text-xs text-[#8F84A8] mb-4">Set an encrypted daily credit limit (cUSDT). The limit ciphertext is decryptable only by the agent.</p>
                  <div className="flex gap-3 mb-3">
                    <div className="flex-1 relative">
                      <input type="number" placeholder="Daily limit" value={agentLimitInput} onChange={(e) => setAgentLimitInput(e.target.value)} className="w-full h-12 bg-[#0B0614] border border-[#2A1B40] rounded-xl px-4 pr-20 text-white placeholder-[#4A4060] focus:outline-none focus:border-[#8B5CF6] transition-all" />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8F84A8] text-sm font-medium">cUSDT</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <AgentButton title="Set Limit" description="Auto-repay + x402" highlighted active={agentConfig.enabled && agentConfig.autoRepay} onClick={() => safeTx(async () => {
                      if (!requireAddress(lending, "Lending")) return;
                      await ensurePosition();
                      const amt = parseUnits(agentLimitInput || "0", DECIMALS.USDC);
                      const { handle, inputProof } = await encrypt(lending, amt);
                      await sendTx({ address: lending, abi: lendingAbi, functionName: "configureAgent", args: [handle, inputProof, true, true] });
                      setAgentConfig({ enabled: true, autoRepay: true, x402Enabled: true });
                    }, "Configure agent")} />
                    <AgentButton title="Manual" description="No x402" active={agentConfig.enabled && !agentConfig.x402Enabled} onClick={() => safeTx(async () => {
                      if (!requireAddress(lending, "Lending")) return;
                      await ensurePosition();
                      const amt = parseUnits(agentLimitInput || "0", DECIMALS.USDC);
                      const { handle, inputProof } = await encrypt(lending, amt);
                      await sendTx({ address: lending, abi: lendingAbi, functionName: "configureAgent", args: [handle, inputProof, false, false] });
                      setAgentConfig({ enabled: true, autoRepay: false, x402Enabled: false });
                    }, "Configure agent")} />
                    <AgentButton title="Disable" description="Zero limit" active={!agentConfig.enabled} onClick={() => safeTx(async () => {
                      if (!requireAddress(lending, "Lending")) return;
                      await ensurePosition();
                      const { handle, inputProof } = await encrypt(lending, BigInt(0));
                      await sendTx({ address: lending, abi: lendingAbi, functionName: "configureAgent", args: [handle, inputProof, false, false] });
                      setAgentConfig({ enabled: false, autoRepay: false, x402Enabled: false });
                    }, "Configure agent")} />
                  </div>
                  {agentConfig.enabled && (
                    <div className="mt-4 p-4 bg-[#0B0614]/50 rounded-xl text-xs text-[#A89CC0] space-y-2">
                      {agentConfig.autoRepay && <div className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-[#4ade80]"></div>Auto-repay enabled</div>}
                      {agentConfig.x402Enabled && <div className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-[#4ade80]"></div>x402 payments enabled</div>}
                      <div className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-[#4ade80]"></div>Daily limit encrypted on-chain (euint64)</div>
                    </div>
                  )}
                </div>

                {/* x402 Payment Demo */}
                <div className="mt-6 p-6 bg-gradient-to-br from-[#160C24]/80 to-[#160C24]/80 border border-[#321F4A] rounded-2xl backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/10 flex items-center justify-center">
                      <span className="text-lg">⚡</span>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">x402 Payment Demo</h3>
                      <p className="text-xs text-[#8F84A8]">Confidential HTTP 402 machine-to-machine payments</p>
                    </div>
                  </div>

                  <div className="p-4 bg-[#0B0614]/60 rounded-xl mb-4">
                    <div className="text-xs text-[#8F84A8] mb-2">Simulated Service Request</div>
                    <div className="font-mono text-sm text-white bg-[#050309] p-3 rounded-lg">
                      <div className="text-[#8B5CF6]">GET /api/premium-data</div>
                      <div className="text-[#8F84A8]">→ 402 Payment Required</div>
                      <div className="text-[#4ade80]">Cost: 1 cUSDT (encrypted)</div>
                    </div>
                  </div>

                  <button
                    onClick={() => safeTx(async () => {
                      if (!requireAddress(x402, "X402")) return;
                      // Generate payment ID
                      const paymentId = `0x${Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;
                      const serviceProvider = "0x000000000000000000000000000000000000dEaD" as `0x${string}`; // Demo recipient
                      const amt = parseUnits("1", DECIMALS.USDC); // 1 cUSDT
                      // Encrypt the payment amount against the X402 contract (which reads it)
                      const { handle, inputProof } = await encrypt(x402, amt);
                      // Record the confidential payment on-chain
                      return sendTx({
                        address: x402,
                        abi: x402Abi,
                        functionName: "record",
                        args: [paymentId, address!, serviceProvider, handle, inputProof]
                      });
                    }, "x402 Payment")}
                    disabled={!agentConfig.x402Enabled}
                    className="w-full h-12 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-semibold rounded-xl transition-all hover:scale-[1.02] disabled:bg-[#2A1B40] disabled:text-[#4A4060] disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    <span>💸</span> Pay 1 cUSDT via x402
                  </button>

                  {!agentConfig.x402Enabled && (
                    <p className="text-xs text-[#8F84A8] text-center mt-3">Enable x402 in Agent Configuration first</p>
                  )}

                  <div className="mt-4 text-xs text-[#8F84A8]">
                    <div className="font-medium text-white mb-2">How it works:</div>
                    <ol className="space-y-1 list-decimal list-inside">
                      <li>Agent requests premium API endpoint</li>
                      <li>Server returns HTTP 402 with payment details</li>
                      <li>Agent pays via X402Receipt with an encrypted amount</li>
                      <li>Server verifies the on-chain receipt, delivers data</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                <div className="p-5 bg-[#160C24]/80 border border-[#2A1B40] rounded-2xl backdrop-blur-sm">
                  <h3 className="text-sm font-medium text-[#A89CC0] mb-4">Your Positions</h3>
                  <div className="mb-4">
                    <div className="text-xs text-[#8F84A8] mb-2">Collateral (encrypted)</div>
                    <div className="text-sm text-white flex items-center justify-between gap-2">
                      <span>{revealed["m-collWETH"] ?? MASK} WETH</span>
                      <button onClick={() => reveal("m-collWETH", collWETHHandle, lending, "WETH")} disabled={decrypting["m-collWETH"]} className="text-xs text-[#8B5CF6] hover:underline">Decrypt</button>
                    </div>
                    <div className="text-sm text-white flex items-center justify-between gap-2 mt-1">
                      <span>{revealed["m-collWBTC"] ?? MASK} WBTC</span>
                      <button onClick={() => reveal("m-collWBTC", collWBTCHandle, lending, "WBTC")} disabled={decrypting["m-collWBTC"]} className="text-xs text-[#8B5CF6] hover:underline">Decrypt</button>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#8F84A8] mb-2">Borrowed (encrypted)</div>
                    <div className="text-sm text-white flex items-center justify-between gap-2">
                      <span>{revealed["m-borrow"] ?? MASK} cUSDT</span>
                      <button onClick={() => reveal("m-borrow", borrowUSDCHandle, lending, "USDC")} disabled={decrypting["m-borrow"]} className="text-xs text-[#8B5CF6] hover:underline">Decrypt</button>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-xs text-[#8F84A8] mb-2">Wallet cUSDT (encrypted)</div>
                    <div className="text-sm text-white flex items-center justify-between gap-2">
                      <span>{revealed["m-walletUsdc"] ?? MASK} cUSDT</span>
                      <button onClick={() => reveal("m-walletUsdc", usdcBalHandle, usdc, "USDC")} disabled={decrypting["m-walletUsdc"]} className="text-xs text-[#8B5CF6] hover:underline">Decrypt</button>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-[#160C24]/80 border border-[#2A1B40] rounded-2xl backdrop-blur-sm">
                  <h3 className="text-sm font-medium text-[#A89CC0] mb-4">Reputation</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center"><span className="text-[#8F84A8]">Score (encrypted)</span>
                      <span className="flex items-center gap-2">{revealed["m-score"] ?? MASK}
                        <button onClick={() => reveal("m-score", scoreHandle, reputation, "SCORE")} disabled={decrypting["m-score"]} className="text-xs text-[#8B5CF6] hover:underline">Decrypt</button>
                      </span>
                    </div>
                    <div className="flex justify-between"><span className="text-[#8F84A8]">Decryption</span><span>EIP-712</span></div>
                    <div className="flex justify-between"><span className="text-[#8F84A8]">Visibility</span><span className="text-[#8B5CF6]">Agent only</span></div>
                  </div>
                </div>

                <div className="p-5 bg-[#160C24]/80 border border-[#2A1B40] rounded-2xl backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-[#8B5CF6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-medium text-white">Composable Privacy</h3>
                  </div>
                  <p className="text-xs text-[#8F84A8] leading-relaxed">Debt, collateral, credit limit, and reputation are encrypted on-chain via Fully Homomorphic Encryption. Only you can decrypt your own values.</p>
                </div>
              </div>
            </div>
          </>
        )}

        {mainTab === "lp" && (
          <>
            {/* LP Overview */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <DecryptCard label="Your LP Shares" slot="m-lpShares" revealed={revealed} decrypting={decrypting}
                onDecrypt={() => reveal("m-lpShares", lpSharesHandle, lp, "USDC")} color="#4ade80" />
              <MetricCard label="Pool Token" value="cUSDT" color="#4ade80" />
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Main LP Panel */}
              <div className="lg:col-span-2">
                {/* LP Tabs */}
                <div className="flex gap-1 p-1 bg-[#160C24] border border-[#2A1B40] rounded-xl mb-6 w-fit">
                  {(["deposit", "withdraw"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setLpTab(tab)}
                      className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-all ${
                        lpTab === tab
                          ? "bg-[#8B5CF6] text-white"
                          : "text-[#8F84A8] hover:text-white hover:bg-[#2A1B40]"
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="p-6 bg-[#160C24]/80 border border-[#2A1B40] rounded-2xl backdrop-blur-sm">
                  <h3 className="text-xl font-semibold mb-2">
                    {lpTab === "deposit" ? "Provide Liquidity" : "Withdraw Liquidity"}
                  </h3>
                  <p className="text-sm text-[#8F84A8] mb-6">
                    {lpTab === "deposit"
                      ? "Provide confidential cUSDT liquidity. Your deposit amount is encrypted client-side."
                      : "Withdraw your encrypted LP shares."}
                  </p>

                  {/* Asset selector */}
                  <div className="flex gap-2 mb-4">
                    <span className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]">
                      cUSDT
                      <span className="text-xs opacity-60">confidential</span>
                    </span>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        placeholder="0.00"
                        value={lpAmount}
                        onChange={(e) => setLpAmount(e.target.value)}
                        className="w-full h-14 bg-[#0B0614] border border-[#2A1B40] rounded-xl px-4 pr-20 text-white placeholder-[#4A4060] focus:outline-none focus:border-[#4ade80] transition-all"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8F84A8] text-sm font-medium">
                        cUSDT
                      </span>
                    </div>
                    <button
                      onClick={() => safeTx(async () => {
                        if (!requireAddress(lp, "LP")) return;
                        const amt = parseUnits(lpAmount || "0", DECIMALS.USDC);
                        if (lpTab === "deposit") {
                          // Authorize LP as operator, encrypt against LP, then deposit
                          await setOperator(usdc, lp);
                          const { handle, inputProof } = await encrypt(lp, amt);
                          await sendTx({ address: lp, abi: lpAbi, functionName: "deposit", args: [handle, inputProof] });
                        } else {
                          // Withdraw an encrypted share amount (encrypted against LP)
                          const { handle, inputProof } = await encrypt(lp, amt);
                          await sendTx({ address: lp, abi: lpAbi, functionName: "withdraw", args: [handle, inputProof] });
                        }
                        setLpAmount("");
                      }, lpTab === "deposit" ? "LP deposit" : "LP withdraw")}
                      disabled={!lpAmount}
                      className={`h-14 px-8 font-semibold rounded-xl transition-all hover:scale-105 disabled:bg-[#2A1B40] disabled:text-[#4A4060] disabled:hover:scale-100 ${
                        lpTab === "deposit" ? "bg-[#4ade80] hover:bg-[#22c55e] text-black" : "bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
                      }`}
                    >
                      {lpTab === "deposit" ? "Deposit" : "Withdraw"}
                    </button>
                  </div>

                  <div className="mt-6 p-4 bg-[#0B0614]/50 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[#8F84A8]">Your LP shares (encrypted)</span>
                      <span className="text-white font-semibold flex items-center gap-2">
                        {revealed["m-lpShares"] ?? MASK}
                        <button onClick={() => reveal("m-lpShares", lpSharesHandle, lp, "USDC")} disabled={decrypting["m-lpShares"]} className="text-xs text-[#4ade80] hover:underline">Decrypt</button>
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#8F84A8]">Settlement token</span>
                      <span className="text-[#4ade80] font-semibold">cUSDT (ERC-7984)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* LP Sidebar */}
              <div className="space-y-4">
                <div className="p-5 bg-[#160C24]/80 border border-[#2A1B40] rounded-2xl backdrop-blur-sm">
                  <h3 className="text-sm font-medium text-[#A89CC0] mb-4">Your LP Positions</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-white">cUSDT</span>
                      <div className="text-right flex items-center gap-2">
                        <div className="text-white font-medium">{revealed["m-lpShares"] ?? MASK}</div>
                        <button onClick={() => reveal("m-lpShares", lpSharesHandle, lp, "USDC")} disabled={decrypting["m-lpShares"]} className="text-xs text-[#4ade80] hover:underline">Decrypt</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-[#160C24]/80 border border-[#2A1B40] rounded-2xl backdrop-blur-sm">
                  <h3 className="text-sm font-medium text-[#A89CC0] mb-4">Pool Statistics</h3>
                  <div className="space-y-3">
                    <InfoRow label="Settlement Token" value="cUSDT (ERC-7984)" />
                    <InfoRow label="Network" value={SEPOLIA_CONFIG.name} />
                    <InfoRow label="Confidentiality" value="FHE · euint64" />
                  </div>
                </div>

                <div className="p-5 bg-gradient-to-br from-[#2A1B40]/80 to-[#160C24]/80 border border-[#4ade80]/10 rounded-2xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-[#4ade80]/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-[#4ade80]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-medium text-white">Agent-Native Protocol</h3>
                  </div>
                  <p className="text-xs text-[#8F84A8] leading-relaxed mb-2">
                    AI agents are first-class citizens: they can borrow autonomously AND provide liquidity — all with encrypted amounts.
                  </p>
                  <div className="text-xs text-[#4ade80]/80 space-y-1">
                    <div>• Agents as borrowers: confidential credit</div>
                    <div>• Agents as LPs: encrypted yield positions</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="mt-10 flex items-center justify-between">
          <Link href="/" className="text-sm text-[#A89CC0] hover:text-white">← Back</Link>
          {lastTx && (
            <a href={`${SEPOLIA_CONFIG.explorer}/tx/${lastTx}`} target="_blank" rel="noreferrer" className="text-sm text-[#A89CC0] hover:text-[#8B5CF6]">
              View last tx on Etherscan ↗
            </a>
          )}
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

function Nav({ connected, onConnect, address }: { connected: boolean; onConnect: () => void; address?: string }) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0B0614]/80 backdrop-blur-xl border-b border-[#2A1B40]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/obscura-logo.svg" alt="Obscura" className="h-7 w-auto" />
        </div>
        <div className="flex items-center gap-3">
          <a href="/faucet" className="text-sm text-[#A89CC0] hover:text-white">Faucet</a>
          {!connected ? (
            <button className="h-9 px-4 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl font-semibold" onClick={onConnect}>Connect MetaMask</button>
          ) : (
            <div className="relative">
            <button className="h-9 px-4 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl font-semibold" onClick={() => setUserMenuOpen((v) => !v)}>{address?.slice(0, 6)}…{address?.slice(-4)}</button>
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-[#160C24] border border-[#2A1B40] rounded-xl shadow-xl z-50">
                <button className="w-full text-left px-4 py-2 text-sm text-white hover:bg-[#2A1B40] rounded-xl" onClick={onConnect}>Disconnect</button>
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function MetricCard({ label, value, subtitle, color }: { label: string; value: string; subtitle?: string; color?: string }) {
  return (
    <div className="p-4 bg-[#160C24]/80 border border-[#2A1B40] rounded-2xl">
      <div className="text-xs text-[#8F84A8] uppercase tracking-wider">{label}</div>
      <div className="text-xl font-bold" style={{ color: color || "#fff" }}>{value}</div>
      {subtitle && <div className="text-xs text-[#8F84A8] mt-1">{subtitle}</div>}
    </div>
  );
}

// Masked metric card with an inline Decrypt button (EIP-712 user decryption).
function DecryptCard({
  label, slot, revealed, decrypting, onDecrypt, suffix, color,
}: {
  label: string;
  slot: string;
  revealed: Record<string, string>;
  decrypting: Record<string, boolean>;
  onDecrypt: () => void;
  suffix?: string;
  color?: string;
}) {
  const value = revealed[slot];
  const busy = decrypting[slot];
  return (
    <div className="p-4 bg-[#160C24]/80 border border-[#2A1B40] rounded-2xl">
      <div className="text-xs text-[#8F84A8] uppercase tracking-wider">{label}</div>
      <div className="text-xl font-bold truncate" style={{ color: color || "#fff" }}>
        {value !== undefined ? `${value}${suffix ? ` ${suffix}` : ""}` : "•••••"}
      </div>
      <button
        onClick={onDecrypt}
        disabled={busy}
        className="mt-1 text-xs text-[#8B5CF6] hover:underline disabled:opacity-50"
      >
        {busy ? "Decrypting…" : value !== undefined ? "Re-decrypt" : "Decrypt"}
      </button>
    </div>
  );
}

function AgentButton({ title, description, active, highlighted, onClick }: { title: string; description: string; active?: boolean; highlighted?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`p-4 rounded-xl text-sm font-medium border transition-all ${
      active ? "bg-[#8B5CF6]/20 text-[#8B5CF6] border-[#8B5CF6]" : highlighted ? "bg-[#0B0614] border-[#2A1B40] hover:border-[#8B5CF6]/40" : "bg-[#0B0614] border-[#2A1B40] hover:border-[#321F4A]"
    }`}>
      <div>{title}</div>
      <div className="text-xs text-[#8F84A8] mt-1">{description}</div>
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-[#8F84A8]">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}
