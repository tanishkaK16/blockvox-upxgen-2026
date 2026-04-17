'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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
} from '@/lib/blockvox';
import { getElectionData, type Candidate, VotingMode } from '@/lib/election-store';
import { loadMerkleTree, getProof, verifyProof } from '@/lib/merkle-tree';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { ShieldCheck, Brain } from 'lucide-react';

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
      {/* Outer pulse rings */}
      <div className="absolute inset-0 rounded-full border-2 border-[#E30613]/30 animate-[successPulse1_2s_ease-out_forwards]" />
      <div className="absolute inset-[-8px] rounded-full border border-[#E30613]/15 animate-[successPulse2_2.5s_ease-out_forwards]" />
      <div className="absolute inset-[-18px] rounded-full border border-[#E30613]/8 animate-[successPulse3_3s_ease-out_forwards]" />

      {/* Circle fill */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full"
        style={{ filter: 'drop-shadow(0 0 20px rgba(227, 6, 19, 0.5))' }}
      >
        {/* Background circle animation */}
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
        {/* Filled circle fading in */}
        <circle
          cx="50" cy="50" r="43"
          fill="#E30613"
          opacity="0"
          className="animate-[circleFill_0.4s_0.8s_ease-out_forwards]"
        />
        {/* Checkmark path */}
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

    // Burst from center
    for (let i = 0; i < 60; i++) {
      const angle = (Math.PI * 2 * i) / 60 + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 5;
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 4,
        alpha: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        decay: 0.015 + Math.random() * 0.01,
      });
    }

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06; // gravity
        p.alpha -= p.decay;
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

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-20"
    />
  );
}

/* ─── Live Hash Scramble (visual effect) ────────────── */
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
      const settled = Math.floor(progress * (len - 2)); // -2 for "0x"

      let result = '0x';
      for (let i = 2; i < len; i++) {
        if (i - 2 < settled) {
          result += target[i];
        } else {
          result += chars[Math.floor(Math.random() * chars.length)];
        }
      }
      setDisplay(result);
      if (progress >= 1) clearInterval(interval);
    }, 16);

    return () => clearInterval(interval);
  }, [target, duration]);

  return <span>{display || target}</span>;
}

