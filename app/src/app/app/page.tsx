'use client';

import Link from 'next/link';

export default function AppPage() {
  return (
    <main className="min-h-screen bg-[#0B0614] text-white px-6 py-16">
      <h1 className="text-3xl font-bold">Obscura — Confidential App</h1>
      <p className="mt-4 text-[#A89CC0]">
        Frontend wiring in progress. Contracts are deployed on Ethereum Sepolia (Zama FHEVM).
      </p>
      <div className="mt-8 flex gap-4">
        <Link href="/" className="underline">Home</Link>
        <Link href="/dashboard" className="underline">Dashboard</Link>
      </div>
    </main>
  );
}
