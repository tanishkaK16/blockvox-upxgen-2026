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
