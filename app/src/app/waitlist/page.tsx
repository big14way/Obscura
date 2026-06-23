'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface WaitlistEntry {
  code: string;
  referralCount: number;
  position: number;
  createdAt: string;
}

interface WaitlistStats {
  totalSignups: number;
  totalReferrals: number;
}

interface LeaderboardEntry {
  email: string;
  referralCount: number;
  position: number;
}

export default function WaitlistPage() {
  const [email, setEmail] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [entry, setEntry] = useState<WaitlistEntry | null>(null);
  const [stats, setStats] = useState<WaitlistStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
      setReferralCode(ref);
    }
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await fetch('/api/waitlist');
      const data = await res.json();
      setStats(data.stats);
      setLeaderboard(data.leaderboard);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, referralCode: referralCode || undefined }),
      });

      const data = await res.json();

      if (!res.ok && res.status !== 200) {
        setError(data.error || 'Something went wrong');
        return;
      }

      const entryRes = await fetch(`/api/waitlist/${data.entry.code}`);
      const entryData = await entryRes.json();
      setEntry(entryData);
      setSuccess(data.message);
      loadStats();
    } catch (err) {
      console.error('Submit error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (entry) {
      const link = `${window.location.origin}/waitlist?ref=${entry.code}`;
      navigator.clipboard.writeText(link);
      setSuccess('Referral link copied!');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0614] text-white gradient-bg">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[#0B0614]/80 backdrop-blur-xl border-b border-[#2A1B40]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img src="/obscura-logo.svg" alt="Obscura" className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-[#A89CC0] hover:text-white transition text-sm">
              Home
            </Link>
            <Link href="/dashboard" className="text-[#A89CC0] hover:text-white transition text-sm">
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in-up">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Join the{' '}
            <span className="gradient-text">Waitlist</span>
          </h1>
          <p className="text-xl text-[#A89CC0]">
            Get early access to Obscura and earn rewards for referrals
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-4 mb-12 max-w-md mx-auto animate-fade-in-up animate-delay-100">
            <div className="p-6 rounded-2xl bg-[#160C24]/80 border border-[#2A1B40] text-center card-hover">
              <div className="text-3xl font-bold text-[#8B5CF6]">
                {stats.totalSignups.toLocaleString()}
              </div>
              <div className="text-sm text-[#8F84A8]">Total Signups</div>
            </div>
            <div className="p-6 rounded-2xl bg-[#160C24]/80 border border-[#2A1B40] text-center card-hover">
              <div className="text-3xl font-bold text-[#8B5CF6]">
                {stats.totalReferrals.toLocaleString()}
              </div>
              <div className="text-sm text-[#8F84A8]">Total Referrals</div>
            </div>
          </div>
        )}

        {/* Entry Status (if signed up) */}
        {entry && (
          <div className="mb-12 p-8 rounded-2xl bg-gradient-to-br from-[#8B5CF6]/10 to-[#8B5CF6]/5 border border-[#8B5CF6]/20 animate-fade-in-up">
            <h2 className="text-2xl font-bold mb-6 text-center">You&apos;re on the list!</h2>
            
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-[#8B5CF6]">#{entry.position}</div>
                <div className="text-sm text-[#8F84A8]">Your Position</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-[#8B5CF6]">{entry.referralCount}</div>
                <div className="text-sm text-[#8F84A8]">Referrals</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-mono font-bold text-white">{entry.code}</div>
                <div className="text-sm text-[#8F84A8]">Your Code</div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-[#A89CC0] mb-4">
                Share your referral link to move up the list!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/waitlist?ref=${entry.code}`}
                  className="px-4 py-3 bg-[#0B0614] rounded-xl border border-[#2A1B40] text-[#A89CC0] text-sm flex-1 max-w-md"
                />
                <button
                  onClick={copyReferralLink}
                  className="px-6 py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl font-semibold transition-all hover:scale-105"
                >
                  Copy Link
                </button>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="flex justify-center gap-4 mt-6">
              <a
                href={`https://twitter.com/intent/tweet?text=I just joined the @big14way waitlist! No more liquidation cliffs with GAD protection. Join me: ${typeof window !== 'undefined' ? window.location.origin : ''}/waitlist?ref=${entry.code}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#2A1B40] hover:bg-[#321F4A] text-white rounded-xl transition-all hover:scale-105"
              >
                Share on X
              </a>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/waitlist?ref=${entry.code}`)}&text=Join the Obscura waitlist! No more liquidation cliffs.`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#2A1B40] hover:bg-[#321F4A] text-white rounded-xl transition-all hover:scale-105"
              >
                Share on Telegram
              </a>
            </div>
          </div>
        )}

        {/* Signup Form */}
        {!entry && (
          <form onSubmit={handleSubmit} className="max-w-md mx-auto mb-12 animate-fade-in-up animate-delay-200">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm text-[#A89CC0] mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-6 py-4 bg-[#160C24] rounded-xl border border-[#2A1B40] focus:border-[#8B5CF6] focus:outline-none focus:shadow-lg focus:shadow-[#8B5CF6]/10 transition-all"
                />
              </div>

              <div>
                <label htmlFor="referral" className="block text-sm text-[#A89CC0] mb-2">
                  Referral Code (optional)
                </label>
                <input
                  id="referral"
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="XXXXXXXX"
                  maxLength={8}
                  className="w-full px-6 py-4 bg-[#160C24] rounded-xl border border-[#2A1B40] focus:border-[#8B5CF6] focus:outline-none font-mono uppercase transition-all"
                />
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              {success && !entry && (
                <div className="p-4 bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 rounded-xl text-[#8B5CF6] text-sm">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-8 py-4 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl font-semibold text-lg transition-all hover:scale-105 hover:shadow-xl hover:shadow-[#8B5CF6]/30 disabled:opacity-50 disabled:hover:scale-100 glow-btn"
              >
                {loading ? 'Joining...' : 'Join Waitlist'}
              </button>
            </div>
          </form>
        )}

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <div className="mt-16 animate-fade-in-up animate-delay-300">
            <h2 className="text-2xl font-bold text-center mb-8">Top Referrers</h2>
            <div className="max-w-md mx-auto space-y-3">
              {leaderboard.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-xl bg-[#160C24]/80 border border-[#2A1B40] card-hover"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-bold text-[#8B5CF6] w-8">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </span>
                    <span className="text-[#A89CC0]">{entry.email}</span>
                  </div>
                  <span className="text-[#8B5CF6] font-semibold">
                    {entry.referralCount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Benefits */}
        <div className="mt-16 animate-fade-in-up animate-delay-400">
          <h2 className="text-2xl font-bold text-center mb-8">Why Join Early?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <BenefitCard
              title="Early Access"
              description="Be first to use Obscura when we launch on mainnet"
            />
            <BenefitCard
              title="Exclusive Benefits"
              description="Lower fees and higher LTV limits for early adopters"
            />
            <BenefitCard
              title="Referral Rewards"
              description="Earn bonus rewards for every friend you refer"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-[#2A1B40]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center text-[#6E6486]">
            <img src="/obscura-logo.svg" alt="Obscura" className="h-6 w-auto" />
          </div>
          <div className="flex gap-8 text-sm">
            <a href="https://x.com/big14way" target="_blank" className="text-[#6E6486] hover:text-[#8B5CF6] transition-colors">
              Twitter
            </a>
            <a href="https://t.me/obscura_community" target="_blank" className="text-[#6E6486] hover:text-[#8B5CF6] transition-colors">
              Telegram
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function BenefitCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-6 rounded-2xl bg-[#160C24]/80 border border-[#2A1B40] text-center card-hover card-shine">
      <div className="w-12 h-12 rounded-xl bg-[#8B5CF6]/10 flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-[#8B5CF6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-[#8F84A8]">{description}</p>
    </div>
  );
}
