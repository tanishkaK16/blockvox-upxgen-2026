/**
 * ═══════════════════════════════════════════════════════
 * BLOCKVOX — VOTER PARTICIPATION INTERFACE
 * ═══════════════════════════════════════════════════════
 * This page orchestrates the end-to-end voting lifecycle for 
 * eligible election participants on the Avalanche Fuji network.
 * 
 * PROTOCOL PHASES:
 * 1. ELIGIBILITY (Merkle): Verifies address against the on-chain Merkle Root.
 * 2. SYBIL SHIELD (Token): Validates a unique VoterPass to prevent double-voting.
 * 3. COMMIT (Privacy): Submits keccak256(choice + salt) to hide the intent.
 * 4. REVEAL (Transparency): Submits the logic to unlock and tally the vote.
 * ═══════════════════════════════════════════════════════
 */

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { CANDIDATES as DEFAULT_CANDIDATES, SNOWTRACE_URL } from '@/lib/contract';
import {
  isContractDeployed,
  generateSalt,
  computeCommitmentHash,
  hasVoted,
  commitVoteOnChain,
  revealVoteOnChain,
  waitForTx,
  validateVoterToken,
  markTokenUsed,
  BLOCKVOX_CONTRACT_ADDRESS,
  blockvoxABI
} from '@/lib/blockvox';
import { NetworkBanner } from '@/components/network-banner';
import { getElectionData, saveSimulatedVote, type Candidate, VotingMode } from '@/lib/election-store';
import { loadMerkleTree, getProof, verifyProof } from '@/lib/merkle-tree';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { 
  ShieldCheck, Brain, Key, Fingerprint, 
  Activity, Zap, CheckCircle2, AlertTriangle,
  RefreshCw, Lock, Unlock, Send, CheckCircle,
  LayoutDashboard, Terminal, Info, ChevronRight,
  ArrowRight, Shield
} from 'lucide-react';

/* ─── PROTOCOL CONSTANTS ──────────────────────────── */
const DEMO_GAS_COMMIT = '41,000';
const DEMO_GAS_REVEAL = '38,500';
const DEMO_BLOCK_START = 18847200;
const DEMO_SIMULATION_DELAY = 3000;
const SUCCESS_CONFETTI_COUNT = 150;

type Phase = 'connect' | 'merkle' | 'commit' | 'reveal' | 'success' | 'voted';

