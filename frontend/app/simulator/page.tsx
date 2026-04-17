'use client';

import { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';
import { 
  ShieldCheck, Info, RefreshCw, Layers, Award, 
  ChevronRight, Brain, AlertTriangle, Download
} from 'lucide-react';
import { 
  runFPTP, runApproval, runScore, runIRV, 
  VERITASIUM_CANDIDATES, getVeritasiumPreferences,
  type Candidate, type VoterPreference, type SimulationResults
} from '@/lib/sim-engine';

const COLORS = ['#E30613', '#06B6D4', '#10B981', '#F59E0B', '#8B5CF6'];

export default function SimulatorPage() {
  const [activeSet, setActiveSet] = useState<'veritasium' | 'balanced'>('veritasium');
  const [candidates] = useState<Candidate[]>(VERITASIUM_CANDIDATES);
  const [preferences, setPreferences] = useState<VoterPreference[]>(getVeritasiumPreferences());

  const results = useMemo(() => {
    return [
      runFPTP(candidates, preferences),
      runApproval(candidates, preferences),
      runScore(candidates, preferences),
      runIRV(candidates, preferences)
    ];
  }, [candidates, preferences]);

  const loadBalancedData = () => {
    setActiveSet('balanced');
    const balancedPrefs: VoterPreference[] = [];
    for (let i = 0; i < 100; i++) {
      balancedPrefs.push({
        ranks: [1, 2, 3],
        approvals: [1, 2, 3],
        scores: { 1: Math.floor(Math.random() * 11), 2: Math.floor(Math.random() * 11), 3: Math.floor(Math.random() * 11) }
      });
    }
    setPreferences(balancedPrefs);
  };

  const loadVeritasium = () => {
    setActiveSet('veritasium');
    setPreferences(getVeritasiumPreferences());
  };

  return (
    <div className="min-h-screen pt-[120px] pb-32 bg-[#0A0A0A]">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E30613]">
                Math & Governance
              </span>
              <div className="h-px w-12 bg-white/10" />
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                Arrow's Theorem Simulator
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tighter text-white uppercase italic">
              The <span className="text-[#E30613]">Fairness</span> Simulator
            </h1>
            <p className="text-gray-400 font-medium leading-relaxed">
              Explore why no voting system is perfect. Use common biological and physical models 
              to see how the <span className="text-white">exact same voters</span> produce 
              different winners depending on the mathematical rules.
            </p>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={loadVeritasium}
              className={`px-6 py-3 rounded-xl border text-sm font-bold transition-all flex items-center gap-2 ${
                activeSet === 'veritasium' 
                  ? 'border-[#E30613] bg-[#E30613]/10 text-white shadow-[0_0_20px_rgba(227,6,19,0.2)]' 
                  : 'border-white/10 text-gray-400 hover:border-white/30'
              }`}
            >
              <Brain size={16} />
              Veritasium Mode
            </button>
            <button 
              onClick={loadBalancedData}
              className={`px-6 py-3 rounded-xl border text-sm font-bold transition-all flex items-center gap-2 ${
                activeSet === 'balanced' 
                  ? 'border-[#06B6D4] bg-[#06B6D4]/10 text-white shadow-[0_0_20px_rgba(6,182,212,0.2)]' 
                  : 'border-white/10 text-gray-400 hover:border-white/20'
              }`}
            >
              <RefreshCw size={16} />
              Randomized
            </button>
          </div>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
          {results.map((res, idx) => (
            <div key={res.system} className="glass-card flex flex-col items-stretch overflow-hidden group">
              <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">system {idx + 1}</span>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-1.5 h-1.5 rounded-full ${i < res.fairnessScore / 20 ? 'bg-[#E30613]' : 'bg-white/10'}`} 
                      />
                    ))}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white uppercase tracking-tight group-hover:text-[#E30613] transition-colors">
                  {res.system}
                </h3>
              </div>

              <div className="p-6 flex-1 flex flex-col">
                <div className="h-40 w-full mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={res.distribution}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 10}} />
                      <Tooltip 
                        contentStyle={{backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px'}}
                        itemStyle={{fontSize: '12px'}}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {res.distribution.map((entry, i) => (
                          <Cell key={i} fill={entry.name === res.winner?.name ? '#E30613' : 'rgba(255,255,255,0.05)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-4">
                  <div className="bg-white/5 rounded-xl p-4 border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                      <Award size={32} />
                    </div>
                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-1">Winner</span>
                    <span className="text-xl font-black text-white italic uppercase tracking-tighter">
                      {res.winner?.name || 'Tie'}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed min-h-[48px]">
                    {res.explanation}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-white/[0.03] flex items-center justify-between border-t border-white/5">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-[#E30613]" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fairness Score</span>
                </div>
                <span className="text-xs font-mono font-bold text-white">{res.fairnessScore}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Veritasium Insight Card */}
        {activeSet === 'veritasium' && (
          <div className="glass-card p-1 items-stretch flex flex-col md:flex-row gap-0 overflow-hidden border-[#E30613]/20 shadow-[0_0_40px_rgba(227,6,19,0.05)] mb-12">
            {/* ... Veritasium content ... */}
          </div>
        )}

        {/* Quadratic Voting Teaser */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-card p-1 items-stretch flex flex-col md:flex-row gap-0 overflow-hidden border-[#06B6D4]/10">
            <div className="md:w-1/3 bg-[#06B6D4]/5 p-8 border-b md:border-b-0 md:border-r border-white/5 relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#06B6D4]" />
              <Layers className="text-[#06B6D4] mb-4" size={32} />
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-4 leading-none">
                Quadratic <br/><span className="text-[#06B6D4]">Voting</span>
              </h3>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-4">Coming in v2.0</p>
              <p className="text-sm text-gray-400 leading-relaxed font-medium">
                "Passion Matters." In Quadratic Voting, your 10th vote costs <span className="text-white">100 times</span> more than your first.
              </p>
            </div>
            <div className="flex-1 p-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Passion vs Quantity</span>
                  <div className="text-[10px] bg-[#06B6D4]/20 text-[#06B6D4] px-2 py-0.5 rounded border border-[#06B6D4]/30">Simulation</div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[10px] mb-1 font-bold">
                      <span className="text-gray-400">10 CASUAL VOTERS (1 Vote Each)</span>
                      <span className="text-[#06B6D4]">10 CREDITS</span>
                    </div>
                    <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden flex">
                      {[...Array(10)].map((_, i) => (
                        <div key={i} className="flex-1 border-r border-black/50 bg-[#06B6D4]/30" />
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-center items-center py-1">
                    <span className="text-[10px] font-black text-gray-600">VS</span>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] mb-1 font-bold">
                      <span className="text-gray-400">1 PASSIONATE VOTER (10 Votes)</span>
                      <span className="text-red-500 font-black">100 CREDITS REQUIRED</span>
                    </div>
                    <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#06B6D4] to-red-500 w-full" />
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-gray-500 italic leading-relaxed text-center">
                  Blockchain enables this by tracking "Voice Credits" immutably.
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-8 bg-gradient-to-br from-[#E30613]/10 to-transparent border-[#E30613]/20 flex flex-col justify-center items-center text-center">
             <div className="w-16 h-16 rounded-3xl bg-[#E30613] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(227,6,19,0.3)]">
                <Brain className="text-white" size={32} />
             </div>
             <h4 className="text-lg font-black text-white uppercase tracking-tighter mb-2 italic">The AI Verifier</h4>
             <p className="text-xs text-gray-400 leading-relaxed font-medium mb-6">
                Our future integration uses ZK-Proofs to verify "One Human, One Account" without revealing identity.
             </p>
             <div className="w-full h-px bg-white/10 mb-6" />
             <span className="text-[10px] font-black text-[#E30613] uppercase tracking-widest border border-[#E30613]/30 px-4 py-2 rounded-full">
                Patent Pending
             </span>
          </div>
        </div>

      </div>
    </div>
  );
}