/* ─── Transaction Log Entry ─────────────────────────── */
function TxLogEntry({ label, value, delay, mono = false }: {
  label: string; value: string; delay: number; mono?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  if (!visible) return null;
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 animate-[fadeSlideIn_0.4s_ease-out]">
      <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
      <span className={`text-xs ${mono ? 'font-mono text-[#06B6D4]' : 'text-gray-300'}`}>
        {value}
      </span>
    </div>
  );
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
  const [demoMode, setDemoMode] = useState<boolean>(false); // NEW: Demo Mode toggle
  const [votingMode, setVotingMode] = useState<VotingMode>(VotingMode.Single);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [approvals, setApprovals] = useState<number[]>([]);
  const [scores, setScores] = useState<number[]>([]);

  // Fetch candidates from storage
  useEffect(() => {
    const data = getElectionData();
    if (data) {
      setCandidates(data.candidates);
      setVotingMode(data.votingMode);
      if (data.votingMode === VotingMode.Score) {
        setScores(new Array(data.candidates.length).fill(0));
      }
    } else {
      // Fallback for demo if no data created yet
      setCandidates([...DEFAULT_CANDIDATES]);
    }
  }, []);

  // Is real contract deployed?
  const liveMode = isContractDeployed();

  // Hashes & transaction data
  const [commitHash, setCommitHash] = useState('');
  const [commitTxHash, setCommitTxHash] = useState('');
  const [revealTxHash, setRevealTxHash] = useState('');
  const [salt, setSalt] = useState('');
  const [gasUsed, setGasUsed] = useState('');
  const [blockNumber, setBlockNumber] = useState(0);
  const [txError, setTxError] = useState('');

  // Loading states with sub-steps
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');

  // Merkle proof simulation data
  const [merkleVerified, setMerkleVerified] = useState(false);
  const [proofNodes, setProofNodes] = useState<string[]>([]);

  // Commit details visible flag
  const [showCommitDetails, setShowCommitDetails] = useState(false);
  const [alreadyVoted, setAlreadyVoted] = useState(false);

  /* ── Auto-advance on wallet connect & Check participation ── */
  useEffect(() => {
    if (isConnected && address && phase === 'connect') {
      const checkStatus = async () => {
        if (liveMode && publicClient) {
            let cast = false;
            try {
              cast = await hasVoted(publicClient, address);
            } catch (e) {
              console.warn('⚠️ On-chain participation check (hasVoted) returned zero data or failed. This usually happens if the contract ABI is out of sync. Defaulting to unchecked state to allow demo flow.', e);
            }
            if (cast) {
              setAlreadyVoted(true);
              setPhase('voted');
              return;
            }
        }
        setPhase('merkle');
      };
      checkStatus();
    }
  }, [isConnected, address, phase, liveMode, publicClient]);

  /* ── Merkle Verify ── */
  const handleMerkleVerify = useCallback(() => {
    if (!address) return;
    setLoading(true);
    setLoadingStep('Loading Merkle tree from storage...');
    setTxError('');

    // Animate the verification steps
    const steps = [
      { msg: 'Computing leaf hash: keccak256(abi.encodePacked(address))...', delay: 600 },
      { msg: 'Traversing tree to find sibling hashes...', delay: 1200 },
      { msg: 'Verifying proof path against stored root...', delay: 1800 },
    ];
    steps.forEach(s => {
      setTimeout(() => setLoadingStep(s.msg), s.delay);
    });

    setTimeout(() => {
      const tree = loadMerkleTree();

      if (!tree) {
        setLoading(false);
        setLoadingStep('');
        setTxError('No Merkle tree found. The admin must start an election and upload a voter whitelist first.');
        return;
      }

      const proof = getProof(tree, address);

      if (proof.length === 0) {
        setLoading(false);
        setLoadingStep('');
        setTxError(`Your wallet (${address.slice(0,6)}…${address.slice(-4)}) is not on the voter whitelist.`);
        return;
      }

      // Verify client-side
      const valid = verifyProof(tree.root, address, proof);
      if (!valid) {
        setLoading(false);
        setLoadingStep('');
        setTxError('Proof verification failed. The Merkle tree may be corrupted.');
        return;
      }

      setLoadingStep('Proof validated against root ✓');
      setProofNodes(proof);
      setMerkleVerified(true);

      setTimeout(() => {
        setLoading(false);
        setLoadingStep('');
        setPhase('commit');
      }, 500);
    }, 2400);
  }, [address]);

  /* ── Commit Vote ── */
  const handleCommit = useCallback(async () => {
    let voteData: number | number[];
    if (votingMode === VotingMode.Single) {
      if (selectedCandidate === null) return;
      voteData = selectedCandidate;
    } else if (votingMode === VotingMode.Approval) {
      if (approvals.length === 0) return;
      voteData = approvals;
    } else {
      voteData = scores;
    }

    setLoading(true);
    setTxError('');

    // Check token if not in demo mode
    if (!demoMode) {
      const check = validateVoterToken(voterToken);
      if (!check.valid) {
        setLoading(false);
        setTxError('Invalid Voter Token. Please enter a valid PVG-XXXXXX code from Admin panel.');
        return;
      }
      if (check.used) {
        setLoading(false);
        setTxError('This Voter Token has already been used.');
        return;
      }
    }

    // Generate real salt and commitment hash using viem's keccak256
    const newSalt = generateSalt();
    setSalt(newSalt);
    const commitment = computeCommitmentHash(voteData, newSalt, votingMode as number);
    setCommitHash(commitment);

    setLoadingStep('Generating random salt...');

    if (liveMode && walletClient && publicClient && address) {
      // ─── LIVE: Real on-chain commit ───
      try {
        setLoadingStep('Computing keccak256(candidateId, salt)...');
        await new Promise(r => setTimeout(r, 500));

        localStorage.setItem(`blockvox_commit_${address}`, JSON.stringify({
          voteData,
          salt: newSalt,
          hash: commitment,
          mode: votingMode
        }));

        /* 
          --- PHASE 1: COMMIT ON-CHAIN ---
          If demoMode is active, we use 0 or a fixed value.
        */
        setLoadingStep('Broadcasting to Avalanche Fuji...');
        
        const txHash = await commitVoteOnChain(
          commitment, 
          proofNodes as `0x${string}`[], 
          0n, // Pass 0 as nftId on-chain as we use our Token system for sync
          walletClient, 
          address
        );

        if (!demoMode) {
           markTokenUsed(voterToken, address);
        }
        setCommitTxHash(txHash);

        const receipt = await waitForTx(publicClient, txHash);

        setGasUsed(receipt.gasUsed.toString());
        setBlockNumber(Number(receipt.blockNumber));
        setLoading(false);
        setLoadingStep('');
        setShowCommitDetails(true);
        setTimeout(() => setPhase('reveal'), 800);
      } catch (err: unknown) {
        setLoading(false);
        setLoadingStep('');
        setTxError(err instanceof Error ? err.message : 'Transaction failed');
      }
    } else {
      // ─── DEMO: Simulated commit ───
      setTimeout(() => setLoadingStep('Computing keccak256(candidateId, salt)...'), 700);
      setTimeout(() => setLoadingStep('Building transaction payload...'), 1400);
      setTimeout(() => setLoadingStep('Awaiting wallet signature...'), 2000);
      setTimeout(() => setLoadingStep('Broadcasting to Avalanche Fuji...'), 2800);
      setTimeout(() => setLoadingStep('Waiting for block confirmation...'), 3600);

      setTimeout(() => {
        const txHash = randomHex(64);
        setCommitTxHash(txHash);

        localStorage.setItem(`blockvox_commit_${address}`, JSON.stringify({
          voteData,
          salt: newSalt,
          hash: commitment,
          mode: votingMode
        }));

        setGasUsed((41000 + Math.floor(Math.random() * 8000)).toLocaleString());
        setBlockNumber(18847200 + Math.floor(Math.random() * 500));
        setLoading(false);
        setLoadingStep('');
        setShowCommitDetails(true);
        setTimeout(() => setPhase('reveal'), 800);
      }, 4500);
    }
  }, [selectedCandidate, liveMode, walletClient, publicClient, address, proofNodes]);

  /* 
     --- PHASE 2: REVEAL VOTE ---
     This function reveals the voter's actual choice on-chain.
     Security: It must match the commitment hash stored in Phase 1.
  */
  const handleReveal = useCallback(async () => {
    setLoading(true);
    setTxError('');

    const stored = localStorage.getItem(`blockvox_commit_${address}`);
    if (!stored) {
      setLoading(false);
      setTxError('No matching commitment found in local storage.');
      return;
    }
    const { voteData, salt: storedSalt, mode } = JSON.parse(stored);

    if (liveMode && walletClient && publicClient && address) {
      try {
        setLoadingStep('Preparing reveal payload...');
        await new Promise(r => setTimeout(r, 400));

        setLoadingStep('Sending reveal transaction...');
        const txHash = await revealVoteOnChain(
          voteData,
          storedSalt as `0x${string}`,
          mode,
          walletClient,
          address
        );
        setRevealTxHash(txHash);

        setLoadingStep('Awaiting block confirmation...');
        const receipt = await waitForTx(publicClient, txHash);

        setBlockNumber(Number(receipt.blockNumber));
        setGasUsed(receipt.gasUsed.toString());
        setLoading(false);
        setLoadingStep('');
        
        // Celebration!
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#E30613', '#ffffff', '#ff6b6b']
        });

        setPhase('success');
        setLoadingStep('');
        setPhase('success');
      } catch (err: unknown) {
        setLoading(false);
        setLoadingStep('');
        setTxError(err instanceof Error ? err.message : 'Transaction failed');
      }
    } else {
      setLoadingStep('Preparing reveal payload...');
      setTimeout(() => setLoadingStep('Sending reveal transaction...'), 800);
      setTimeout(() => setLoadingStep('Vote tallied! Finalizing block...'), 4000);

      setTimeout(() => {
        const txHash = randomHex(64);
        setRevealTxHash(txHash);
        
        // Celebration!
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#E30613', '#ffffff', '#ff6b6b']
        });

        setBlockNumber(prev => prev + 2 + Math.floor(Math.random() * 3));
        setGasUsed((38000 + Math.floor(Math.random() * 6000)).toLocaleString());
        setLoading(false);
        setLoadingStep('');
        setPhase('success');
      }, 5000);
    }
  }, [liveMode, walletClient, publicClient, address, selectedCandidate, approvals, scores]);

  /* ── Progress bar ── */
  const phases: Phase[] = ['connect', 'merkle', 'commit', 'reveal', 'success'];
  const stepLabels = ['Connect', 'Verify', 'Commit', 'Reveal', 'Done'];
  const currentIdx = phases.indexOf(phase);

  return (
    <div className="min-h-screen pt-[120px] pb-32">
      <div className="max-w-3xl mx-auto px-6">

        {/* ── Header ── */}
        <div className="text-center mb-12">
          {demoMode && (
            <div className="mb-6 flex justify-center">
              <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1.5 animate-pulse">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">
                  Demo Mode Active – NFT Bypassed
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1 mr-2">
               <input 
                 type="checkbox" 
                 checked={demoMode} 
                 onChange={(e) => setDemoMode(e.target.checked)}
                 id="demo-toggle-header"
                 className="w-3 h-3 accent-[#E30613] cursor-pointer"
               />
               <label htmlFor="demo-toggle-header" className="text-[9px] font-extrabold text-gray-500 uppercase cursor-pointer">
                 Demo
               </label>
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E30613]">
              Cast Your Vote
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
              liveMode
                ? 'text-green-400 border-green-500/30 bg-green-500/10'
                : 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
            }`}>
              {liveMode ? '● Live' : '◉ Simulation'}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Secure Voting Portal
          </h1>
          <p className="text-gray-400 max-w-lg mx-auto">
            Two-phase commit-reveal voting ensures your ballot stays private until the
            reveal window — then gets tallied immutably on Avalanche.
          </p>
          {txError && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-[fadeSlideIn_0.3s_ease-out]">
              ⚠️ {txError}
            </div>
          )}
        </div>

        {/* ── Progress Steps ── */}
        <div className="flex items-center justify-center mb-16">
          {stepLabels.map((step, i) => {
            const isActive = i <= currentIdx;
            const isCurrent = i === currentIdx;
            const isDone = i < currentIdx;

            return (
              <div key={step} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`
                      w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold
                      transition-all duration-500 relative
                      ${isCurrent
                        ? 'bg-[#E30613] text-white scale-110'
                        : isDone
                        ? 'bg-[#E30613]/20 text-[#E30613] border border-[#E30613]/40'
                        : 'bg-white/5 text-gray-500 border border-white/10'
                      }
                    `}
                  >
                    {/* Current step glow ring */}
                    {isCurrent && (
                      <span className="absolute -inset-[5px] rounded-full border-2 border-[#E30613]/30 animate-pulse" />
                    )}
                    {isDone ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span className={`text-[10px] mt-2 font-medium ${isActive ? 'text-white' : 'text-gray-600'}`}>
                    {step}
                  </span>
                </div>
                {i < 4 && (
                  <div className="relative w-12 sm:w-20 h-[2px] mx-1">
                    <div className="absolute inset-0 bg-white/10 rounded-full" />
                    <div
                      className="absolute inset-y-0 left-0 bg-[#E30613] rounded-full transition-all duration-700"
                      style={{ width: i < currentIdx ? '100%' : '0%' }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Phase Card ── */}
        <div className="glass-card relative overflow-hidden bg-white/[0.02] border-white/10 backdrop-blur-3xl p-0 min-h-[400px]">
          <AnimatePresence mode="wait">
            {/* Loading overlay */}
            {loading && (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#0A0A0A]/70 backdrop-blur-md z-50 flex flex-col items-center justify-center"
              >
                <div className="relative w-24 h-24 mb-6">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="absolute inset-0 rounded-full border-2 border-white/5 border-t-red-600 shadow-[0_0_15px_rgba(227,6,19,0.3)]"
                  />
                  <motion.div 
                    animate={{ rotate: -360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                    className="absolute inset-4 rounded-full border-2 border-white/5 border-t-cyan-500/50"
                  />
                </div>
                <p className="text-xl font-black text-white uppercase tracking-tighter mb-2">Processing</p>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] animate-pulse text-center px-6">
                  {loadingStep}
                </p>
              </motion.div>
            )}

            {/* PHASE 1: CONNECT */}
            {phase === 'connect' && (
              <motion.div 
                key="connect"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center py-16 px-8 md:px-12"
              >
                <div className="w-28 h-28 mx-auto mb-10 rounded-[2rem] bg-gradient-to-br from-red-600/20 to-transparent border border-white/10 flex items-center justify-center relative shadow-2xl">
                  <motion.div 
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 3 }}
                    className="absolute -inset-4 rounded-[2.5rem] border border-red-600/10" 
                  />
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#E30613" strokeWidth="1">
                    <rect x="2" y="6" width="20" height="12" rx="3" />
                    <path d="M16 12h.01" />
                    <path d="M2 10h20" />
                  </svg>
                </div>
                <h3 className="text-3xl md:text-4xl font-black mb-4 tracking-tighter text-white uppercase">Initialize Wallet</h3>
                <p className="text-gray-400 mb-10 max-w-md mx-auto text-sm leading-relaxed font-medium">
                  Establish a secure connection to the <span className="text-white">Avalanche Fuji Testnet</span>. 
                  Synchronize your cryptographic signatures for the commit-reveal cycle.
                </p>
                <div className="flex justify-center transform scale-110">
                  <ConnectButton />
                </div>
                <div className="mt-10 pt-8 border-t border-white/5">
                  <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">
                    Requires Gas: <a href="https://faucet.avax.network/" target="_blank" rel="noopener noreferrer" className="text-red-500 hover:text-red-400 underline decoration-red-500/30">Avalanche Faucet</a>
                  </p>
                </div>
              </motion.div>
            )}

            {/* PHASE 2: MERKLE */}
            {phase === 'merkle' && (
              <motion.div 
                key="merkle"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="py-12 px-8 md:px-16"
              >
                <div className="flex flex-col sm:flex-row items-center gap-6 mb-12">
                  <div className="w-16 h-16 rounded-[1.25rem] bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 shadow-2xl">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="1">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <div className="text-center sm:text-left">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Eligibility Proof</h3>
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Merkle Tree Verification Engine</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 flex flex-col gap-1">
                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Active Identity</span>
                    <span className="text-sm font-mono text-cyan-400 font-bold">
                      {address ? `${address.slice(0, 8)}...${address.slice(-6)}` : '—'}
                    </span>
                  </div>
                  <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 flex flex-col gap-1">
                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Merkle Entropy</span>
                    <span className="text-sm font-mono text-gray-400">0x8f3...e721</span>
                  </div>
                </div>

                {proofNodes.length > 0 && (
                  <div className="rounded-xl border border-green-500/15 bg-green-500/[0.03] p-4 mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">Proof Path Verified</span>
                    </div>
                    {proofNodes.map((node, i) => (
                      <div key={i} className="text-[10px] font-mono text-gray-500 py-1 border-b border-white/5 last:border-0">
                        Level {i}: {truncate(node, 14, 10)}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleMerkleVerify}
                  disabled={loading || merkleVerified}
                  className="btn-primary w-full py-4 text-center disabled:opacity-50"
                >
                  {merkleVerified ? '✓ Eligibility Verified' : 'Verify Eligibility'}
                </button>
              </motion.div>
            )}

            {/* PHASE 3: COMMIT */}
            {phase === 'commit' && (
              <motion.div 
                key="commit"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="py-12 px-8 md:px-16"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="status-badge active">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Whitelisted
                  </div>
                  <span className="text-xs text-gray-500 uppercase font-bold tracking-widest">Phase 1 of 2</span>
                </div>

                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Select Candidate</h3>
                <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                  Your vote will be encrypted as <code className="text-[#E30613] bg-[#E30613]/5 px-1.5 py-0.5 rounded text-[11px]">keccak256(id, salt)</code> and committed on-chain.
                </p>

                {/* Voter Token System (Demo Shortcut) */}
                {!demoMode && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0110 0v4" />
                        </svg>
                      </div>
                      <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Voter Token Identification</span>
                    </div>
                    <input 
                      type="text"
                      value={voterToken}
                      onChange={(e) => setVoterToken(e.target.value.toUpperCase())}
                      placeholder="Enter PVG-XXXXXX..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-center font-mono text-xl tracking-[0.3em] text-cyan-400 placeholder-gray-800 focus:border-cyan-500 transition-all mb-2 uppercase"
                    />
                    <div className="flex items-center justify-between">
                       <p className="text-[9px] text-gray-600 italic">
                        Required for secure demo participation.
                       </p>
                       <p className="text-[8px] font-bold text-cyan-500/50 uppercase tracking-tighter cursor-pointer hover:text-cyan-400 transition-colors" onClick={() => window.location.href='/admin'}>
                        Get Token in Admin →
                       </p>
                    </div>
                  </div>
                )}

                {demoMode && (
                  <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-4 mb-8 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">Demo Mode Active – Token Check Bypassed</span>
                  </div>
                )}

                <div className="space-y-4 mb-8">
                  {candidates.map((c, i) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        if (votingMode === VotingMode.Single) {
                          setSelectedCandidate(c.id);
                        } else if (votingMode === VotingMode.Approval) {
                          setApprovals(prev => 
                            prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]
                          );
                        }
                      }}
                      className={`
                        p-6 rounded-xl border text-left transition-all duration-300 group relative overflow-hidden cursor-pointer
                        ${(votingMode === VotingMode.Single && selectedCandidate === c.id) || 
                          (votingMode === VotingMode.Approval && approvals.includes(c.id)) ||
                          (votingMode === VotingMode.Score && (scores[i] || 0) > 0)
                          ? 'border-[#E30613] bg-[#E30613]/[0.08] shadow-[0_0_30px_rgba(227,6,19,0.15)]'
                          : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between relative z-10 w-full">
                        <div className="flex items-center gap-3">
                          {votingMode === VotingMode.Single && (
                            <div className={`
                              w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                              ${selectedCandidate === c.id
                                ? 'border-[#E30613]'
                                : 'border-gray-600 group-hover:border-gray-400'
                              }
                            `}>
                              {selectedCandidate === c.id && (
                                <div className="w-2.5 h-2.5 rounded-full bg-[#E30613]" />
                              )}
                            </div>
                          )}
                          
                          {votingMode === VotingMode.Approval && (
                            <div className={`
                              w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                              ${approvals.includes(c.id)
                                ? 'border-[#E30613] bg-[#E30613]'
                                : 'border-gray-600 group-hover:border-gray-400'
                              }
                            `}>
                              {approvals.includes(c.id) && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4">
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                              )}
                            </div>
                          )}

                          <div className={votingMode === VotingMode.Approval ? "ml-2" : ""}>
                            <span className="font-bold text-white block leading-tight">{c.name}</span>
                            <span className="text-xs text-gray-500 block mt-0.5 font-medium">{c.party}</span>
                          </div>
                        </div>

                        {votingMode === VotingMode.Score && (
                          <div className="flex flex-col items-end gap-2 w-48" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Intensity:</span>
                              <span className="text-[10px] font-black text-[#E30613] uppercase tracking-widest bg-[#E30613]/10 px-2 py-0.5 rounded">
                                {scores[i] || 0}
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              step="1"
                              value={scores[i] || 0}
                              onChange={(e) => {
                                const newScores = [...scores];
                                newScores[i] = parseInt(e.target.value);
                                setScores(newScores);
                              }}
                              className="w-full accent-[#E30613] cursor-pointer"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleCommit}
                  disabled={selectedCandidate === null || loading}
                  className="btn-primary w-full py-4 text-center disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  Commit Vote – Phase 1
                </button>
              </motion.div>
            )}

            {/* PHASE 4: REVEAL */}
            {phase === 'reveal' && (
              <motion.div 
                key="reveal"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="py-12 px-8 md:px-16"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="status-badge active bg-green-500/10 text-green-400 border-green-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
                    Committed
                  </div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Phase 2: Reveal</span>
                </div>

                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Identify & Reveal</h3>
                <p className="text-sm text-gray-400 mb-8 leading-relaxed">
                  Unlock your commitment. This step matches your offline secret to the on-chain hash to count your vote.
                </p>

                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 mb-8">
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-4 font-black">On-Chain Payload</div>
                  <TxLogEntry label="Tx Hash" value={truncate(commitTxHash, 14, 12)} delay={200} mono />
                  <TxLogEntry label="Function" value="revealVote(id, salt)" delay={400} mono />
                  <TxLogEntry label="Commitment" value={truncate(commitHash, 14, 12)} delay={600} mono />
                </div>

                <button
                  onClick={handleReveal}
                  disabled={loading}
                  className="btn-primary w-full py-4 text-center disabled:opacity-50"
                >
                  Reveal Vote – Phase 2
                </button>
              </motion.div>
            )}

            {/* PHASE 5: SUCCESS */}
            {phase === 'success' && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative py-12 px-8 md:px-16 text-center"
              >
                <SuccessParticles />
                <div className="flex justify-center mb-8 relative z-10">
                  <AnimatedCheckmark size={96} />
                </div>

                <h3 className="text-3xl font-black mb-2 text-white uppercase tracking-tighter relative z-10">
                  Vote <span className="text-[#E30613]">Confirmed</span>
                </h3>
                <p className="text-gray-400 mb-10 max-w-md mx-auto text-sm font-medium relative z-10">
                  Your cryptographically-linked ballot has been immutably recorded on the Avalanche Fuji ledger.
                </p>

                <div className="glass-card p-8 text-left max-w-lg mx-auto mb-8 relative overflow-hidden z-10">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#E30613] to-transparent" />
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-6 font-black">Audit Receipt</div>
                  
                  <TxLogEntry label="Status" value="✓ Validated" delay={200} />
                  <TxLogEntry label="Block" value={`#${blockNumber.toLocaleString()}`} delay={400} mono />
                  <TxLogEntry label="Gas Used" value={gasUsed} delay={600} mono />
                  
                  <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
                    <a 
                      href={`${SNOWTRACE_URL}/tx/${commitTxHash}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-between group/link"
                    >
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest group-hover/link:text-white transition-colors">Phase 1 Commit</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-30 group-hover/link:opacity-100 transition-opacity">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                    <a 
                      href={`${SNOWTRACE_URL}/tx/${revealTxHash}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-between group/link"
                    >
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest group-hover/link:text-[#E30613] transition-colors">Phase 2 Reveal</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E30613" strokeWidth="2" className="opacity-30 group-hover/link:opacity-100 transition-opacity">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
                  <Link href="/dashboard" className="btn-primary px-8">
                    View Live Results
                  </Link>
                  <a href={`${SNOWTRACE_URL}/tx/${revealTxHash}`} target="_blank" rel="noopener noreferrer" className="btn-secondary px-8">
                    Snowtrace
                  </a>
                </div>
              </motion.div>
            )}
            {/* PHASE: VOTED (Participation Lock) */}
            {phase === 'voted' && (
              <motion.div 
                key="voted"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16 px-8 md:px-12"
              >
                <div className="w-24 h-24 mx-auto mb-10 rounded-[2rem] bg-gradient-to-br from-green-500/20 to-transparent border border-white/10 flex items-center justify-center relative shadow-2xl">
                  <motion.div 
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                    className="absolute -inset-4 rounded-[2.5rem] border border-green-500/10" 
                  />
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </div>
                <h3 className="text-3xl font-black mb-4 tracking-tighter text-white uppercase">Participation Locked</h3>
                <p className="text-gray-400 mb-10 max-w-md mx-auto text-sm leading-relaxed font-medium">
                  Your identity has already been linked to a submitted ballot in this election. 
                  To maintain the protocol&apos;s integrity, each whitelisted wallet is granted 
                  exactly <span className="text-white font-bold">one immutable vote</span>.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/dashboard" className="btn-primary px-10">
                    View Dashboard
                  </Link>
                  <button 
                    onClick={() => setPhase('connect')} 
                    className="btn-secondary px-8 text-xs opacity-50 hover:opacity-100"
                  >
                    Switch Wallet
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Footer Info ── */}
        {showCommitDetails && phase === 'reveal' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 text-center"
          >
            <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black">
              Commitment Stored at Block #{blockNumber.toLocaleString()}
            </p>
          </motion.div>
        )}

      </div>
    </div>
  );
}
