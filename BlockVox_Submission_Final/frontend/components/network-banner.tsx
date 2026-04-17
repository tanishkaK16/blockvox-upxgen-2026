'use client';

import { useAccount, useChainId } from 'wagmi';
import { useChainModal } from '@rainbow-me/rainbowkit';
import { motion, AnimatePresence } from 'framer-motion';

export function NetworkBanner() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { openChainModal } = useChainModal();

  // Avalanche Fuji Chain ID is 43113
  const isWrongNetwork = isConnected && chainId !== 43113;

  return (
    <AnimatePresence>
      {isWrongNetwork && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Action Required</p>
                <p className="text-xs text-amber-500/70 font-medium">
                  Switch to <span className="text-amber-400 font-bold underline decoration-amber-500/30">Avalanche Fuji</span> to interact with the voting protocol.
                </p>
                <p className="text-[9px] text-amber-500/50 mt-1 italic font-bold">Note: Balance and contract features require Fuji network sync.</p>
              </div>
            </div>
            
            <button
              onClick={openChainModal}
              className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl text-[10px] font-bold text-amber-500 uppercase tracking-wider transition-all whitespace-nowrap"
            >
              Switch Now
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
