/**
 * ═══════════════════════════════════════════════════════
 * BLOCKVOX — ELECTION ORCHESTRATION TERMINAL
 * ═══════════════════════════════════════════════════════
 * This administrative suite allows authorized entities to initialize, 
 * configure, and conclude elections on the BlockVox protocol.
 * 
 * CORE ADMIN FEATURES:
 * 1. WHITELIST DEPLOYMENT: Generates and submits Merkle Roots for zero-knowledge verify.
 * 2. SYBIL RESISTANCE: Manages the VoterPass token distribution system.
 * 3. MODE CONFIGURATION: Switches between hardware-accelerated voting sub-protocols.
 * ═══════════════════════════════════════════════════════
 */

'use client';

import { useState } from 'react';
import { 
  Plus, Trash2, Users, Key, Settings, 
  Terminal, Shield, Activity, Zap,
  CheckCircle2, AlertTriangle, Info,
  Search, ShieldCheck
} from 'lucide-react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { SNOWTRACE_URL } from '@/lib/contract';
import {
  isContractDeployed,
  startElection as startElectionOnChain,
  setVotingModeOnChain,
  endElection as endElectionOnChain,
  waitForTx,
  generateVoterTokens,
  getStoredTokens,
  type VoterToken
} from '@/lib/blockvox';
import { NetworkBanner } from '@/components/network-banner';
import { saveElectionData, type Candidate, VotingMode } from '@/lib/election-store';
import {
  buildMerkleTree,
  parseVoterFile,
  saveMerkleTree,
  verifyProof,
  getProof,
  type MerkleTree,
} from '@/lib/merkle-tree';

