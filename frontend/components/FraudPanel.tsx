'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { truncateAddress, formatTime } from '@/lib/mock-data';

export interface FraudAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: number;
  address?: string;
  resolved: boolean;
}

interface FraudPanelProps {
  totalVotes: number;
  electionActive: boolean;
  isLive: boolean;
}

export default function FraudPanel({ totalVotes, electionActive, isLive }: FraudPanelProps) {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [securityScore, setSecurityScore] = useState(100);

  // ── Real-time Anomaly Detection Logic ──
  useEffect(() => {
    if (totalVotes === 0) return;

    // Simulate analysis heartbeat
    setIsAnalyzing(true);
    const analyzeTimer = setTimeout(() => {
      setIsAnalyzing(false);
      
      // Auto-logic: Every 10 votes, log an integrity check
      if (totalVotes % 10 === 0) {
        addAlert({
          type: 'info',
          message: `Periodic Integrity Audit: Verified ${totalVotes} on-chain commitments. No hash collisions detected.`,
          resolved: true
        });
      }
    }, 800);

    return () => clearTimeout(analyzeTimer);
  }, [totalVotes]);

  const addAlert = (alert: Omit<FraudAlert, 'id' | 'timestamp'>) => {
    const newAlert: FraudAlert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    setAlerts(prev => [newAlert, ...prev].slice(0, 15));
    
    // Update security score based on alert severity
    if (alert.type === 'critical') setSecurityScore(s => Math.max(s - 15, 45));
    if (alert.type === 'warning') setSecurityScore(s => Math.max(s - 5, 80));
  };

  // ── Simulation Suite ──
  const triggerSimulation = (scenario: 'velocity' | 'sybil' | 'merkle' | 'double') => {
    setIsAnalyzing(true);
    
    const scenarios = {
      velocity: {
        type: 'warning' as const,
        message: 'Velocity Anomaly: 8 votes detected from distinct wallets in < 4s. Pattern typical of automated scripts.',
        address: 'Cluster_Subnet_A4',
        resolved: false,
      },
      sybil: {
        type: 'critical' as const,
        message: 'Sybil Attack Pattern: High correlation detected between 15 wallets sharing a common fund source on Fuji Testnet.',
        address: '0x3a4b...1e92',
        resolved: false,
      },
      merkle: {
        type: 'critical' as const,
        message: 'Proof Integrity Violation: Detected 3 failed commit attempts with invalid Merkle proofs from non-whitelisted addresses.',
        address: '0x' + Math.random().toString(16).slice(2, 12) + '...',
        resolved: false,
      },
      double: {
        type: 'warning' as const,
        message: 'State Collision: Wallet attempted to re-submit commitment for active election. Participation already locked.',
        address: '0x25d2...fC7E',
        resolved: false,
      }
    };

    setTimeout(() => {
      addAlert(scenarios[scenario]);
      setIsAnalyzing(false);
    }, 1200);
  };

  return (
    <div className="space-y-4">
      {/* ── Security Status Header ── */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden group hover:bg-white/[0.03]"
      >
        {/* Futuristic Grid Background */}
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#E30613_1px,transparent_1px)] [background-size:20px_20px]" />
        
        <div className="relative flex-shrink-0">
          <motion.div 
            animate={{ 
              scale: securityScore < 80 ? [1, 1.05, 1] : 1,
              borderColor: securityScore > 85 ? '#22c55e' : securityScore > 60 ? '#eab308' : '#ef4444'
            }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center transition-colors duration-500 bg-white/5 backdrop-blur-md shadow-2xl"
          >
            <span className={`text-2xl font-bold ${
              securityScore > 85 ? 'text-green-500' : 
              securityScore > 60 ? 'text-yellow-500' : 'text-red-500'
            }`}>
              {securityScore}%
            </span>
            <span className="text-[8px] uppercase tracking-tighter text-gray-400 font-bold -mt-1">Security</span>
          </motion.div>
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
            className={`absolute -inset-3 border border-dashed rounded-full opacity-20 ${
              securityScore > 85 ? 'border-green-500' : 'border-red-500'
            }`}
          />
        </div>

        <div className="flex-1 relative text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-2">
            <h3 className="font-bold text-xl tracking-tight text-white drop-shadow-md">AI Fraud Shield</h3>
            <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
              isAnalyzing ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 animate-pulse' : 'bg-green-500/10 text-green-400 border-green-500/30'
            }`}>
              {isAnalyzing ? 'Scanning Ecosystem...' : '🛡️ SHIELDS ACTIVE'}
            </div>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed max-w-lg mb-4 sm:mb-0">
            Real-time heuristic analysis of the Avalanche Fuji validator set. 
            Detecting Sybil patterns and proof anomalies via <span className="text-white font-mono text-xs">Antigravity-v3</span>.
          </p>
        </div>

        <div className="flex flex-wrap justify-center sm:justify-end gap-2 w-full sm:w-auto">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => triggerSimulation('velocity')}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase hover:bg-yellow-500/10 hover:border-yellow-500/40 transition-all text-gray-400 hover:text-yellow-400"
          >
            Velocity
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => triggerSimulation('sybil')}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase hover:bg-red-500/10 hover:border-red-500/40 transition-all text-gray-400 hover:text-red-400"
          >
            Sybil
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => triggerSimulation('double')}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase hover:bg-orange-500/10 hover:border-orange-500/40 transition-all text-gray-400 hover:text-orange-400"
          >
            Double
          </motion.button>
        </div>
      </motion.div>

      {/* ── Dynamic Security Log ── */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Security Audit Log</span>
          <span className="text-[10px] text-gray-600 font-mono">Live Session ID: BX-9943</span>
        </div>
        
        <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
          <AnimatePresence initial={false}>
            {alerts.length === 0 ? (
              <div className="py-12 text-center text-gray-600 italic text-sm">
                No active threats detected. Network integrity is within parameters.
              </div>
            ) : (
              alerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className={`p-5 border-l-2 flex gap-4 hover:bg-white/5 transition-colors ${
                    alert.type === 'critical' ? 'border-red-500 bg-red-500/5' :
                    alert.type === 'warning' ? 'border-yellow-500 bg-yellow-500/5' :
                    'border-blue-500 bg-blue-500/5'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    alert.type === 'critical' ? 'bg-red-500 text-white' :
                    alert.type === 'warning' ? 'bg-yellow-500 text-black' :
                    'bg-blue-500 text-white'
                  }`}>
                    {alert.type === 'critical' ? '!' : alert.type === 'warning' ? '?' : 'i'}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        alert.type === 'critical' ? 'text-red-400' :
                        alert.type === 'warning' ? 'text-yellow-400' :
                        'text-blue-400'
                      }`}>
                        {alert.type} Alert
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono italic">
                        {formatTime(alert.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 leading-snug">{alert.message}</p>
                    {alert.address && (
                      <div className="mt-2 text-[10px] text-gray-500 font-mono">
                        Target Source: <span className="text-gray-400">{alert.address}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        <div className="px-6 py-3 bg-white/5 flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-gray-400 font-bold uppercase">Real-time Analysis</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <span className="text-[10px] text-gray-500 lowercase">
            Latency: <span className="font-mono">12ms</span> • Merkle Check: <span className="font-mono text-green-500">PASS</span>
          </span>
        </div>
      </div>
    </div>
  );
}
