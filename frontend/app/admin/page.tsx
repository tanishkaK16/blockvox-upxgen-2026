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
 * 3. MODE CONFIGURATION: Switches between different voting sub-protocols.
 * ═══════════════════════════════════════════════════════
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, Key, Settings, Terminal, Shield, Activity, 
  Zap, CheckCircle2, AlertTriangle, Info, Plus, Trash2, 
  Search, ShieldCheck, RefreshCw
} from 'lucide-react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { type Address } from 'viem';
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
  type VoterToken,
  BLOCKVOX_CONTRACT_ADDRESS,
  blockvoxABI
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

/* ─── GOVERNANCE CONSTANTS ─────────────────────────── */
const DEFAULT_CANDIDATE: Candidate = { id: 0, name: '', party: '' };
const DEMO_INIT_SIMULATION_DELAY = 2500;

export default function AdminPage() {
  const { isConnected, address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const liveMode = isContractDeployed();

  const [electionName, setElectionName] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([{ ...DEFAULT_CANDIDATE }]);
  const [merkleFile, setMerkleFile] = useState<string | null>(null);
  const [electionStatus, setElectionStatus] = useState<'idle' | 'creating' | 'active' | 'ended'>('idle');
  const [merkleRoot, setMerkleRoot] = useState('');
  const [voterCount, setVoterCount] = useState(0);
  const [isWhitelisted, setIsWhitelisted] = useState<boolean | null>(null);
  const [merkleError, setMerkleError] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [tokens, setTokens] = useState<VoterToken[]>([]);
  const [votingMode, setVotingMode] = useState<VotingMode>(VotingMode.Single);
  const [demoMode, setDemoMode] = useState(false);

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  /**
   * VOTERPASS GENERATION (SYBIL RESISTANCE)
   * Generates a pool of unique, burnable tokens. These IDs serve as nullifiers
   * in the smart contract to ensure even demo voters cannot double-vote.
   */
  const handleGenerateTokens = () => {
    const newTokens = generateVoterTokens(50);
    setTokens([...newTokens]);
    addLog('Synthetically generated 50 new VoterPass tokens ✓');
  };

  /**
   * ELECTION ORCHESTRATION
   * Synchronizes local election configuration (Merkle Root + Candidates) 
   * with the Avalanche Fuji blockchain.
   */
  const handleCreateElection = async () => {
    if (!electionName || !merkleRoot || candidates.some(c => !c.name)) return;
    setElectionStatus('creating');
    addLog(`Protocol Init: "${electionName}" in ${VotingMode[votingMode]} mode`);

    saveElectionData({
      name: electionName,
      candidates,
      merkleRoot,
      startTime: Date.now(),
      isActive: true,
      votingMode
    });

    if (!demoMode && liveMode && walletClient && publicClient && address) {
      try {
        addLog('Updating sub-protocol mode on Avalanche...');
        const modeTx = await setVotingModeOnChain(votingMode, walletClient, address);
        await waitForTx(publicClient, modeTx);

        addLog('Submitting Whitelist Merkle Root...');
        const txHash = await startElectionOnChain(merkleRoot as `0x${string}`, walletClient, address);
        await waitForTx(publicClient, txHash);
        
        addLog('Election is now LIVE on Fuji ✓');
        setElectionStatus('active');
        window.dispatchEvent(new Event('storage'));
      } catch (err: unknown) {
        addLog(`✖ Error: ${err instanceof Error ? err.message : 'Transaction failed'}`);
        setElectionStatus('idle');
      }
    } else {
      setTimeout(() => {
        addLog('Election Status: ACTIVE (Simulated Sandbox) ✓');
        setElectionStatus('active');
        window.dispatchEvent(new Event('storage'));
      }, DEMO_INIT_SIMULATION_DELAY);
    }
  };

  if (!isConnected) return <AdminLoginView />;

  return (
    <div className="min-h-screen pt-[120px] pb-32">
      <div className="max-w-5xl mx-auto px-6">
        <NetworkBanner />
        
        <div className="flex justify-between items-end mb-12">
           <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E30613]">Governance Nucleus</span>
                <StatusPill isLive={liveMode} />
              </div>
              <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter">Election <span className="text-[#E30613]">Control</span></h1>
           </div>
           <DemoSwitch active={demoMode} onToggle={setDemoMode} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            {/* --- CONFIGURATION SUITE --- */}
            <div className="glass-card p-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-[#E30613] mb-8 flex items-center gap-2">
                <Settings size={14} /> Protocol Configuration
              </h3>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputBox label="Election Branding" value={electionName} onChange={setElectionName} placeholder="e.g. Student Council 2026" />
                  <SelectBox label="Democratic Model" value={votingMode} onChange={setVotingMode} />
                </div>

                <MerkleFileUploader 
                  onFileParsed={(root: string, count: number) => {
                    setMerkleRoot(root);
                    setVoterCount(count);
                    addLog(`Merkle Root finalized: ${root.slice(0, 16)}...`);
                  }}
                  root={merkleRoot}
                  count={voterCount}
                  addLog={addLog}
                />

                <CandidateEditor 
                  candidates={candidates} 
                  setCandidates={setCandidates} 
                />

                <button
                  onClick={handleCreateElection}
                  disabled={!electionName || !merkleRoot || candidates.some(c => !c.name) || electionStatus !== 'idle'}
                  className="w-full py-5 bg-white text-black font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-[#E30613] hover:text-white transition-all shadow-2xl disabled:opacity-20 flex items-center justify-center gap-2"
                >
                  {electionStatus === 'creating' ? <RefreshCw className="animate-spin" size={20} /> : <Zap size={20} />}
                  {electionStatus === 'creating' ? 'Broadcasting...' : 'Launch Election'}
                </button>
              </div>
            </div>

            {/* --- TOKEN REGISTRY --- */}
            <VoterPassRegistry tokens={tokens} onGenerate={handleGenerateTokens} />
          </div>

          <div className="lg:col-span-1 space-y-6">
            <AdminLogView logs={logs} />
            <AdminIdentityCard address={address} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── MODULAR SUB-RENDERS ───────────────────────── */

function StatusPill({ isLive }: { isLive: boolean }) {
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
      isLive ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
    }`}>
      {isLive ? <Activity size={10} /> : <Zap size={10} />} {isLive ? 'Live Chain' : 'Demo Sim'}
    </span>
  );
}

function DemoSwitch({ active, onToggle }: { active: boolean, onToggle: (v: boolean) => void }) {
  return (
    <div className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border cursor-pointer group transition-all ${
      active ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'
    }`} onClick={() => onToggle(!active)}>
      <div className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-cyan-400 animate-pulse' : 'bg-gray-700'}`} />
      <span className="text-[10px] font-black uppercase tracking-widest group-hover:text-white">Sandbox Mode</span>
    </div>
  );
}