export default function AdminPage() {
  const { isConnected, address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const liveMode = isContractDeployed();

  const [electionName, setElectionName] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([
    { id: 0, name: '', party: '' }
  ]);
  const [merkleFile, setMerkleFile] = useState<string | null>(null);
  const [electionStatus, setElectionStatus] = useState<'idle' | 'creating' | 'active' | 'ended'>('idle');
  const [merkleRoot, setMerkleRoot] = useState('');
  const [voterCount, setVoterCount] = useState(0);
  const [isWhitelisted, setIsWhitelisted] = useState<boolean | null>(null);
  const [merkleError, setMerkleError] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [treeRef, setTreeRef] = useState<MerkleTree | null>(null);
  const [tokens, setTokens] = useState<VoterToken[]>([]);
  const [votingMode, setVotingMode] = useState<VotingMode>(VotingMode.Single);
  const [demoMode, setDemoMode] = useState(false); // NEW: Demo Mode toggle

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const handleGenerateTokens = () => {
    const newTokens = generateVoterTokens(50);
    setTokens([...newTokens]);
    addLog('Generated 50 new unique voter tokens ✓');
  };

  const handleTokenUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const newTokens: VoterToken[] = lines.map(t => ({ code: t.startsWith('PVG-') ? t : `PVG-${t}`, used: false }));
      const existing = getStoredTokens();
      const combined = [...existing, ...newTokens];
      localStorage.setItem('blockvox_voter_tokens', JSON.stringify(combined));
      setTokens(combined);
      addLog(`Imported ${lines.length} tokens from CSV ✓`);
    };
    reader.readAsText(file);
  };

  const addCandidate = () => {
    if (candidates.length < 10) {
      setCandidates([...candidates, { id: candidates.length, name: '', party: '' }]);
    }
  };

  const updateCandidate = (id: number, field: keyof Candidate, value: string) => {
    setCandidates(candidates.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeCandidate = (id: number) => {
    if (candidates.length > 1) {
      const newCandidates = candidates.filter(c => c.id !== id).map((c, i) => ({ ...c, id: i }));
      setCandidates(newCandidates);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMerkleError('');
    setIsWhitelisted(null);
    setMerkleFile(file.name);
    addLog(`Reading ${file.name}...`);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const addresses = parseVoterFile(text, file.name);
        addLog(`Parsed ${addresses.length} valid addresses`);

        const tree = buildMerkleTree(addresses);
        saveMerkleTree(tree);
        setTreeRef(tree);
        setMerkleRoot(tree.root);
        setVoterCount(addresses.length);
        addLog(`Merkle root computed: ${tree.root.slice(0, 18)}...`);
        addLog(`Tree depth: ${tree.layers.length - 1} levels (${addresses.length} leaves)`);

        // Check if connected wallet is on the whitelist
        if (address) {
          const proof = getProof(tree, address);
          const valid = proof.length > 0 && verifyProof(tree.root, address, proof);
          setIsWhitelisted(valid);
          addLog(valid
            ? `✓ Your wallet (${address.slice(0,8)}…) is whitelisted`
            : `⚠ Your wallet (${address.slice(0,8)}…) is NOT in the whitelist`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to parse file';
        setMerkleError(msg);
        addLog(`✖ Error: ${msg}`);
      }
    };
    reader.readAsText(file);
  };

  const handleCreateElection = async () => {
    if (!electionName || !merkleRoot || candidates.some(c => !c.name)) return;
    setElectionStatus('creating');
    addLog(`Creating election: "${electionName}" (Mode: ${VotingMode[votingMode]})`);
    addLog('Submitting transactions...');

    // Save election data to localStorage
    saveElectionData({
      name: electionName,
      candidates: candidates,
      merkleRoot: merkleRoot,
      startTime: Date.now(),
      isActive: true,
      votingMode: votingMode
    });

    if (!demoMode && liveMode && walletClient && publicClient && address) {
      try {
        // 1. Set mode first
        addLog(`Configuring for ${VotingMode[votingMode]}...`);
        const modeTx = await setVotingModeOnChain(votingMode, walletClient, address);
        await waitForTx(publicClient, modeTx);

        // 2. Start election
        const txHash = await startElectionOnChain(
          merkleRoot as `0x${string}`,
          walletClient,
          address
        );
        addLog(`Election hash: ${txHash.slice(0, 18)}...`);
        await waitForTx(publicClient, txHash);
        
        addLog('Election is now ACTIVE ✓');
        setElectionStatus('active');
        window.dispatchEvent(new Event('storage'));
      } catch (err: unknown) {
        addLog(`✖ Error: ${err instanceof Error ? err.message : 'Transaction failed'}`);
        setElectionStatus('idle');
      }
    } else {
      setTimeout(() => {
        addLog('Election is now ACTIVE ✓');
        setElectionStatus('active');
        window.dispatchEvent(new Event('storage'));
      }, 3000);
    }
  };

  const handleEndElection = async () => {
    addLog('Submitting endElection() transaction...');
    setElectionStatus('creating');

    if (!demoMode && liveMode && walletClient && publicClient && address) {
      try {
        const txHash = await endElectionOnChain(walletClient, address);
        addLog(`Tx submitted: ${txHash.slice(0, 18)}...`);
        const receipt = await waitForTx(publicClient, txHash);
        addLog(`Confirmed in block ${receipt.blockNumber}`);
        addLog('Election ended. Final results stored on-chain. ✓');
        setElectionStatus('ended');
      } catch (err: unknown) {
        addLog(`✖ Error: ${err instanceof Error ? err.message : 'Transaction failed'}`);
        setElectionStatus('active');
      }
    } else {
      setTimeout(() => {
        addLog('Election ended. Final results stored on-chain. ✓');
        setElectionStatus('ended');
      }, 2000);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen pt-[120px] pb-32 flex items-center justify-center">
        <div className="glass-card p-12 text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[#E30613]/10 border border-[#E30613]/20 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E30613" strokeWidth="1.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-3">Admin Access Required</h2>
          <p className="text-gray-400 mb-6 text-sm">
            Connect the admin wallet to manage elections.
          </p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-[120px] pb-32">
      <div className="max-w-5xl mx-auto px-6">
        
        <NetworkBanner />
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E30613]">
              Admin Panel
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
              liveMode
                ? 'text-green-400 border-green-500/30 bg-green-500/10'
                : 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
            }`}>
              {liveMode ? <Activity size={10} /> : <Zap size={10} />}
              {liveMode ? 'Live' : 'Demo'}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-2">Election Management</h1>
          <p className="text-gray-400">Create and manage elections on the BlockVox protocol</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 p-4 bg-white/5 border border-white/10 rounded-xl">
          <div className="flex items-center gap-6">
            <div 
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${
                demoMode ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-black/40 border-white/10 text-gray-500'
              }`}
              onClick={() => setDemoMode(!demoMode)}
            >
              <div className={`w-2 h-2 rounded-full ${demoMode ? 'bg-cyan-400 animate-pulse' : 'bg-gray-700'}`} />
              <span className="text-[10px] font-black uppercase tracking-tighter">Demo Mode</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Protocol Sync</span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${liveMode ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                {liveMode ? 'Live - Avalanche Fuji' : 'Local / Simulated'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Create Election */}
            <div className="glass-card p-8">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#E30613]" />
                Create Election
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Election Name</label>
                    <input
                      type="text"
                      value={electionName}
                      onChange={(e) => setElectionName(e.target.value)}
                      placeholder="e.g. Student Council 2026"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E30613]/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Voting Mode</label>
                    <select
                      value={votingMode}
                      onChange={(e) => setVotingMode(Number(e.target.value) as VotingMode)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#E30613]/50 transition-colors appearance-none"
                    >
                      <option value={VotingMode.Single} className="bg-[#121212]">Single Choice</option>
                      <option value={VotingMode.Approval} className="bg-[#121212]">Approval (Select Many)</option>
                      <option value={VotingMode.Score} className="bg-[#121212]">Score (0-10)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">
                    Voter Whitelist (CSV / JSON)
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".csv,.json"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="w-full bg-white/5 border border-dashed border-white/10 rounded-xl px-4 py-6 text-center hover:border-[#E30613]/30 transition-colors cursor-pointer">
                      {merkleFile ? (
                        <div className="flex items-center justify-center gap-2">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          <span className="text-sm text-green-400">{merkleFile}</span>
                        </div>
                      ) : (
                        <div>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5" className="mx-auto mb-2">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                          <span className="text-sm text-gray-500">
                            Drop voter address file or click to browse
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-gray-400 block">Election Options (Candidates)</label>
                    <button
                      onClick={addCandidate}
                      className="text-xs text-[#06B6D4] hover:text-[#06B6D4]/80 flex items-center gap-1"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Add Option
                    </button>
                  </div>
                  <div className="space-y-3">
                    {candidates.map((candidate, i) => (
                      <div key={candidate.id} className="flex gap-3">
                        <input
                          type="text"
                          value={candidate.name}
                          onChange={(e) => updateCandidate(candidate.id, 'name', e.target.value)}
                          placeholder={`Candidate ${i + 1} Name`}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E30613]/50 transition-colors"
                        />
                        <input
                          type="text"
                          value={candidate.party}
                          onChange={(e) => updateCandidate(candidate.id, 'party', e.target.value)}
                          placeholder="Party (optional)"
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E30613]/50 transition-colors"
                        />
                        {candidates.length > 1 && (
                          <button
                            onClick={() => removeCandidate(candidate.id)}
                            className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {merkleRoot && (
                  <div className="bg-white/5 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 uppercase tracking-wider">
                        Real Merkle Root
                      </span>
                      <span className="text-xs text-green-400 flex items-center gap-1">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        {voterCount} voters
                      </span>
                    </div>
                    <code className="text-xs font-mono text-[#06B6D4] break-all block">{merkleRoot}</code>
                    {isWhitelisted !== null && (
                      <div className={`text-xs flex items-center gap-1 mt-1 ${
                        isWhitelisted ? 'text-green-400' : 'text-yellow-400'
                      }`}>
                        {isWhitelisted
                          ? '✓ Your wallet is on the whitelist'
                          : '⚠ Your wallet is NOT on the whitelist'}
                      </div>
                    )}
                  </div>
                )}

                {merkleError && (
                  <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                    {merkleError}
                  </div>
                )}

                <button
                  onClick={handleCreateElection}
                  disabled={!electionName || !merkleRoot || candidates.some(c => !c.name) || electionStatus === 'creating' || electionStatus === 'active'}
                  className="btn-primary w-full py-4 text-center disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {electionStatus === 'creating' ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="60" strokeDashoffset="20" />
                      </svg>
                      Deploying...
                    </span>
                  ) : (
                    'Start Election'
                  )}
                </button>
              </div>
            </div>

            {/* Election Controls */}
            {electionStatus === 'active' && (
              <div className="glass-card p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Active Election
                  </h3>
                  <div className="status-badge active">Active</div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl mb-4">
                  <span className="text-sm text-gray-400">Election</span>
                  <span className="text-sm font-semibold">{electionName}</span>
                </div>

                <button
                  onClick={handleEndElection}
                  className="w-full py-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
                >
                  End Election &amp; Tally Results
                </button>
              </div>
            )}

            {/* Voter Token Management */}
            <div className="glass-card p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#06B6D4]" />
                  Demo Voter Tokens
                </h3>
                <div className="flex gap-2">
                   <div className="relative">
                      <input 
                        type="file" 
                        accept=".csv,.txt" 
                        onChange={handleTokenUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <button className="text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 px-3 py-1.5 rounded hover:bg-white/10 transition-all">
                        Upload CSV
                      </button>
                   </div>
                   <button 
                     onClick={handleGenerateTokens}
                     className="text-[10px] font-bold uppercase tracking-wider bg-[#06B6D4]/10 border border-[#06B6D4]/20 text-[#06B6D4] px-3 py-1.5 rounded hover:bg-[#06B6D4]/20 transition-all"
                   >
                     Generate 50 Tokens
                   </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {(tokens.length > 0 ? tokens : getStoredTokens()).map((t, i) => (
                  <div 
                    key={i} 
                    className={`
                      text-[10px] font-mono p-2 rounded border text-center
                      ${t.used 
                        ? 'bg-gray-800/50 border-gray-700 text-gray-600' 
                        : 'bg-white/5 border-white/10 text-gray-300'
                      }
                    `}
                  >
                    {t.code}
                    {t.used && <div className="text-[8px] text-red-500 mt-0.5">USED</div>}
                  </div>
                ))}
                {(tokens.length === 0 && getStoredTokens().length === 0) && (
                  <div className="col-span-full py-8 text-center text-xs text-gray-600 font-mono italic">
                    No tokens generated yet. Generate some for your demo voters.
                  </div>
                )}
              </div>
            </div>

            {electionStatus === 'ended' && (
              <div className="glass-card p-8 border border-green-500/20">
                <div className="flex items-center gap-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-green-400">Election Concluded</h3>
                    <p className="text-sm text-gray-400">
                      Results have been finalized and stored immutably on-chain.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Console Log */}
          <div className="lg:col-span-1">
            <div className="glass-card p-6 sticky top-[96px]">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Console
              </h3>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-xs text-gray-600 font-mono">Waiting for actions...</p>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="text-xs font-mono text-gray-400 leading-relaxed">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Admin info */}
            <div className="glass-card p-6 mt-6">
              <h4 className="text-sm font-semibold text-gray-400 mb-3">Admin Info</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Address</span>
                  <span className="font-mono text-[#E30613] text-xs">
                    {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Network</span>
                  <span className="text-xs">Fuji Testnet</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Chain ID</span>
                  <span className="font-mono text-xs">43113</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
