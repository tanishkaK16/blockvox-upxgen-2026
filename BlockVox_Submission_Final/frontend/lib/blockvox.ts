/**
 * ═══════════════════════════════════════════════════════
 * BLOCKVOX CORE INTEGRATION LIBRARY
 * ═══════════════════════════════════════════════════════
 * This library provides the authoritative interface for interacting 
 * with the BlockVox Smart Contracts on Avalanche Fuji Testnet.
 * 
 * CORE INNOVATIONS:
 * 1. COMMIT-REVEAL PRIVACY: Votes are hidden using keccak256(choice, salt).
 *    The choice is never exposed until the reveal phase.
 * 2. SYBIL RESISTANCE: Prevented via Merkle Tree whitelisting AND a 
 *    Burnable Voter Token system (for demo scalability).
 * 3. MULTI-MODE PROTOCOL: Hardware-optimized handlers for Single-Choice, 
 *    Approval, and Score-based voting.
 * 
 * ═══════════════════════════════════════════════════════
 */

import {
  keccak256,
  encodePacked,
  type PublicClient,
  type WalletClient,
  type Address,
  parseAbi,
} from 'viem';
import { avalancheFuji } from '@/lib/wagmi';

/* ─── Contract Configuration ───────────────────────── */

/** 
 * Official BlockVox Contract Address on Avalanche Fuji.
 * Address represents the immutable election registry.
 */
export const BLOCKVOX_CONTRACT_ADDRESS: Address =
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as Address) ||
  '0x368f4B6BAb26E47d1fA6E2eeA0f718E235D3B649';

/** 
 * Human-Readable ABI (Application Binary Interface).
 * Defines the structured methods for cross-chain communication.
 */
export const blockvoxABI = parseAbi([
  'constructor()',
  'function startElection(bytes32 _merkleRoot)',
  'function setVotingMode(uint8 mode)',
  'function commitVote(bytes32 commitmentHash, bytes32[] proof, uint256 nftId)',
  'function revealVote(uint256 candidateId, bytes32 salt)',
  'function voteApproval(uint256[] approvedCandidates, bytes32 salt)',
  'function voteScore(uint256[] scores, bytes32 salt)',
  'function endElection()',
  'function getResults() view returns (uint256[])',
  'function isElectionActive() view returns (bool)',
  'function votingMode() view returns (uint8)',
  'function admin() view returns (address)',
  'function merkleRoot() view returns (bytes32)',
  'function hasVoted(address) view returns (bool)',
  'function commitments(bytes32) view returns (bool)',
  'function voteCounts(uint256) view returns (uint256)',
  'function totalScores(uint256) view returns (uint256)',
  'event ElectionStarted(bytes32 merkleRoot, uint8 mode)',
  'event VotingModeUpdated(uint8 mode)',
  'event VoteCommitted(address indexed voter, bytes32 commitmentHash)',
  'event VoteRevealed(address indexed voter, uint256 choice)',
  'event ApprovalVoteRevealed(address indexed voter, uint256[] approvedCandidates)',
  'event ScoreVoteRevealed(address indexed voter, uint256[] scores)',
  'event ElectionEnded(uint256[] finalResults)',
]);

/* ─── Cryptographic Utilities ──────────────────────── */

/**
 * Generates a high-entropy 32-byte salt using the Web Crypto API.
 * This salt is required to "blind" the vote in the commit-reveal scheme.
 */
