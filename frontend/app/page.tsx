'use client';

import React from 'react';
import Link from 'next/link';
import { useSectionObserver } from '@/hooks/use-section-observer';
import { 
  Unlock, EyeOff, Ban, AlertTriangle, 
  ShieldCheck, LayoutDashboard, Brain, 
  Activity, Zap, Info, AlertCircle,
  FileSearch, CheckCircle2,
  ChevronDown, ArrowRight, Layers,
  Fingerprint, Database, Eye,
  Lock as LockIcon,
  Share2
} from 'lucide-react';

/**
 * ═══════════════════════════════════════════════════════
 * BLOCKVOX — LANDING PORTAL
 * ═══════════════════════════════════════════════════════
 * The primary entry point for the BlockVox protocol. Provides high-fidelity 
 * visualization of the e-voting mission and technical architecture.
 * ═══════════════════════════════════════════════════════
 */

/* ─────────────────────── Hero ─────────────────────── */
function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-[72px] overflow-hidden">
      {/* Gradient orbs */}
      <div className="gradient-orb w-[600px] h-[600px] bg-[#E30613] top-[-200px] left-[-200px]" />
      <div className="gradient-orb w-[400px] h-[400px] bg-[#06B6D4] bottom-[-100px] right-[-100px]" style={{ animationDelay: '-7s' }} />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-8">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-gray-300">Live on Avalanche Fuji Testnet</span>
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.95] tracking-tight mb-6">
          <span className="block">Trustless</span>
          <span className="block text-[#E30613] text-glow-red">E-Voting</span>
          <span className="block text-3xl sm:text-4xl md:text-5xl font-light text-gray-400 mt-2">
            for the chain-native era
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-lg text-gray-400 leading-relaxed mb-10">
          BlockVox uses commit-reveal cryptography, Merkle whitelisting, ZK privacy proofs,
          and AI fraud detection to deliver verifiable, tamper-proof elections on Avalanche.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/vote" className="btn-primary text-lg px-10 py-4 flex items-center gap-2">
            Connect Wallet & Vote <ArrowRight size={20} />
          </Link>
          <Link href="#how-it-works" className="btn-secondary px-8 py-4 flex items-center gap-2">
            How it Works <ChevronDown size={20} />
          </Link>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0A0A0A] to-transparent" />
    </section>
  );
}

