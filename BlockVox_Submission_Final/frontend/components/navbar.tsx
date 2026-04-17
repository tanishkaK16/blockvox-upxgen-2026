'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/vote', label: 'Vote' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/simulator', label: 'Fairness Simulator' },
  { href: '/admin', label: 'Admin' },
];

/* ─── Custom Wallet Button ──────────────────────────── */
function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        if (!ready) return null;

        // ─── Not connected: big red CTA ───
        if (!account) {
          return (
            <button
              onClick={openConnectModal}
              className="
                relative group flex items-center gap-2.5
                bg-gradient-to-r from-[#E30613] to-[#B80510]
                hover:from-[#ff1a2e] hover:to-[#E30613]
                text-white font-semibold text-sm
                px-6 py-2.5 rounded-xl
                border border-[#E30613]/60
                shadow-[0_0_20px_rgba(227,6,19,0.25)]
                hover:shadow-[0_0_35px_rgba(227,6,19,0.45)]
                transition-all duration-300
                cursor-pointer
              "
            >
              {/* Pulse ring */}
              <span className="absolute -inset-[3px] rounded-xl border border-[#E30613]/30 animate-pulse opacity-60 pointer-events-none" />

              {/* Wallet icon */}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <rect x="2" y="6" width="20" height="12" rx="3" />
                <path d="M16 12h.01" />
                <path d="M2 10h20" />
              </svg>

              Connect Wallet
            </button>
          );
        }

        // ─── Connected: Network switcher + Account ───
        const isWrongNetwork = chain?.unsupported;

        return (
          <div className="flex items-center gap-2">
            {/* ── Network Chip / Switcher ── */}
            <button
              onClick={openChainModal}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium
                border transition-all duration-300 cursor-pointer
                ${
                  isWrongNetwork
                    ? 'bg-red-500/15 border-red-500/40 text-red-400 hover:bg-red-500/25'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:border-[#E30613]/40 hover:text-white'
                }
              `}
              title="Switch network"
            >
              {isWrongNetwork ? (
                <>
                  {/* Warning icon */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>Wrong Network</span>
                </>
              ) : (
                <>
                  {/* Chain icon — Avalanche triangle */}
                  {chain?.hasIcon && chain.iconUrl ? (
                    <img
                      src={chain.iconUrl}
                      alt={chain.name ?? 'Chain'}
                      className="w-4 h-4 rounded-full"
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-[#E30613] flex items-center justify-center">
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="white">
                        <polygon points="5,0 10,10 0,10" />
                      </svg>
                    </div>
                  )}
                  <span className="hidden sm:inline">{chain?.name ?? 'Network'}</span>
                  {/* Dropdown chevron */}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-50">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </>
              )}
            </button>

            {/* ── Account Chip ── */}
            <button
              onClick={openAccountModal}
              className="
                flex items-center gap-2 px-3 py-2 rounded-xl
                bg-gradient-to-r from-[#E30613]/15 to-[#E30613]/5
                border border-[#E30613]/30
                hover:border-[#E30613]/60
                hover:shadow-[0_0_20px_rgba(227,6,19,0.15)]
                transition-all duration-300 cursor-pointer
              "
            >
              {/* Avatar dot */}
              <div className="relative">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#E30613] to-[#ff6b35]" />
                <div className="absolute -bottom-[1px] -right-[1px] w-2 h-2 rounded-full bg-green-500 border border-[#0A0A0A]" />
              </div>

              {/* Address ONLY - Balanced suppressed for demo stability */}
              <span className="text-sm font-medium text-white font-mono">
                {account.displayName}
              </span>
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

/* ─── Navbar ────────────────────────────────────────── */
export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-white/5'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9">
            <div className="absolute inset-0 bg-[#E30613] rounded-lg rotate-45 group-hover:rotate-[225deg] transition-transform duration-700" />
            <div className="absolute inset-[3px] bg-[#0A0A0A] rounded-[5px] rotate-45 group-hover:rotate-[225deg] transition-transform duration-700" />
            <div className="absolute inset-[7px] bg-[#E30613] rounded-[3px] rotate-45 group-hover:rotate-[225deg] transition-transform duration-700" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            Block<span className="text-[#E30613]">Vox</span>
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? 'text-[#E30613] bg-[#E30613]/8'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Wallet + Mobile toggle */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:block">
            <WalletButton />
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex flex-col gap-[5px] p-2"
            aria-label="Toggle menu"
          >
            <span
              className={`block w-5 h-[2px] bg-white transition-all ${
                mobileOpen ? 'rotate-45 translate-y-[7px]' : ''
              }`}
            />
            <span
              className={`block w-5 h-[2px] bg-white transition-all ${
                mobileOpen ? 'opacity-0' : ''
              }`}
            />
            <span
              className={`block w-5 h-[2px] bg-white transition-all ${
                mobileOpen ? '-rotate-45 -translate-y-[7px]' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-white/5 px-6 py-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`block py-3 text-sm font-medium ${
                pathname === link.href ? 'text-[#E30613]' : 'text-gray-400'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-4 pb-2">
            <WalletButton />
          </div>
        </div>
      )}
    </nav>
  );
}