export function generateSalt(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return ('0x' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;
}

/** 
 * Computes a keccak256 commitment hash following the protocol spec.
 * 
 * DESIGN LOGIC:
 * By hashing keccak256(voteData, salt), we ensure the vote remains 
 * private on-chain during the first phase. Only the hashed commitment 
 * is stored in the contract's transparency ledger.
 */
export function computeCommitmentHash(
  voteData: number | number[],
  salt: `0x${string}`,
  mode: number
): `0x${string}` {
  if (mode === 0) {
    // Single Choice Mode: keccak256(id, salt)
    return keccak256(encodePacked(['uint256', 'bytes32'], [BigInt(voteData as number), salt]));
  } else if (mode === 1) {
    // Approval Mode: keccak256(ids[], salt)
    const ids = (voteData as number[]).map(id => BigInt(id));
    return keccak256(encodePacked(['uint256[]', 'bytes32'], [ids, salt]));
  } else {
    // Score Mode: keccak256(scores[], salt)
    const scores = (voteData as number[]).map(s => BigInt(s));
    return keccak256(encodePacked(['uint256[]', 'bytes32'], [scores, salt]));
  }
}

/* ─── Core Protocol Interactors ────────────────────── */

/** 
 * PHASE 1: COMMIT
 * Submits the cryptographic commitment and Merkle proof to the chain.
 * This locks the voter's eligibility and intent without revealing the choice.
 */
export async function commitVoteOnChain(
  commitmentHash: `0x${string}`,
  proof: `0x${string}`[],
  nftId: bigint,
  walletClient: WalletClient,
  account: Address
): Promise<`0x${string}`> {
  return await walletClient.writeContract({
    address: BLOCKVOX_CONTRACT_ADDRESS,
    abi: blockvoxABI,
    functionName: 'commitVote',
    args: [commitmentHash, proof, nftId],
    chain: avalancheFuji,
    account,
  });
}

/** 
 * PHASE 2: REVEAL
 * Unlocks the previously submitted commitment by providing the original 
 * choice and salt. The contract verifies the hash matches the commitment.
 */
export async function revealVoteOnChain(
  voteData: number | number[],
  salt: `0x${string}`,
  mode: number,
  walletClient: WalletClient,
  account: Address
): Promise<`0x${string}`> {
  const base = {
    address: BLOCKVOX_CONTRACT_ADDRESS,
    abi: blockvoxABI,
    chain: avalancheFuji,
    account,
  } as const;

  if (mode === 0) {
    return await walletClient.writeContract({
      ...base,
      functionName: 'revealVote',
      args: [BigInt(voteData as number), salt],
    });
  } else if (mode === 1) {
    return await walletClient.writeContract({
      ...base,
      functionName: 'voteApproval',
      args: [(voteData as number[]).map(id => BigInt(id)), salt],
    });
  } else {
    return await walletClient.writeContract({
      ...base,
      functionName: 'voteScore',
      args: [(voteData as number[]).map(s => BigInt(s)), salt],
    });
  }
}

/* ─── State Read Helpers ───────────────────────────── */

/** Fetches real-time, on-chain election results directly from the contract state. */
export async function getLiveResults(publicClient: PublicClient): Promise<readonly bigint[]> {
  return await publicClient.readContract({
    address: BLOCKVOX_CONTRACT_ADDRESS,
    abi: blockvoxABI,
    functionName: 'getResults',
  });
}

/** Checks if the election lifecycle is currently in the "Active" state. */
export async function isElectionActive(publicClient: PublicClient): Promise<boolean> {
  return await publicClient.readContract({
    address: BLOCKVOX_CONTRACT_ADDRESS,
    abi: blockvoxABI,
    functionName: 'isElectionActive',
  });
}

/** Verifies participation status of a specific address (Prevents double-voting). */
export async function hasVoted(publicClient: PublicClient, voterAddress: Address): Promise<boolean> {
  return await publicClient.readContract({
    address: BLOCKVOX_CONTRACT_ADDRESS,
    abi: blockvoxABI,
    functionName: 'hasVoted',
    args: [voterAddress],
  });
}

/** Returns the active voting mode constant from the contract. */
export async function getVotingMode(publicClient: PublicClient): Promise<number> {
  const mode = await publicClient.readContract({
    address: BLOCKVOX_CONTRACT_ADDRESS,
    abi: blockvoxABI,
    functionName: 'votingMode',
  });
  return mode as number;
}

/** Utility to wait for transaction finality on the Avalanche Fuji network. */
export async function waitForTx(publicClient: PublicClient, hash: `0x${string}`) {
  return await publicClient.waitForTransactionReceipt({ hash });
}

/* ─── Administrative Operators ─────────────────────── */

/** Configures the election protocol mode (Single, Approval, or Score). */
export async function setVotingModeOnChain(
  mode: number,
  walletClient: WalletClient,
  account: Address
): Promise<`0x${string}`> {
  return await walletClient.writeContract({
    address: BLOCKVOX_CONTRACT_ADDRESS,
    abi: blockvoxABI,
    functionName: 'setVotingMode',
    args: [mode],
    chain: avalancheFuji,
    account,
  });
}

/** Initializes a new election on-chain with a Merkle Root for whitelist verification. */
export async function startElection(
  merkleRoot: `0x${string}`,
  walletClient: WalletClient,
  account: Address
): Promise<`0x${string}`> {
  return await walletClient.writeContract({
    address: BLOCKVOX_CONTRACT_ADDRESS,
    abi: blockvoxABI,
    functionName: 'startElection',
    args: [merkleRoot],
    chain: avalancheFuji,
    account,
  });
}

/** Finalizes the election and permanently locks results into the blockchain history. */
export async function endElection(walletClient: WalletClient, account: Address): Promise<`0x${string}`> {
  return await walletClient.writeContract({
    address: BLOCKVOX_CONTRACT_ADDRESS,
    abi: blockvoxABI,
    functionName: 'endElection',
    chain: avalancheFuji,
    account,
  });
}

/** Validates that the application is targeting a valid EVM contract address. */
export function isContractDeployed(): boolean {
  return BLOCKVOX_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000' && BLOCKVOX_CONTRACT_ADDRESS.length === 42;
}

/* ─── Voter Token System (Demo Only) ───────────────── */

export interface VoterToken {
  code: string;
  used: boolean;
  usedBy?: string;
  usedAt?: string;
}

/** 
 * Generates batches of unique "VoterPass" tokens.
 * This acts as a demo-friendly second layer of authentication 
 * to ensure sybil resistance in a hackathon setting.
 */
export function generateVoterTokens(count: number): VoterToken[] {
  const tokens: VoterToken[] = [];
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  
  for (let i = 0; i < count; i++) {
    let code = 'PVG-';
    for (let j = 0; j < 6; j++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    tokens.push({ code, used: false });
  }

  const existing = getStoredTokens();
  const combined = [...existing, ...tokens];
  localStorage.setItem('blockvox_voter_tokens', JSON.stringify(combined));
  return combined;
}

/** Retrieves persisted tokens from local browser storage. */
export function getStoredTokens(): VoterToken[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem('blockvox_voter_tokens');
  return data ? JSON.parse(data) : [];
}

/** Verifies if a voter token exists and hasn't been burned (double-voting prevention). */
export function validateVoterToken(code: string): { valid: boolean; used: boolean } {
  const tokens = getStoredTokens();
  const token = tokens.find(t => t.code === code);
  if (!token) return { valid: false, used: false };
  return { valid: true, used: token.used };
}

/** Marks a voter token as permanently 'Spent' upon successful commitment. */
export function markTokenUsed(code: string, address: string): void {
  const tokens = getStoredTokens();
  const index = tokens.findIndex(t => t.code === code);
  if (index !== -1) {
    tokens[index].used = true;
    tokens[index].usedBy = address;
    tokens[index].usedAt = new Date().toISOString();
    localStorage.setItem('blockvox_voter_tokens', JSON.stringify(tokens));
  }
}