/* ─────────────────────── Problem ───────────────────── */
function ProblemSection() {
  const { ref, visible } = useSectionObserver();

  const problems = [
    {
      icon: <Unlock className="text-[#E30613]" />,
      title: 'Centralized Trust',
      desc: 'Traditional voting relies on central authorities that can be corrupted, coerced, or compromised.',
    },
    {
      icon: <EyeOff className="text-[#06B6D4]" />,
      title: 'No Voter Privacy',
      desc: 'Current systems expose voter identity, enabling intimidation and vote-buying.',
    },
    {
      icon: <Ban className="text-gray-400" />,
      title: 'Unverifiable Results',
      desc: 'Citizens cannot independently verify that their vote was counted correctly.',
    },
    {
      icon: <AlertTriangle className="text-yellow-500" />,
      title: 'Fraud & Manipulation',
      desc: 'Paper ballots and EVMs are susceptible to tampering, stuffing, and Sybil attacks.',
    },
  ];

  return (
    <section
      ref={ref as React.Ref<HTMLElement>}
      className={`py-32 relative fade-in-section ${visible ? 'visible' : ''}`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E30613] mb-4 block">
            The Problem
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Elections are <span className="text-gray-500">broken</span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Democratic institutions worldwide face critical trust deficits in their voting infrastructure.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {problems.map((p, i) => (
            <div
              key={i}
              className="glass-card p-8"
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="mb-4 text-2xl">{p.icon}</div>
              <h3 className="text-lg font-semibold mb-2">{p.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── Solution ──────────────────── */
function SolutionSection() {
  const { ref, visible } = useSectionObserver();

  return (
    <section
      ref={ref as React.Ref<HTMLElement>}
      id="how-it-works"
      className={`py-32 relative fade-in-section ${visible ? 'visible' : ''}`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E30613] mb-4 block">
              The Solution
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Block<span className="text-[#E30613]">Vox</span> Protocol
            </h2>
            <p className="text-gray-400 leading-relaxed mb-8">
              A fully on-chain voting protocol on Avalanche that guarantees voter privacy through
              commit-reveal cryptography, eligibility via Merkle tree whitelisting,
              and fraud prevention with AI-powered anomaly detection.
            </p>

            <div className="space-y-4">
              {[
                'Commit-Reveal: votes encrypted until reveal phase',
                'Merkle Whitelisting: only eligible voters can participate',
                'ZK Privacy: zero-knowledge proofs obscure voter identity',
                'AI Fraud Shield: real-time anomaly and Sybil detection',
                'Full Auditability: every vote on-chain, verifiable forever',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full border-2 border-[#E30613] flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 rounded-full bg-[#E30613]" />
                  </div>
                  <span className="text-sm text-gray-300">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Architecture Flowchart */}
          <div className="glass-card p-8">
            <div className="space-y-6">
              {[
                { label: 'Voter connects wallet', color: '#06B6D4', step: '01' },
                { label: 'Merkle proof verifies eligibility', color: '#06B6D4', step: '02' },
                { label: 'Vote encrypted & committed on-chain', color: '#E30613', step: '03' },
                { label: 'Reveal phase: vote decrypted', color: '#E30613', step: '04' },
                { label: 'AI scans for anomalies', color: '#F59E0B', step: '05' },
                { label: 'Results tallied & immutably stored', color: '#10B981', step: '06' },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-4 relative">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 z-10"
                    style={{
                      background: `${step.color}15`,
                      border: `1px solid ${step.color}30`,
                      color: step.color,
                    }}
                  >
                    {step.step}
                  </div>
                  <div className="flex-1 text-sm text-gray-300">{step.label}</div>
                  {i < 5 && (
                    <div className="w-[1px] h-6 absolute left-[20px] top-[40px] z-0" style={{ background: `${step.color}30` }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── Features ──────────────────── */
function FeaturesSection() {
  const { ref, visible } = useSectionObserver();

  const features = [
    {
      title: 'Commit-Reveal Voting',
      desc: 'Two-phase voting prevents front-running and vote manipulation. Votes are hidden until the reveal phase ensures fair tallying.',
      icon: <LockIcon size={32} color="#E30613" strokeWidth={1.5} />,
    },
    {
      title: 'Merkle Whitelisting',
      desc: 'Eligible voter addresses are stored in an efficient Merkle tree. On-chain proof verification ensures only authorized wallets can vote.',
      icon: <Layers size={32} color="#E30613" strokeWidth={1.5} />,
    },
    {
      title: 'ZK Privacy Proofs',
      desc: 'Zero-knowledge proofs allow voters to prove eligibility without revealing identity. Complete voter anonymity with full verifiability.',
      icon: <Fingerprint size={32} color="#E30613" strokeWidth={1.5} />,
    },
    {
      title: 'AI Fraud Shield',
      desc: 'Machine learning models detect Sybil attacks, unusual voting patterns, and potential manipulation attempts in real-time.',
      icon: <ShieldCheck size={32} color="#E30613" strokeWidth={1.5} />,
    },
    {
      title: 'Decentralized Audit',
      desc: 'Everything is public yet private. Any citizen can verify the math while individual voting choices remain cryptographically hidden.',
      icon: <Database size={32} color="#E30613" strokeWidth={1.5} />,
    },
  ];

  return (
    <section
      ref={ref as React.Ref<HTMLElement>}
      className={`py-32 relative fade-in-section ${visible ? 'visible' : ''}`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E30613] mb-4 block">
            Core Features
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Four pillars of trust
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Every layer of BlockVox is designed to eliminate single points of failure in the voting process.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <div key={i} className="glass-card p-8 group" style={{ transitionDelay: `${i * 100}ms` }}>
              <div className="w-14 h-14 rounded-xl bg-[#E30613]/10 border border-[#E30613]/20 flex items-center justify-center mb-6 group-hover:bg-[#E30613]/20 transition-colors">
                {f.icon}
              </div>
              <h3 className="text-xl font-semibold mb-3">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── Architecture ─────────────── */
function ArchitectureSection() {
  const { ref, visible } = useSectionObserver();

  const layers = [
    {
      name: 'Frontend (Next.js 15)',
      items: ['React App Router', 'RainbowKit Wallet', 'wagmi Hooks', 'Framer Motion'],
      color: '#06B6D4',
    },
    {
      name: 'Smart Contract (Solidity)',
      items: ['BlockVoxVoting.sol', 'Commit-Reveal Logic', 'Merkle Verification', 'ReentrancyGuard'],
      color: '#E30613',
    },
    {
      name: 'Avalanche C-Chain',
      items: ['Fuji Testnet', 'Snowman Consensus', '< 1s Finality', 'EVM Compatible'],
      color: '#10B981',
    },
    {
      name: 'Off-Chain Services',
      items: ['AI Fraud Engine', 'IPFS Ballot Storage', 'Merkle Tree Builder', 'Event Indexer'],
      color: '#F59E0B',
    },
  ];

  return (
    <section
      ref={ref as React.Ref<HTMLElement>}
      className={`py-32 relative fade-in-section ${visible ? 'visible' : ''}`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E30613] mb-4 block">
            Architecture
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Full-stack decentralized
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {layers.map((layer, i) => (
            <div key={i} className="glass-card p-6 relative overflow-hidden">
              <div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ background: layer.color }}
              />
              <div
                className="text-xs font-bold uppercase tracking-wider mb-4"
                style={{ color: layer.color }}
              >
                Layer {i + 1}
              </div>
              <h3 className="text-lg font-semibold mb-4">{layer.name}</h3>
              <ul className="space-y-2">
                {layer.items.map((item, j) => (
                  <li key={j} className="text-sm text-gray-400 flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full" style={{ background: layer.color }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── Government Scale ──────────── */
function GovernmentSection() {
  const { ref, visible } = useSectionObserver();

  const stats = [
    { value: '< 1s', label: 'Finality' },
    { value: '4,500+', label: 'TPS on Avalanche' },
    { value: '$0.002', label: 'Avg Transaction Cost' },
    { value: '100%', label: 'Verifiable' },
  ];

  return (
    <section
      ref={ref as React.Ref<HTMLElement>}
      className={`py-32 relative fade-in-section ${visible ? 'visible' : ''}`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="glass-card p-12 md:p-16 relative overflow-hidden">
          {/* Bg accent */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#E30613]/5 rounded-full blur-[100px]" />

          <div className="relative z-10">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E30613] mb-4 block">
              Scalability
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Ready for national scale
            </h2>
            <p className="text-gray-400 max-w-2xl leading-relaxed mb-12">
              Built on Avalanche&apos;s sub-second finality and low gas fees, BlockVox can
              handle campus elections to national referendums. Subnets enable custom
              governance rules per jurisdiction.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((s, i) => (
                <div key={i}>
                  <div className="text-3xl md:text-4xl font-black text-[#E30613] mb-1">{s.value}</div>
                  <div className="text-sm text-gray-400">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── CTA ──────────────────────── */
function CTASection() {
  const { ref, visible } = useSectionObserver();

  return (
    <section
      ref={ref as React.Ref<HTMLElement>}
      className={`py-32 relative fade-in-section ${visible ? 'visible' : ''}`}
    >
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-4xl md:text-6xl font-black mb-6">
          Your vote. <span className="text-[#E30613]">On-chain.</span> Forever.
        </h2>
        <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
          Experience trustless democracy. Connect your wallet and cast your first
          verifiable, private, immutable vote.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/vote" className="btn-primary text-lg px-12 py-4">
            Cast Your Vote
          </Link>
          <Link href="/dashboard" className="btn-secondary px-8 py-4">
            View Live Results →
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── Footer ────────────────────── */
function Footer() {
  return (
    <footer className="py-20 border-t border-white/5 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-red-600/5 blur-[120px] rounded-full" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="text-center md:text-left">
            <div className="text-2xl font-black mb-2 tracking-tighter">
              BLOCK<span className="text-[#E30613]">VOX</span>
            </div>
            <p className="text-sm text-gray-500 max-w-xs">
              Antigravity E-Voting Protocol. Built on Avalanche for a trustless generation.
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end gap-4">
            <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-3xl shadow-2xl">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Network Status</span>
                <span className="text-xs font-bold text-white">Live on Avalanche Fuji</span>
              </div>
            </div>
            
            <a 
              href="https://testnet.snowtrace.io/address/0x368f4B6BAb26E47d1fA6E2eeA0f718E235D3B649" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group flex items-center gap-3 px-5 py-2.5 rounded-xl border border-white/5 hover:border-red-600/30 transition-all hover:bg-red-600/5"
            >
              <div className="flex flex-col items-end">
                <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest group-hover:text-red-400 transition-colors">Contract Address</span>
                <code className="text-[11px] font-mono text-gray-400 group-hover:text-white transition-colors">0x368f...B649</code>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600 group-hover:text-red-500 transition-colors">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>
        </div>

        <div className="mt-20 pt-8 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-600 font-bold uppercase tracking-widest">
          <div>© 2026 BlockVox Protocol</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Security Audit</a>
            <a href="#" className="hover:text-white transition-colors">Whitepaper</a>
            <a href="#" className="hover:text-white transition-colors">Avalanche Ecosystem</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────── Page ─────────────────────── */
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <FeaturesSection />
      <ArchitectureSection />
      <GovernmentSection />
      <CTASection />
      <Footer />
    </>
  );
}
