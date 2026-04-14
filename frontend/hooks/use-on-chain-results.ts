'use client';

/**
 * useOnChainResults
 *
 * Reads getResults() from the deployed BlockVoxVoting contract on Avalanche Fuji.
 * - Always starts at [0, 0, 0, ...] — never seeded with fake data
 * - Polls every 5s for new tallies
 * - Subscribes to VoteRevealed events for instant updates (no delay)
 * - Returns electionActive flag and lastUpdated block number
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPublicClient, http, parseAbi, type Log } from 'viem';
import { avalancheFuji } from '@/lib/wagmi';

const CONTRACT_ADDRESS = '0x368f4B6BAb26E47d1fA6E2eeA0f718E235D3B649' as const;

const ABI = parseAbi([
  'function getResults() view returns (uint256[])',
  'function isElectionActive() view returns (bool)',
  'event VoteRevealed(address indexed voter, uint256 candidateId)',
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

      console.log('📊 Dashboard Sync [AVL Fuji]:', {
        address: CONTRACT_ADDRESS,
        rawResults: Array.from(rawResults).map(v => v.toString()),
        active,
        numCandidates
      });
      
      const newCounts = Array.from(rawResults)
        .slice(0, numCandidates)
        .map((v) => Number(v));

      setCounts(newCounts);
      setElectionActive(active);
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
      const unsub = client.watchContractEvent({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        eventName: 'VoteRevealed',
        onLogs: (_logs: Log[]) => {
          // A new vote was revealed — refresh immediately
          fetchResults();
        },
        onError: (err) => {
          console.warn('[useOnChainResults] event watch error:', err);
        },
      });
      unsubRef.current = unsub;
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

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (unsubRef.current) unsubRef.current();
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