function InputBox({ label, value, onChange, placeholder }: any) {
  return (
    <div>
      <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-2">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#E30613]/50 transition-colors" />
    </div>
  );
}

function SelectBox({ label, value, onChange }: any) {
  return (
    <div>
      <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-2">{label}</label>
      <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#E30613]/50 transition-colors appearance-none">
        <option value={0} className="bg-[#0A0A0A]">Plurality (Single)</option>
        <option value={1} className="bg-[#0A0A0A]">Consensus (Approval)</option>
        <option value={2} className="bg-[#0A0A0A]">Intensity (Score)</option>
      </select>
    </div>
  );
}

/**
 * MERKLE WHITELISTING ENGINE
 * Parses a voter address file and constructs a cryptographic Merkle Tree.
 * The resulting 32-byte root is deployed on-chain for efficient verify.
 */
function MerkleFileUploader({ onFileParsed, root, count, addLog }: any) {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const addresses = parseVoterFile(text, file.name);
        const tree = buildMerkleTree(addresses);
        saveMerkleTree(tree);
        onFileParsed(tree.root, addresses.length);
      } catch (err: any) { addLog(`Error: ${err.message}`); }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-2">Voter Registry Whitelist</label>
      <div className="relative group">
        <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
        <div className="w-full bg-white/[0.02] border border-dashed border-white/10 rounded-2xl px-4 py-8 text-center group-hover:border-[#E30613]/30 transition-all border-image-source">
          {root ? <span className="text-xs text-green-500 font-bold">Successfully Rooted: {count} addresses</span> : <div className="flex flex-col items-center gap-2"><Plus size={20} className="text-gray-500" /><span className="text-xs text-gray-600">CSV Whitelist Upload</span></div>}
        </div>
      </div>
      {root && <code className="text-[9px] font-mono text-[#06B6D4] break-all block mt-4 bg-black/40 p-3 rounded-lg border border-white/5">{root}</code>}
    </div>
  );
}

