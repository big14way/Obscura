'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#001520] text-white gradient-bg">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#001520]/80 backdrop-blur-xl border-b border-[#0a2535]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <img src="/obscura-logo.svg" alt="Obscura" className="h-8 w-auto" />
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-[#8a9aa8] hover:text-white transition-all hover:scale-105 text-sm">Features</a>
            <a href="#how-it-works" className="text-[#8a9aa8] hover:text-white transition-all hover:scale-105 text-sm">How it Works</a>
            <a href="https://github.com/big14way/Obscura" target="_blank" className="text-[#8a9aa8] hover:text-white transition-all hover:scale-105 text-sm">Docs</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-[#8a9aa8] hover:text-white transition">
              Dashboard
            </Link>
            <a
              href="/dashboard"
              target="_blank"
              className="h-9 px-4 bg-[#FF4E00] hover:bg-[#E64500] text-white text-sm font-medium rounded-lg transition-all hover:scale-105 hover:shadow-lg hover:shadow-[#FF4E00]/20 flex items-center glow-btn"
            >
              Live Demo
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-[#FF4E00]/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[#FF4E00]/3 rounded-full blur-3xl"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 h-8 px-4 bg-[#FF4E00]/10 border border-[#FF4E00]/30 rounded-full text-xs text-[#FF4E00] mb-8 backdrop-blur-sm animate-fade-in-up font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Confidential x402 · Zama FHE
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6 animate-fade-in-up animate-delay-100">
            Credit Lines
            <br />
            <span className="gradient-text">for AI Agents</span>
          </h1>

          <p className="text-lg md:text-xl text-[#8a9aa8] max-w-2xl mx-auto mb-4 leading-relaxed animate-fade-in-up animate-delay-200">
            Confidential agentic credit. Agents borrow against encrypted collateral, pay via x402, and build on-chain reputation — all amounts stay encrypted with FHE.
          </p>
          <p className="text-sm text-[#6a7a88] max-w-2xl mx-auto mb-10 animate-fade-in-up animate-delay-200">
            Composable privacy for onchain credit. Encrypted collateral → Confidential credit → Private payments → Reputation.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animate-delay-300">
            <Link
              href="/faucet"
              className="h-14 px-8 bg-[#FF4E00] hover:bg-[#E64500] text-white font-semibold rounded-xl transition-all hover:scale-105 hover:shadow-xl hover:shadow-[#FF4E00]/30 flex items-center justify-center gap-2 glow-btn animate-pulse-glow"
            >
              Run the demo in 60s
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/dashboard"
              className="h-14 px-8 bg-[#0a2535] hover:bg-[#0d3040] border border-[#1a3545] hover:border-[#FF4E00]/30 font-semibold rounded-xl transition-all hover:scale-105 flex items-center justify-center"
            >
              Open Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 border-y border-[#0a2535] bg-[#00111a]/50 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-6">
          <div className="text-center group">
            <div className="text-3xl md:text-4xl font-bold text-[#FF4E00] mb-2 group-hover:scale-110 transition-transform">x402</div>
            <div className="text-xs text-[#5a6a78]">Native Payments</div>
          </div>
          <div className="text-center group">
            <div className="text-3xl md:text-4xl font-bold text-[#FF4E00] mb-2 group-hover:scale-110 transition-transform">FHE</div>
            <div className="text-xs text-[#5a6a78]">Encrypted</div>
          </div>
          <div className="text-center group">
            <div className="text-3xl md:text-4xl font-bold text-[#FF4E00] mb-2 group-hover:scale-110 transition-transform">euint64</div>
            <div className="text-xs text-[#5a6a78]">On-Chain Values</div>
          </div>
          <div className="text-center group">
            <div className="text-3xl md:text-4xl font-bold text-[#FF4E00] mb-2 group-hover:scale-110 transition-transform">7984</div>
            <div className="text-xs text-[#5a6a78]">ERC cUSDT</div>
          </div>
          <div className="text-center group">
            <div className="text-3xl md:text-4xl font-bold text-[#FF4E00] mb-2 group-hover:scale-110 transition-transform">Zama</div>
            <div className="text-xs text-[#5a6a78]">Ethereum Sepolia</div>
          </div>
        </div>
      </section>

      {/* Why Zama FHE */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs text-[#5a6a78] uppercase tracking-widest mb-4">Why Zama FHE</p>
          <h3 className="text-center text-2xl md:text-3xl font-bold mb-8">Confidential computation, composable privacy, settled in cUSDT</h3>
          <div className="grid md:grid-cols-3 gap-5">
            <div className="p-6 bg-[#051525]/80 border border-[#0a2535] rounded-2xl">
              <div className="text-sm font-semibold mb-2">Encrypted on-chain</div>
              <p className="text-sm text-[#6a7a88]">Debt, collateral, credit limit and reputation live as encrypted euint64 values. Approval and denial of a loan are computationally indistinguishable on-chain.</p>
            </div>
            <div className="p-6 bg-[#051525]/80 border border-[#0a2535] rounded-2xl">
              <div className="text-sm font-semibold mb-2">Composable privacy</div>
              <p className="text-sm text-[#6a7a88]">Contracts compute directly on encrypted data via Fully Homomorphic Encryption — no plaintext ever touches the chain.</p>
            </div>
            <div className="p-6 bg-[#051525]/80 border border-[#0a2535] rounded-2xl">
              <div className="text-sm font-semibold mb-2">EIP-712 user decryption</div>
              <p className="text-sm text-[#6a7a88]">Only the agent can decrypt its own values, settled in confidential ERC-7984 cUSDT on Ethereum Sepolia.</p>
            </div>
          </div>
        </div>
      </section>

      {/* x402 Hero Feature */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="p-8 md:p-12 bg-gradient-to-br from-[#FF4E00]/10 via-[#051525] to-[#001520] border border-[#FF4E00]/20 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF4E00]/5 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 h-7 px-3 bg-[#FF4E00]/20 border border-[#FF4E00]/30 rounded-full text-xs text-[#FF4E00] mb-6 font-medium">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
                Confidential x402 Receipts
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">How Agents Pay for Services</h2>
              <p className="text-lg text-[#8a9aa8] mb-6 max-w-2xl">
                HTTP 402 "Payment Required" — agents use their credit lines to pay for APIs, data, and services on-chain, with the payment amount recorded as an encrypted euint64 receipt.
              </p>
              <div className="grid md:grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-[#001520]/60 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-[#FF4E00]/10 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-[#FF4E00]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                    </svg>
                  </div>
                  <div className="text-sm font-medium mb-1">Agent Requests</div>
                  <div className="text-xs text-[#6a7a88]">GET /api/data → HTTP 402</div>
                </div>
                <div className="p-4 bg-[#001520]/60 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-[#FF4E00]/10 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-[#FF4E00]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                    </svg>
                  </div>
                  <div className="text-sm font-medium mb-1">Pays via Credit</div>
                  <div className="text-xs text-[#6a7a88]">Confidential cUSDT, encrypted amount</div>
                </div>
                <div className="p-4 bg-[#001520]/60 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-[#4ade80]/10 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-[#4ade80]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-sm font-medium mb-1">Gets Access</div>
                  <div className="text-xs text-[#6a7a88]">Encrypted on-chain receipt verified</div>
                </div>
              </div>
              <div className="font-mono text-sm bg-[#000a10] p-4 rounded-xl border border-[#0a2535]">
                <div className="text-[#6a7a88]">// Agent pays for premium API (amount stays encrypted)</div>
                <div><span className="text-[#FF4E00]">X402Receipt</span>.record(paymentId, payer, recipient, enc, inputProof);</div>
                <div className="text-[#4ade80]">// → euint64 receipt — only the agent can decrypt ✓</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-[#00111a] relative">
        <div className="absolute inset-0 bg-grid opacity-50"></div>
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Full Credit Stack for Agents</h2>
            <p className="text-[#8a9aa8] text-lg">Encrypted collateral → Borrow → Pay → Build reputation → Better rates — all confidential</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard
              title="Confidential x402"
              description="Encrypted on-chain receipts for HTTP 402 flows. Agents pay, servers verify, payment amounts stay private."
            >
              <IconPayment />
            </FeatureCard>
            <FeatureCard
              title="Encrypted Credit Lines"
              description="Agents borrow confidential cUSDT against encrypted collateral. Credit limits are euint64 — approval and denial are indistinguishable on-chain."
            >
              <IconRobot />
            </FeatureCard>
            <FeatureCard
              title="Encrypted Reputation"
              description="Credit score stored as an encrypted euint64 from repayment history. Only the agent can decrypt it via EIP-712."
            >
              <IconStar />
            </FeatureCard>
            <FeatureCard
              title="Compute on Ciphertext"
              description="Contracts run directly on encrypted euint64 values via Fully Homomorphic Encryption — no plaintext ever touches the chain."
            >
              <IconBolt />
            </FeatureCard>
            <FeatureCard
              title="Gradual Deleveraging"
              description="No sudden liquidations. Positions unwound gradually on encrypted state, protecting from MEV."
            >
              <IconShield />
            </FeatureCard>
            <FeatureCard
              title="Confidential LP Yield"
              description="Provide liquidity, earn yield. Encrypted vault shares for automated strategies."
            >
              <IconLink />
            </FeatureCard>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">x402 Payment Flow</h2>
            <p className="text-[#8a9aa8] text-lg">How agents pay for services</p>
          </div>

          <div className="space-y-5">
            <StepCard
              number="01"
              title="Agent Requests Service"
              description="GET /api/premium-data → Server returns HTTP 402 Payment Required with price."
            />
            <StepCard
              number="02"
              title="Confidential x402 Payment"
              description="Agent calls X402Receipt.record() with an encrypted amount and input proof. Encrypted euint64 receipt created on-chain."
            />
            <StepCard
              number="03"
              title="Service Delivered"
              description="Server verifies the encrypted receipt on-chain, delivers content. Reputation updated — values stay confidential."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="p-10 md:p-14 bg-gradient-to-br from-[#FF4E00]/10 via-[#051525] to-[#001520] border border-[#FF4E00]/20 rounded-3xl text-center relative overflow-hidden card-shine">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF4E00]/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#FF4E00]/5 rounded-full blur-3xl"></div>

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Build Agentic Commerce
              </h2>
              <p className="text-[#8a9aa8] mb-10 max-w-lg mx-auto text-lg">
                Confidential x402 payments + encrypted credit + reputation. The full privacy-preserving stack for agents that buy and sell.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/dashboard"
                  target="_blank"
                  className="h-14 px-8 bg-[#FF4E00] hover:bg-[#E64500] text-white font-semibold rounded-xl transition-all hover:scale-105 hover:shadow-xl hover:shadow-[#FF4E00]/30 flex items-center justify-center glow-btn"
                >
                  Live Demo
                </a>
                <a
                  href="https://github.com/big14way/Obscura"
                  target="_blank"
                  className="h-14 px-8 bg-[#0a2535] hover:bg-[#0d3040] border border-[#1a3545] hover:border-[#FF4E00]/30 font-semibold rounded-xl transition-all hover:scale-105 flex items-center justify-center"
                >
                  View Code
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-[#0a2535]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center text-[#5a6a78]">
            <img src="/obscura-logo.svg" alt="Obscura" className="h-6 w-auto" />
          </div>
          <div className="flex gap-8 text-sm">
            <a href="https://x.com/big14way" target="_blank" className="text-[#5a6a78] hover:text-[#FF4E00] transition-colors">
              Twitter
            </a>
            <a href="https://github.com/big14way/Obscura" target="_blank" className="text-[#5a6a78] hover:text-[#FF4E00] transition-colors">
              GitHub
            </a>
            <a href="https://www.zama.org/" target="_blank" className="text-[#5a6a78] hover:text-[#FF4E00] transition-colors">
              Zama FHE
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="p-6 bg-[#051525]/80 border border-[#0a2535] rounded-2xl card-hover card-shine backdrop-blur-sm group">
      <div className="w-10 h-10 rounded-xl bg-[#FF4E00]/10 flex items-center justify-center mb-4 group-hover:bg-[#FF4E00]/20 transition-colors">
        <div className="text-[#FF4E00]">{children}</div>
      </div>
      <h3 className="text-lg font-semibold mb-2 group-hover:text-[#FF4E00] transition-colors">{title}</h3>
      <p className="text-sm text-[#6a7a88] leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex gap-6 p-6 bg-[#051525]/80 border border-[#0a2535] rounded-2xl card-hover card-shine backdrop-blur-sm group">
      <div className="text-3xl font-bold text-[#FF4E00] group-hover:scale-110 transition-transform">{number}</div>
      <div>
        <h3 className="text-lg font-semibold mb-1 group-hover:text-[#FF4E00] transition-colors">{title}</h3>
        <p className="text-sm text-[#6a7a88]">{description}</p>
      </div>
    </div>
  );
}

// Minimal SVG Icons
function IconRobot() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611l-.638.106c-1.518.253-3.042.38-4.565.38a48.172 48.172 0 01-4.568-.38l-.638-.106c-1.716-.293-2.3-2.379-1.067-3.611L10 16.5" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
}

function IconPayment() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function IconBolt() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  );
}
