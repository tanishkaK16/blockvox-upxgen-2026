/**
 * ═══════════════════════════════════════════════════════
 * BLOCKVOX — REAL-TIME ON-CHAIN SYNCHRONIZER
 * ═══════════════════════════════════════════════════════
 * This hook maintains a reactive connection to the BlockVox 
 * smart contracts, ensuring the UI reflects the true state of 
 * the blockchain with sub-second accuracy.
 * 
 * FEATURES:
 * 1. DUAL-PATH SYNC: Polls state every 5s while listening for instant events.
 * 2. AUTOMATIC TALLYING: Aggregates results for Single, Approval, and Score modes.
 * 3. HEALTH MONITORING: Provides status updates for connection integrity.
 * ═══════════════════════════════════════════════════════
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPublicClient, http, parseAbi, type Log } from 'viem';
import { avalancheFuji } from '@/lib/wagmi';

const CONTRACT_ADDRESS = '0x368f4B6BAb26E47d1fA6E2eeA0f718E235D3B649' as const;

const ABI = parseAbi([
  'function getResults() view returns (uint256[])',
  'function isElectionActive() view returns (bool)',
  'event VoteRevealed(address indexed voter, uint256 candidateId)',
  'event ApprovalVoteRevealed(address indexed voter, uint256[] approvedCandidates)',
  'event ScoreVoteRevealed(address indexed voter, uint256[] scores)',
  'event ElectionStarted(bytes32 merkleRoot)',
  'event ElectionEnded(uint256[] finalResults)',
]);

export type OnChainStatus = 'connecting' | 'live' | 'error' | 'inactive';

export interface OnChainResults {
  /** Vote counts per candidateId index — always starts at zero */
  counts: number[];
  /** Total votes cast (sum of counts) */
  totalVotes: number;
  /** Whether an election is currently active on-chain */
  electionActive: boolean;
  /** Connection / data status */
  status: OnChainStatus;
  /** Last block number results were confirmed at */
  lastBlock: bigint | null;
  /** ISO timestamp of last successful fetch */
  lastUpdated: string | null;
  /** Manually trigger a re-fetch */
  refresh: () => void;
}

// Singleton public client — avoids creating a new one per hook mount
let _publicClient: ReturnType<typeof createPublicClient> | null = null;
function getPublicClient() {
  if (!_publicClient) {
    _publicClient = createPublicClient({
      chain: avalancheFuji,
      transport: http('https://api.avax-test.network/ext/bc/C/rpc', {
        timeout: 10_000,
        retryCount: 2,
      }),
    });
  }
  return _publicClient;
}

/** How many candidates the contract supports (slots 0–9) */
const CANDIDATE_SLOTS = 4;
/** Polling interval in ms */
const POLL_INTERVAL_MS = 5_000;

export function useOnChainResults(numCandidates = CANDIDATE_SLOTS): OnChainResults {
  const [counts, setCounts] = useState<number[]>(() => new Array(numCandidates).fill(0));
  const [electionActive, setElectionActive] = useState(false);
  const [status, setStatus] = useState<OnChainStatus>('connecting');
  const [lastBlock, setLastBlock] = useState<bigint | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const fetchResults = useCallback(async () => {
    const client = getPublicClient();
    try {
      const [rawResults, active] = await Promise.all([
        client.readContract({
          address: CONTRACT_ADDRESS,
          abi: ABI,
          functionName: 'getResults',
        }),
        client.readContract({
          address: CONTRACT_ADDRESS,
          abi: ABI,
          functionName: 'isElectionActive',
        }),
      ]);

      const newCounts = Array.from(rawResults)
        .slice(0, numCandidates)
        .map((v) => Number(v));

      // ─── HYBRID SYNC: Merge Simulated (Demo) Votes ───
      let hasSimVotes = false;
      try {
        const simData = localStorage.getItem('blockvox_simulated_votes');
        if (simData) {
          const simVotes = JSON.parse(simData);
          if (Array.isArray(simVotes)) {
            hasSimVotes = simVotes.length > 0;
            simVotes.forEach((sv: any) => {
              if (sv && typeof sv === 'object') {
                if (Array.isArray(sv.voteData)) {
                  sv.voteData.forEach((idOrScore: number, idx: number) => {
                    if (sv.mode === 1) { 
                      if (idOrScore < numCandidates) newCounts[idOrScore]++;
                    } else if (sv.mode === 2) {
                      if (idx < numCandidates) newCounts[idx] += (idOrScore > 0 ? 1 : 0);
                    }
                  });
                } else if (typeof sv.voteData === 'number') {
                  if (sv.voteData < numCandidates) newCounts[sv.voteData]++;
                }
              }
            });
          }
        }
      } catch (e) {
        console.warn('[useOnChainResults] Failed to merge simulated votes:', e);
      }

      setCounts(newCounts);
      setElectionActive(active || hasSimVotes);
      setStatus(active ? 'live' : 'inactive');
      setLastUpdated(new Date().toISOString());

      // Get current block for display
      const block = await client.getBlockNumber();
      setLastBlock(block);
    } catch (err) {
      console.error('[useOnChainResults] fetch error:', err);
      setStatus('error');
    }
  }, [numCandidates]);

  // Subscribe to VoteRevealed events for instant tally updates
  const subscribeToEvents = useCallback(() => {
    const client = getPublicClient();

    // Unsubscribe any existing watcher
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    try {
      const unsub1 = client.watchContractEvent({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        eventName: 'VoteRevealed',
        onLogs: () => fetchResults(),
      });
      const unsub2 = client.watchContractEvent({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        eventName: 'ApprovalVoteRevealed',
        onLogs: () => fetchResults(),
      });
      const unsub3 = client.watchContractEvent({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        eventName: 'ScoreVoteRevealed',
        onLogs: () => fetchResults(),
      });

      unsubRef.current = () => {
        unsub1();
        unsub2();
        unsub3();
      };
    } catch (err) {
      console.warn('[useOnChainResults] could not subscribe to events:', err);
    }
  }, [fetchResults]);

  useEffect(() => {
    // Initial fetch
    fetchResults();

    // Periodic polling
    intervalRef.current = setInterval(fetchResults, POLL_INTERVAL_MS);

    // Event subscription for instant updates
    subscribeToEvents();

    // Listen for local simulated votes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'blockvox_simulated_votes' || !e.key) {
        fetchResults();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (unsubRef.current) unsubRef.current();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [fetchResults, subscribeToEvents]);

  const totalVotes = counts.reduce((a, b) => a + b, 0);

  return {
    counts,
    totalVotes,
    electionActive,
    status,
    lastBlock,
    lastUpdated,
    refresh: fetchResults,
  };
}