function CandidateEditor({ candidates, setCandidates }: any) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block">Ballot Options</label>
        <button onClick={() => setCandidates([...candidates, { id: candidates.length, name: '', party: '' }])} className="text-[10px] font-black uppercase text-[#06B6D4] flex items-center gap-1"><Plus size={10} /> Add</button>
      </div>
      <div className="space-y-3">
        {candidates.map((c: any, i: number) => (
          <div key={i} className="flex gap-2">
            <input type="text" value={c.name} onChange={(e) => setCandidates(candidates.map((cand: any, idx: number) => idx === i ? { ...cand, name: e.target.value } : cand))} placeholder="Option / Candidate Name" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white" />
            <button onClick={() => setCandidates(candidates.filter((_: any, idx: number) => idx !== i))} className="p-2 text-gray-600 hover:text-red-500"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function VoterPassRegistry({ tokens, onGenerate }: any) {
  const currentTokens = tokens.length > 0 ? tokens : getStoredTokens();
  return (
    <div className="glass-card p-8">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-sm font-black uppercase tracking-widest text-[#06B6D4] flex items-center gap-2"><Key size={14} /> VoterPass Registry</h3>
        <button onClick={onGenerate} className="text-[10px] font-black uppercase bg-[#06B6D4]/10 border border-[#06B6D4]/20 text-[#06B6D4] px-4 py-2 rounded-xl hover:bg-[#06B6D4]/20 transition-all">Regenerate Pool</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
        {currentTokens.map((t: any, i: number) => (
          <div key={i} className={`text-[10px] font-mono p-2 rounded border text-center ${t.used ? 'bg-red-500/5 border-red-500/20 text-red-400' : 'bg-white/5 border-white/10 text-gray-400'}`}>
            {t.code}
          </div>
        ))}
        {currentTokens.length === 0 && <div className="col-span-full py-8 text-center text-[10px] uppercase font-black text-gray-700 italic">No Registry Data Generated</div>}
      </div>
    </div>
  );
}

function AdminLogView({ logs }: { logs: string[] }) {
  return (
    <div className="glass-card p-6 h-[400px] flex flex-col">
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-6 flex items-center gap-2"><Terminal size={14} /> Protocol Logs</h3>
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
        {logs.map((log, i) => <div key={i} className="text-[10px] font-mono text-gray-400 leading-tight border-l-2 border-[#E30613]/30 pl-3">{log}</div>)}
        {logs.length === 0 && <p className="text-[10px] font-mono text-gray-700">Awaiting protocol heartbeat...</p>}
      </div>
    </div>
  );
}

function AdminIdentityCard({ address }: { address?: string }) {
  return (
    <div className="glass-card p-6">
       <div className="flex items-center gap-3 mb-4">
          <ShieldCheck size={20} className="text-green-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white">Authorized Signer</span>
       </div>
       <p className="text-[10px] font-mono text-gray-400 break-all bg-black/20 p-3 rounded-lg border border-white/5">{address}</p>
    </div>
  );
}

function AdminLoginView() {
  return (
    <div className="min-h-screen pt-[120px] pb-32 flex items-center justify-center p-6">
      <div className="glass-card p-12 text-center max-w-md w-full border-[#E30613]/20 shadow-[0_0_50px_rgba(227,6,19,0.1)]">
        <Shield size={64} className="text-[#E30613] mx-auto mb-8 animate-pulse" />
        <h2 className="text-3xl font-black uppercase tracking-tighter mb-4 italic">Security Firewall</h2>
        <p className="text-gray-500 text-sm mb-10 leading-relaxed uppercase font-bold tracking-widest">Connect authorized administrator wallet to access governance protocols.</p>
        <div className="flex justify-center scale-110"><ConnectButton /></div>
      </div>
    </div>
  );
}