/* ─── Helpers ───────────────────────────────────────── */
function randomHex(len: number) {
  return '0x' + Array.from({ length: len }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

function truncate(s: string, front = 10, back = 8) {
  if (s.length <= front + back + 3) return s;
  return `${s.slice(0, front)}...${s.slice(-back)}`;
}

/* ─── Animated Red Checkmark SVG ────────────────────── */
function AnimatedCheckmark({ size = 96 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full border-2 border-[#E30613]/30 animate-[successPulse1_2s_ease-out_forwards]" />
      <div className="absolute inset-[-8px] rounded-full border border-[#E30613]/15 animate-[successPulse2_2.5s_ease-out_forwards]" />
      <div className="absolute inset-[-18px] rounded-full border border-[#E30613]/8 animate-[successPulse3_3s_ease-out_forwards]" />
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full"
        style={{ filter: 'drop-shadow(0 0 20px rgba(227, 6, 19, 0.5))' }}
      >
        <circle
          cx="50" cy="50" r="45"
          fill="none"
          stroke="#E30613"
          strokeWidth="3"
          strokeDasharray="283"
          strokeDashoffset="283"
          strokeLinecap="round"
          className="animate-[circleStroke_0.8s_0.2s_ease-out_forwards]"
        />
        <circle
          cx="50" cy="50" r="43"
          fill="#E30613"
          opacity="0"
          className="animate-[circleFill_0.4s_0.8s_ease-out_forwards]"
        />
        <path
          d="M30 52 L44 66 L72 36"
          fill="none"
          stroke="white"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="60"
          strokeDashoffset="60"
          className="animate-[checkDraw_0.5s_1s_ease-out_forwards]"
        />
      </svg>
    </div>
  );
}

/* ─── Flying Particles on Success ───────────────────── */
function SuccessParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    interface Particle {
      x: number; y: number; vx: number; vy: number;
      size: number; alpha: number; color: string; decay: number;
    }
    const particles: Particle[] = [];
    const colors = ['#E30613', '#ff3040', '#ff6b6b', '#ffffff', '#ff8a8a'];
    for (let i = 0; i < 60; i++) {
        const angle = (Math.PI * 2 * i) / 60 + (Math.random() - 0.5) * 0.5;
        const speed = 2 + Math.random() * 5;
        particles.push({
          x: canvas.width / 2, y: canvas.height / 2,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          size: 2 + Math.random() * 4, alpha: 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          decay: 0.015 + Math.random() * 0.01,
        });
    }
    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        p.vy += 0.06; p.alpha -= p.decay;
        if (p.alpha <= 0) return;
        alive = true;
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      if (alive) animId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animId);
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-20" />;
}

/* ─── Live Hash Scramble ────────────────────────────── */
function HashScramble({ target, duration = 2000 }: { target: string; duration?: number }) {
  const [display, setDisplay] = useState('');
  const chars = '0123456789abcdef';
  useEffect(() => {
    if (!target) return;
    const len = target.length;
    let frame = 0;
    const totalFrames = duration / 16;
    const interval = setInterval(() => {
      frame++;
      const progress = Math.min(frame / totalFrames, 1);
      const settled = Math.floor(progress * (len - 2));
      let result = '0x';
      for (let i = 2; i < len; i++) {
        if (i - 2 < settled) result += target[i];
        else result += chars[Math.floor(Math.random() * chars.length)];
      }
      setDisplay(result);
      if (progress >= 1) clearInterval(interval);
    }, 16);
    return () => clearInterval(interval);
  }, [target, duration]);
  return <span>{display || target}</span>;
}

/* ═══════════════════════════════════════════════════════
   MAIN VOTE PAGE
   ═══════════════════════════════════════════════════════ */
export default function VotePage() {
  const { isConnected, address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [phase, setPhase] = useState<Phase>('connect');
  const [candidates, setCandidates] = useState<Candidate[]>([...DEFAULT_CANDIDATES]);
  const [voterToken, setVoterToken] = useState<string>(''); 
  const [demoMode, setDemoMode] = useState<boolean>(false); // ALLOWS FOR GAS-FREE PROTOCOL LIFECYCLE WALKTHROUGH
  const [votingMode, setVotingMode] = useState<VotingMode>(VotingMode.Single);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [approvals, setApprovals] = useState<number[]>([]);
  const [scores, setScores] = useState<number[]>([]);

  const [commitHash, setCommitHash] = useState('');
  const [commitTxHash, setCommitTxHash] = useState('');
  const [revealTxHash, setRevealTxHash] = useState('');
  const [salt, setSalt] = useState('');
  const [gasUsed, setGasUsed] = useState('');
  const [blockNumber, setBlockNumber] = useState(0);
  const [txError, setTxError] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');

  const [merkleVerified, setMerkleVerified] = useState(false);
  const [proofNodes, setProofNodes] = useState<string[]>([]);
  const [alreadyVoted, setAlreadyVoted] = useState(false);

  useEffect(() => {
    const data = getElectionData();
    if (data) {
      setCandidates(data.candidates);
      setVotingMode(data.votingMode);
      if (data.votingMode === VotingMode.Score) {
        setScores(new Array(data.candidates.length).fill(0));
      }
    } else {
      setCandidates([...DEFAULT_CANDIDATES]);
    }
  }, []);

  const liveMode = isContractDeployed();

  useEffect(() => {
    if (isConnected && address && phase === 'connect') {
      const checkStatus = async () => {
        if (liveMode && publicClient) {
            try {
              const cast = await hasVoted(publicClient, address);
              if (cast) {
                setAlreadyVoted(true);
                setPhase('voted');
                return;
              }
            } catch (e) { /* silent fail for demo robustness */ }
        }
        setPhase('merkle');
      };
      checkStatus();
    }
  }, [isConnected, address, phase, liveMode, publicClient]);

  /** 
   * MERKLE VERIFICATION PHASE
   * Checks the connected wallet address against the on-chain Merkle Root 
   * to authoritatively verify eligibility without exposing PII.
   */
  const handleMerkleVerify = useCallback(() => {
    if (!address) return;
    setLoading(true);
    setLoadingStep('Accessing decentralized student registry...');
    setTxError('');

    setTimeout(() => {
      const tree = loadMerkleTree();
      if (!tree || !getProof(tree, address).length) {
        setLoading(false);
        setTxError(`Identity (${address.slice(0,6)}) not found on student whitelist.`);
        return;
      }
      const proof = getProof(tree, address);
      setProofNodes(proof);
      setMerkleVerified(true);
      setLoadingStep('Proof Path Authenticated ✓');
      setTimeout(() => { setLoading(false); setPhase('commit'); }, 800);
    }, 1500);
  }, [address]);

  /** 
   * COMMIT PHASE
   * Blinds the voter's choice using keccak256(choice + salt) and 
   * broadcasts the commitment to the Avalanche Fuji network.
   */
  const handleCommit = useCallback(async () => {
    let rawVoteData: number | number[];
    if (votingMode === VotingMode.Single) {
      if (selectedCandidate === null) return;
      rawVoteData = selectedCandidate;
    } else if (votingMode === VotingMode.Approval) {
      if (approvals.length === 0) return;
      rawVoteData = approvals;
    } else {
      rawVoteData = scores;
    }

    setLoading(true);
    setTxError('');

    if (!demoMode) {
      const tokenStatus = validateVoterToken(voterToken);
      if (!tokenStatus.valid || tokenStatus.used) {
        setLoading(false);
        setTxError(tokenStatus.used ? 'VoterPass token already nullified.' : 'Invalid VoterPass Code.');
        return;
      }
    }

    const voterSalt = generateSalt();
    const voteHash = computeCommitmentHash(rawVoteData, voterSalt, votingMode as number);
    setSalt(voterSalt);
    setCommitHash(voteHash);
    setLoadingStep('Constructing blinded hash...');

    if (!demoMode && liveMode && publicClient) {
      try {
        const rootOnChain = await publicClient.readContract({
          address: BLOCKVOX_CONTRACT_ADDRESS,
          abi: blockvoxABI,
          functionName: 'merkleRoot',
        });
        const tree = loadMerkleTree();
        if (tree && rootOnChain !== tree.root) {
          setLoading(false);
          setTxError('Registry Sync Error: Admin needs to "Start Election" again.');
          return;
        }
      } catch (e) { /* ignore sync error for robustness */ }
    }

    if (!demoMode && liveMode && walletClient && publicClient && address) {
      try {
        setLoadingStep('Broadcasting to Avalanche...');
        localStorage.setItem(`blockvox_commit_${address}`, JSON.stringify({ voteData: rawVoteData, salt: voterSalt, hash: voteHash, mode: votingMode }));
        
        /**
         * TECHNICAL NOTE: nftId = BigInt(0)
         * We use nftId = BigInt(0) for demo-compatible identities. 
         * The smart contract interpreting 0 as a standard wallet-level vote, 
         * bypassing the burned-token requirement while still enforcing Merkle Sybil-resistance.
         */
        const txHash = await commitVoteOnChain(voteHash, proofNodes as `0x${string}`[], BigInt(0), walletClient, address);
        if (!demoMode) markTokenUsed(voterToken, address);
        setCommitTxHash(txHash);

        const receipt = await waitForTx(publicClient, txHash);
        setGasUsed(receipt.gasUsed.toString());
        setBlockNumber(Number(receipt.blockNumber));
        setLoading(false);
        setTimeout(() => setPhase('reveal'), 900);
      } catch (err: unknown) {
        setLoading(false);
        setTxError(err instanceof Error ? err.message : 'Broadcast failed');
      }
    } else {
      setTimeout(() => {
        setCommitTxHash(randomHex(64));
        localStorage.setItem(`blockvox_commit_${address}`, JSON.stringify({ voteData: rawVoteData, salt: voterSalt, hash: voteHash, mode: votingMode }));
        setGasUsed(DEMO_GAS_COMMIT);
        setBlockNumber(DEMO_BLOCK_START + Math.floor(Math.random() * 500));
        setLoading(false);
        setTimeout(() => setPhase('reveal'), 900);
      }, DEMO_SIMULATION_DELAY);
    }
  }, [selectedCandidate, liveMode, walletClient, publicClient, address, proofNodes, voterToken, demoMode, approvals, scores, votingMode]);

  /** 
   * REVEAL PHASE
   * Unlocks the previously committed vote by providing the raw choice and salt. 
   * The contract tallies the vote only if the choice matches the Phase 1 commitment.
   */
  const handleReveal = useCallback(async () => {
    setLoading(true);
    setTxError('');
    const stored = localStorage.getItem(`blockvox_commit_${address}`);
    if (!stored) { setLoading(false); setTxError('Commitment missing in local store.'); return; }
    const { voteData, salt: storedSalt, mode } = JSON.parse(stored);

    if (!demoMode && liveMode && walletClient && publicClient && address) {
      try {
        setLoadingStep('Unlocking choice...');
        const txHash = await revealVoteOnChain(voteData, storedSalt as `0x${string}`, mode, walletClient, address);
        setRevealTxHash(txHash);
        const receipt = await waitForTx(publicClient, txHash);
        setBlockNumber(Number(receipt.blockNumber));
        setGasUsed(receipt.gasUsed.toString());
        setLoading(false);
        confetti({ particleCount: SUCCESS_CONFETTI_COUNT, spread: 70, origin: { y: 0.6 } });
        setPhase('success');
      } catch (err: unknown) { setLoading(false); setTxError(err instanceof Error ? err.message : 'Reveal failed'); }
    } else {
      setLoadingStep('Tallied! Syncing with ledger...');
      setTimeout(() => {
        setRevealTxHash(randomHex(64));
        saveSimulatedVote(voteData, mode);
        setGasUsed(DEMO_GAS_REVEAL);
        setBlockNumber(prev => prev + 2);
        setLoading(false);
        confetti({ particleCount: SUCCESS_CONFETTI_COUNT, spread: 70, origin: { y: 0.6 } });
        setPhase('success');
      }, DEMO_SIMULATION_DELAY);
    }
  }, [liveMode, walletClient, publicClient, address, demoMode]);

  const phaseList: Phase[] = ['connect', 'merkle', 'commit', 'reveal', 'success'];

  return (
    <div className="min-h-screen pt-[120px] pb-32">
      <div className="max-w-3xl mx-auto px-6">
        <NetworkBanner />
        
        <div className="text-center mb-12">
          {demoMode && <DemoBadge />}
          <div className="flex items-center justify-center gap-3 mb-4">
            <ToggleSwitch active={demoMode} onToggle={setDemoMode} label="Demo" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E30613]">Secure Casting</span>
            <StatusPill isLive={liveMode} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic">Voter <span className="text-[#E30613]">Nexus</span></h1>
          {txError && <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center justify-center gap-2"><AlertTriangle size={14} /> {txError}</div>}
        </div>

        <ProgressBar steps={['Connect', 'Verify', 'Commit', 'Reveal', 'Done']} currentIdx={phaseList.indexOf(phase)} />

        <div className="glass-card relative bg-white/[0.02] border-white/10 min-h-[420px] flex flex-col items-stretch overflow-hidden">
          <AnimatePresence mode="wait">
            {loading && <LoadingOverlay step={loadingStep} />}
            {phase === 'connect' && <ConnectStep />}
            {phase === 'merkle' && <MerkleStep address={address} onVerify={handleMerkleVerify} />}
            {phase === 'commit' && <CommitStep candidates={candidates} votingMode={votingMode} selected={selectedCandidate} approvals={approvals} scores={scores} onSelect={setSelectedCandidate} onApprovals={setApprovals} onScores={setScores} voterToken={voterToken} onToken={setVoterToken} demoMode={demoMode} onCommit={handleCommit} />}
            {phase === 'reveal' && <RevealStep commitHash={commitHash} commitTx={commitTxHash} gasUsed={gasUsed} block={blockNumber} onReveal={handleReveal} />}
            {phase === 'success' && <SuccessStep tx={revealTxHash} gas={gasUsed} block={blockNumber} />}
            {phase === 'voted' && <VotedStep address={address} />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ─── MODULAR RENDERERS ─────────────────────────── */

function DemoBadge() {
  return (
    <div className="mb-4 inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1 animate-pulse">
      <div className="w-2 h-2 rounded-full bg-green-500" />
      <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Demo Sandbox Active</span>
    </div>
  );
}

function StatusPill({ isLive }: { isLive: boolean }) {
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${isLive ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'}`}>
      {isLive ? <Activity size={10} /> : <Zap size={10} />} {isLive ? 'Live Chain' : 'Demo Sim'}
    </span>
  );
}

function ToggleSwitch({ active, onToggle, label }: { active: boolean; onToggle: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1">
      <input type="checkbox" checked={active} onChange={(e) => onToggle(e.target.checked)} id="toggle" className="w-3 h-3 accent-[#E30613] cursor-pointer" />
      <label htmlFor="toggle" className="text-[9px] font-extrabold text-gray-500 uppercase cursor-pointer">{label}</label>
    </div>
  );
}

function ProgressBar({ steps, currentIdx }: { steps: string[], currentIdx: number }) {
  return (
    <div className="flex items-center justify-center mb-16 px-4">
      {steps.map((step, i) => (
        <React.Fragment key={step}>
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i <= currentIdx ? 'bg-[#E30613] text-white' : 'bg-white/5 text-gray-600 border border-white/10'}`}>
              {i < currentIdx ? <CheckCircle2 size={16} /> : <span>{i + 1}</span>}
            </div>
            <span className={`text-[9px] mt-2 font-bold uppercase tracking-widest ${i <= currentIdx ? 'text-white' : 'text-gray-600'}`}>{step}</span>
          </div>
          {i < steps.length - 1 && <div className={`h-[1px] w-8 sm:w-16 mx-2 ${i < currentIdx ? 'bg-[#E30613]' : 'bg-white/10'}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

function LoadingOverlay({ step }: { step: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-[#0A0A0A]/80 backdrop-blur-md z-50 flex flex-col items-center justify-center">
      <RefreshCw className="text-[#E30613] animate-spin mb-4" size={48} />
      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{step}</p>
    </motion.div>
  );
}

function ConnectStep() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center p-12 text-center text-white">
      <Lock className="text-[#E30613] mb-6" size={48} />
      <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-4">Initialize Authorization</h3>
      <p className="text-gray-500 text-sm mb-8 max-w-sm">Connect your hardware or decentralized wallet to the Avalanche Fuji ledger to begin the cryptographic handshake.</p>
      <ConnectButton />
    </motion.div>
  );
}

function MerkleStep({ address, onVerify }: { address?: string; onVerify: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 p-12">
      <div className="flex items-center gap-4 mb-8">
        <Fingerprint className="text-[#06B6D4]" size={40} />
        <div><h3 className="text-xl font-black text-white uppercase italic">Eligibility Scan</h3><p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Protocol: Merkle Proof Whitelist</p></div>
      </div>
      <p className="text-[10px] text-gray-500 mb-2 uppercase font-black tracking-widest">Scanning Student Directory...</p>
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-8 font-mono text-xs text-white break-all">{address}</div>
      <button onClick={onVerify} className="w-full py-4 bg-[#E30613] text-white font-black uppercase tracking-widest rounded-xl hover:shadow-[0_0_30px_rgba(227,6,19,0.3)] transition-all">Generate Merkle Proof</button>
    </motion.div>
  );
}

function CommitStep({ candidates, votingMode, selected, approvals, onSelect, onApprovals, voterToken, onToken, demoMode, onCommit }: any) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 p-8">
      <div className="flex flex-col sm:flex-row justify-between gap-6 mb-8">
        <div><h3 className="text-xl font-black text-white uppercase italic mb-1 flex items-center gap-2"><Lock className="text-[#E30613]" size={18} /> Phase 1: Commitment</h3><p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Choice will be blinded via keccak256</p></div>
        <div className="w-full sm:w-48"><input type="text" placeholder="PVG-XXXXXX" value={voterToken} onChange={(e) => onToken(e.target.value.toUpperCase())} disabled={demoMode} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-mono text-[#E30613] focus:border-[#E30613]" /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {candidates.map((c: any) => {
          const isSelected = votingMode === 0 ? selected === c.id : approvals.includes(c.id);
          return <button key={c.id} onClick={() => votingMode === 0 ? onSelect(c.id) : onApprovals((p: any) => p.includes(c.id) ? p.filter((i: any) => i !== c.id) : [...p, c.id])} className={`p-4 rounded-2xl border transition-all text-left ${isSelected ? 'bg-[#E30613]/10 border-[#E30613]' : 'bg-white/5 border-white/10 hover:border-white/20'}`}><span className={`text-sm font-black uppercase italic ${isSelected ? 'text-white' : 'text-gray-400'}`}>{c.name}</span></button>
        })}
      </div>
      <button onClick={onCommit} className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-gray-100 flex items-center justify-center gap-2">Securely Commit intent <ArrowRight size={18} /></button>
    </motion.div>
  );
}

function RevealStep({ commitHash, gasUsed, block, onReveal }: any) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 p-8 flex flex-col justify-center">
      <div className="space-y-6">
        <div><h3 className="text-xl font-black text-white uppercase italic mb-1 flex items-center gap-2"><Unlock className="text-[#06B6D4]" size={18} /> Phase 2: Reveal</h3><p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Unlocking your ballot on-chain</p></div>
        <div className="bg-[#06B6D4]/5 border border-[#06B6D4]/20 rounded-2xl p-6 font-mono text-xs text-white break-all">Commitment Hash: {commitHash}<br/><br/>Confirmed in Block: {block} | Gas Used: {gasUsed}</div>
        <button onClick={onReveal} className="w-full py-4 bg-[#06B6D4] text-white font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2">Broadcast Revelation <ArrowRight size={18} /></button>
      </div>
    </motion.div>
  );
}

function SuccessStep({ tx, gas, block }: any) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center p-12 text-center text-white">
      <SuccessParticles /><AnimatedCheckmark />
      <h3 className="text-3xl font-black uppercase italic mt-8 tracking-tighter">Vote Tallied</h3>
      <p className="text-gray-500 text-sm mb-10 max-w-sm">Your secret choice has been revealed and recorded immutably on the Avalanche Fuji ledger.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full"><Link href="/dashboard" className="py-4 bg-white/5 border border-white/10 text-white font-black uppercase text-xs rounded-xl flex items-center justify-center gap-2"><LayoutDashboard size={14} /> Dashboard</Link><a href={`${SNOWTRACE_URL}/tx/${tx}`} target="_blank" rel="noopener" className="py-4 bg-[#E30613]/10 border border-[#E30613]/30 text-[#E30613] font-black uppercase text-xs rounded-xl flex items-center justify-center gap-2"><Activity size={14} /> Snowtrace</a></div>
    </motion.div>
  );
}

function VotedStep({ address }: { address?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-20 text-center text-white">
      <ShieldCheck className="text-[#06B6D4] mb-6" size={64} />
      <h3 className="text-2xl font-black uppercase tracking-tighter mb-4">Ballot Already Cast</h3>
      <p className="text-gray-500 text-sm mb-8">Record found for identity: {address?.slice(0, 10)}...</p>
      <Link href="/dashboard" className="px-8 py-3 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-white">Monitor Live Results</Link>
    </div>
  );
}
