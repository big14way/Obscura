'use client';

import { useState, useEffect } from "react";
import { useAccount, useConnect, useDisconnect, useWriteContract, useChainId, useSwitchChain } from "wagmi";
import { injected } from "wagmi/connectors";
import { sepolia } from "wagmi/chains";
import { parseUnits } from "viem";
import { CONTRACTS, SEPOLIA_CONFIG, WRAPPERS_REGISTRY } from "@/lib/evmContracts";

// ConfidentialMockToken (ERC-7984). The faucet mint takes a plaintext uint64;
// confidential transfers/operator approvals use setOperator(spender, until).
const tokenAbi = [
  { name: "mint", type: "function", stateMutability: "nonpayable", inputs: [
    { name: "to", type: "address" },
    { name: "amount", type: "uint64" },
  ], outputs: [] },
  { name: "setOperator", type: "function", stateMutability: "nonpayable", inputs: [
    { name: "operator", type: "address" },
    { name: "until", type: "uint48" },
  ], outputs: [] },
] as const;

export default function FaucetPage() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContractAsync } = useWriteContract();
  // Explicit gas limit — FHEVM txs can't be reliably gas-estimated by the wallet.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sendTx = (o: any) => writeContractAsync({ gas: BigInt(2000000), ...o });
  // gate wallet UI until mount to avoid SSR/client hydration mismatch (wagmi reconnects on client)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const wrongNetwork = isConnected && chainId !== sepolia.id;
  useEffect(() => {
    if (mounted && isConnected && chainId !== sepolia.id) switchChain?.({ chainId: sepolia.id });
  }, [mounted, isConnected, chainId, switchChain]);

  const [wethAmount, setWethAmount] = useState("10");
  const [wbtcAmount, setWbtcAmount] = useState("0.1");
  const [usdcAmount, setUsdcAmount] = useState("1000");
  const [status, setStatus] = useState<string | null>(null);

  const weth = CONTRACTS.weth as `0x${string}`;
  const wbtc = CONTRACTS.wbtc as `0x${string}`;
  const usdc = CONTRACTS.usdc as `0x${string}`;
  const lending = CONTRACTS.lending as `0x${string}`;

  // mint(address to, uint64 amount) — amount is a uint64, so cast the scaled value.
  const mint = async (token: `0x${string}`, amount: string, decimals: number, label: string) => {
    if (!address) return;
    setStatus(`Minting confidential ${label}...`);
    try {
      const value = BigInt(parseUnits(amount || "0", decimals));
      await sendTx({ address: token, abi: tokenAbi, functionName: "mint", args: [address, value] });
      setStatus(`${label} minted (encrypted balance updated)`);
    } catch (e) {
      setStatus(`${label} mint failed`);
    }
  };

  // setOperator(LENDING, now + 1h) — the ERC-7984 equivalent of an ERC-20 approve,
  // required before deposit/repay so the Lending contract can move your cTokens.
  const approveLending = async () => {
    if (!address) return;
    setStatus("Approving Obscura (setOperator)...");
    const until = Math.floor(Date.now() / 1000) + 3600; // uint48 unix timestamp (viem maps uint48 -> number)
    try {
      for (const [token, label] of [[usdc, "cUSDT"], [weth, "cWETH"], [wbtc, "cUSDC"]] as const) {
        await sendTx({ address: token, abi: tokenAbi, functionName: "setOperator", args: [lending, until] });
      }
      setStatus("Obscura approved as operator for 1 hour ✓");
    } catch {
      setStatus("setOperator failed");
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0614] text-white px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold">Faucet</h1>
        <p className="mt-2 text-[#A89CC0]">
          Mint confidential ERC-7984 test tokens on {SEPOLIA_CONFIG.name}. Balances are encrypted on-chain (euint64) — only you can decrypt them.
        </p>
        <div className="mt-4 p-3 bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 rounded-xl text-sm text-[#8B5CF6]">
          ⚠️ If contracts were redeployed, your old tokens are invalid. Mint fresh confidential tokens here.
        </div>
        <div className="mt-3 p-3 bg-[#160C24]/80 border border-[#2A1B40] rounded-xl text-xs text-[#A89CC0]">
          Note: this faucet mints on the demo ConfidentialMockToken. On the official Sepolia cTokenMocks, you instead acquire confidential balances via the Zama Wrappers Registry <code className="text-[#D8CFE8]">wrap()</code> (<span className="text-[#D8CFE8]">{WRAPPERS_REGISTRY}</span>), which wraps ERC-20 into ERC-7984.
        </div>

        <div className="mt-6 flex items-center gap-3">
          {(!mounted || !isConnected) ? (
            <button className="h-10 px-4 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl font-semibold" onClick={() => connect({ connector: injected({ target: 'metaMask' }), chainId: sepolia.id })}>Connect MetaMask</button>
          ) : (
            <>
              <button className="h-10 px-4 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl font-semibold" onClick={() => disconnect()}>{address?.slice(0, 6)}…{address?.slice(-4)}</button>
              {wrongNetwork ? (
                <button className="h-10 px-4 bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl font-semibold" onClick={() => switchChain?.({ chainId: sepolia.id })}>⚠️ Switch to Sepolia</button>
              ) : (
                <span className="text-sm text-[#A89CC0]">Connected · {SEPOLIA_CONFIG.name}</span>
              )}
            </>
          )}
        </div>

        <div className="mt-8 space-y-6">
          <div className="p-4 bg-[#160C24]/80 border border-[#2A1B40] rounded-2xl">
            <div className="text-sm text-[#A89CC0] mb-2">cWETH (confidential WETH)</div>
            <div className="flex gap-3">
              <input className="flex-1 h-12 bg-[#0B0614] border border-[#2A1B40] rounded-xl px-4 text-white" value={wethAmount} onChange={(e) => setWethAmount(e.target.value)} />
              <button className="h-12 px-5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl font-semibold" disabled={!isConnected} onClick={() => mint(weth, wethAmount, 6, "cWETH")}>Mint cWETH</button>
            </div>
          </div>

          <div className="p-4 bg-[#160C24]/80 border border-[#2A1B40] rounded-2xl">
            <div className="text-sm text-[#A89CC0] mb-2">cUSDC (confidential, WBTC stand-in)</div>
            <div className="flex gap-3">
              <input className="flex-1 h-12 bg-[#0B0614] border border-[#2A1B40] rounded-xl px-4 text-white" value={wbtcAmount} onChange={(e) => setWbtcAmount(e.target.value)} />
              <button className="h-12 px-5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl font-semibold" disabled={!isConnected} onClick={() => mint(wbtc, wbtcAmount, 8, "cUSDC")}>Mint cUSDC</button>
            </div>
          </div>

          <div className="p-4 bg-[#160C24]/80 border border-[#2A1B40] rounded-2xl">
            <div className="text-sm text-[#A89CC0] mb-2">cUSDT (confidential ERC-7984 settlement token)</div>
            <div className="flex gap-3">
              <input className="flex-1 h-12 bg-[#0B0614] border border-[#2A1B40] rounded-xl px-4 text-white" value={usdcAmount} onChange={(e) => setUsdcAmount(e.target.value)} />
              <button className="h-12 px-5 bg-[#4ade80] hover:bg-[#22c55e] text-black rounded-xl font-semibold" disabled={!isConnected} onClick={() => mint(usdc, usdcAmount, 6, "cUSDT")}>Mint cUSDT</button>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            className="w-full h-14 bg-gradient-to-r from-[#8B5CF6] to-[#A78BFA] hover:from-[#7C3AED] hover:to-[#8B5CF6] text-white rounded-xl font-bold text-lg transition-all hover:scale-[1.02]"
            disabled={!isConnected}
            onClick={async () => {
              setStatus("Minting all confidential tokens...");
              try {
                await mint(weth, wethAmount, 6, "cWETH");
                await mint(wbtc, wbtcAmount, 8, "cUSDC");
                await mint(usdc, usdcAmount, 6, "cUSDT");
                setStatus("All confidential tokens minted ✓");
              } catch {
                setStatus("Some mints failed");
              }
            }}
          >
            🚀 Mint All Tokens
          </button>
        </div>

        <div className="mt-4">
          <button
            className="w-full h-12 bg-[#160C24]/80 border border-[#8B5CF6]/40 text-[#8B5CF6] hover:bg-[#8B5CF6]/10 rounded-xl font-semibold transition-all"
            disabled={!isConnected}
            onClick={approveLending}
          >
            Approve Obscura (setOperator · 1h)
          </button>
          <p className="mt-2 text-xs text-[#A89CC0]">
            ERC-7984 uses operator approvals instead of ERC-20 allowances. This authorizes the Obscura Lending contract to move your confidential tokens for deposit/repay over the next hour.
          </p>
        </div>

        {status && <div className="mt-4 text-sm text-[#A89CC0]">{status}</div>}
      </div>
    </main>
  );
}
