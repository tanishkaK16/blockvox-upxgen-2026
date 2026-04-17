'use client';

export interface Candidate {
  id: number;
  name: string;
  party: string;
}

const STORAGE_KEY = 'blockvox_election_data';

export enum VotingMode {
  Single = 0,
  Approval = 1,
  Score = 2
}

export interface ElectionData {
  name: string;
  candidates: Candidate[];
  merkleRoot: string;
  startTime: number;
  isActive: boolean;
  votingMode: VotingMode;
}

export function saveElectionData(data: ElectionData) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  // Clear any existing vote counts for a new election
  localStorage.removeItem('blockvox_simulated_votes');
}

export function getElectionData(): ElectionData | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function clearElectionData() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('blockvox_simulated_votes');
}

export function saveSimulatedVote(voteData: number | number[], mode: VotingMode) {
  if (typeof window === 'undefined') return;
  const key = 'blockvox_simulated_votes';
  const stored = localStorage.getItem(key);
  const current: any[] = stored ? JSON.parse(stored) : [];
  current.push({ voteData, mode, timestamp: Date.now() });
  localStorage.setItem(key, JSON.stringify(current));
  // Dispatch event so other tabs (Dashboard) update immediately
  window.dispatchEvent(new Event('storage'));
}

export function getSimulatedVotes() {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('blockvox_simulated_votes');
  return stored ? JSON.parse(stored) : [];
}

export const DEFAULT_CANDIDATES: Candidate[] = [
  { id: 0, name: 'Alice Nakamoto', party: 'Innovation Party' },
  { id: 1, name: 'Bob Satoshi', party: 'Transparency Alliance' },
  { id: 2, name: 'Carol Wei', party: 'Digital Democracy Front' },
  { id: 3, name: 'Dave Vitalik', party: 'Decentralized People\'s Party' },
];
