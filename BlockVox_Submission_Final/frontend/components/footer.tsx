'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="relative border-t border-white/5 bg-[#0A0A0A]">
      {/* Red glow line at top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-[#E30613]/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 bg-[#E30613] rounded-lg rotate-45" />
                <div className="absolute inset-[3px] bg-[#0A0A0A] rounded-[4px] rotate-45" />
                <div className="absolute inset-[6px] bg-[#E30613] rounded-[2px] rotate-45" />
              </div>
              <span className="text-lg font-bold">
                Block<span className="text-[#E30613]">Vox</span>
              </span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Trustless e-voting protocol built on Avalanche. Making every vote
              verifiable, private, and immutable.
            </p>
          </div>

          {/* Protocol */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Protocol
            </h4>
            <ul className="space-y-3">
              <li>
                <Link href="/vote" className="text-sm text-gray-500 hover:text-[#E30613] transition-colors">
                  Cast Vote
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-sm text-gray-500 hover:text-[#E30613] transition-colors">
                  Live Results
                </Link>
              </li>
              <li>
                <Link href="/admin" className="text-sm text-gray-500 hover:text-[#E30613] transition-colors">
                  Admin Panel
                </Link>
              </li>
              <li>
                <a
                  href="https://testnet.snowtrace.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-500 hover:text-[#E30613] transition-colors"
                >
                  Snowtrace Explorer ↗
                </a>
              </li>
            </ul>
          </div>

          {/* Technology */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Technology
            </h4>
            <ul className="space-y-3">
              <li className="text-sm text-gray-500">Commit-Reveal Scheme</li>
              <li className="text-sm text-gray-500">Merkle Tree Whitelisting</li>
              <li className="text-sm text-gray-500">ZK-Proof Privacy</li>
              <li className="text-sm text-gray-500">AI Fraud Detection</li>
            </ul>
          </div>

          {/* Network */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Network
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-gray-500">Fuji Testnet Active</span>
              </div>
              <div className="text-sm text-gray-500">Chain ID: 43113</div>
              <div className="text-sm text-gray-500">Consensus: Snowman</div>
              <a
                href="https://faucet.avax.network/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm text-[#E30613] hover:text-[#ff1a2e] transition-colors"
              >
                Get Test AVAX →
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600">
            © 2026 BlockVox Protocol. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Built for</span>
            <span className="text-xs font-semibold text-[#E30613]">
              upXgen 2026
            </span>
            <span className="text-xs text-gray-600">•</span>
            <span className="text-xs text-gray-600">
              Powered by Avalanche
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
