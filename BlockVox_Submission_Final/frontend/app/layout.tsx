/**
 * ═══════════════════════════════════════════════════════
 * BLOCKVOX — DECENTRALIZED PROTOCOL LAYOUT
 * ═══════════════════════════════════════════════════════
 * The root orchestration layer for the BlockVox e-voting dApp.
 * 
 * CORE INFRASTRUCTURE:
 * 1. WEB3 PROVIDER: Injects RainbowKit and Wagmi for Avalanche Fuji connectivity.
 * 2. HYDRATION GUARD: Suppresses noise from extensions using script injection.
 * 3. AESTHETICS: Global dark-mode styling with high-fidelity glassmorphism.
 * ═══════════════════════════════════════════════════════
 */

import type { Metadata } from 'next';
import './globals.css';
import { Web3Provider } from '@/components/providers';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { ParticleBackground } from '@/components/particle-background';

export const metadata: Metadata = {
  title: 'BlockVox – Trustless E-Voting on Avalanche',
  description:
    'BlockVox is a decentralized e-voting protocol using commit-reveal schemes, Merkle whitelisting, ZK privacy, and AI fraud detection – built on Avalanche.',
  keywords: [
    'blockchain voting',
    'e-voting',
    'Avalanche',
    'dApp',
    'trustless',
    'zero knowledge',
    'commit reveal',
  ],
  openGraph: {
    title: 'BlockVox – Trustless E-Voting Protocol',
    description: 'Decentralized, verifiable, and private voting on Avalanche.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        {/* Suppress chrome.runtime errors from wallet extensions */}
        <script dangerouslySetInnerHTML={{ __html: `
          // Layer 1: Catch errors before anything else sees them
          window.addEventListener('error', function(e) {
            if (e.message && (
              e.message.includes('chrome.runtime') ||
              e.message.includes('Extension context') ||
              e.message.includes('message port closed') ||
              e.message.includes('sendMessage')
            )) {
              e.preventDefault();
              e.stopImmediatePropagation();
              console.log('%c[BlockVox] Suppressed extension error', 'color: #E30613;');
              return false;
            }
          }, true);

          // Layer 2: Catch unhandled promise rejections from extensions
          window.addEventListener('unhandledrejection', function(e) {
            if (e.reason && (
              (typeof e.reason === 'string' && e.reason.includes('chrome.runtime')) ||
              (e.reason.message && (
                e.reason.message.includes('chrome.runtime') ||
                e.reason.message.includes('Extension context') ||
                e.reason.message.includes('sendMessage')
              ))
            )) {
              e.preventDefault();
              e.stopImmediatePropagation();
            }
          });

          // Layer 3: Hide Next.js error overlay if it appears from extension errors
          var observer = new MutationObserver(function(mutations) {
            var overlay = document.querySelector('nextjs-portal');
            if (overlay && overlay.shadowRoot) {
              var dialog = overlay.shadowRoot.querySelector('[role="dialog"]');
              if (dialog && dialog.textContent && dialog.textContent.includes('chrome.runtime')) {
                overlay.remove();
                console.log('%c[BlockVox] Removed extension error overlay', 'color: #E30613;');
              }
            }
          });
          observer.observe(document.documentElement, { childList: true, subtree: true });
        `}} />
      </head>
      <body className="bg-[#0A0A0A] text-white antialiased">
        <Web3Provider>
          <ParticleBackground />
          <Navbar />
          <main className="relative z-10 min-h-screen">{children}</main>
          <Footer />
        </Web3Provider>
      </body>
    </html>
  );
}
