/**
 * BlockVox Smart Contract Integration
 *
 * Provides typed helpers for interacting with the BlockVoxVoting contract
 * on Avalanche Fuji Testnet using viem's PublicClient / WalletClient.
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

/* ─── Contract Address ──────────────────────────────── */
export const BLOCKVOX_CONTRACT_ADDRESS: Address =
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as Address) ||
  '0x368f4B6BAb26E47d1fA6E2eeA0f718E235D3B649';

/* ─── ABI ──── */
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

/* ─── Cryptography ──────────────────────────────────── */

export function generateSalt(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return ('0x' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;
}

/** Compute commitment hash based on voting mode */
export function computeCommitmentHash(
  voteData: number | number[],
  salt: `0x${string}`,
  mode: number
): `0x${string}` {
  if (mode === 0) {
    // Single
    return keccak256(encodePacked(['uint256', 'bytes32'], [BigInt(voteData as number), salt]));
  } else if (mode === 1) {
    // Approval
    const ids = (voteData as number[]).map(id => BigInt(id));
    // abi.encodePacked in Solidity for uint[] doesn't quite match encodePacked for single values easily. 
    // Usually it's abi.encode(ids, salt) or manual packing. 
    // In our contract: keccak256(abi.encodePacked(approvedCandidates, salt))
    return keccak256(encodePacked(['uint256[]', 'bytes32'], [ids, salt]));
  } else {
    // Score
    const scores = (voteData as number[]).map(s => BigInt(s));
    return keccak256(encodePacked(['uint256[]', 'bytes32'], [scores, salt]));
  }
}

/* ─── Contract Write Functions ──────────────────────── */

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

export async function revealVoteOnChain(
  voteData: number | number[],
  salt: `0x${string}`,
  mode: number,
  walletClient: WalletClient,
  account: Address
): Promise<`0x${string}`> {
  let functionName: 'revealVote' | 'voteApproval' | 'voteScore' = 'revealVote';
  let args: readonly any[] = [];

  if (mode === 0) {
    functionName = 'revealVote';
    args = [BigInt(voteData as number), salt] as const;
  } else if (mode === 1) {
    functionName = 'voteApproval';
    args = [(voteData as number[]).map(id => BigInt(id)), salt] as const;
  } else {
    functionName = 'voteScore';
    args = [(voteData as number[]).map(s => BigInt(s)), salt] as const;
  }

  return await walletClient.writeContract({
    address: BLOCKVOX_CONTRACT_ADDRESS,
    abi: blockvoxABI,
    functionName,
    args,
    chain: avalancheFuji,
    account,
  });
}

/* ─── Contract Read Functions ───────────────────────── */

export async function getLiveResults(publicClient: PublicClient): Promise<readonly bigint[]> {
  return await publicClient.readContract({
    address: BLOCKVOX_CONTRACT_ADDRESS,
    abi: blockvoxABI,
    functionName: 'getResults',
  });
}

export async function isElectionActive(publicClient: PublicClient): Promise<boolean> {
  return await publicClient.readContract({
    address: BLOCKVOX_CONTRACT_ADDRESS,
    abi: blockvoxABI,
    functionName: 'isElectionActive',
  });
}

export async function hasVoted(publicClient: PublicClient, voterAddress: Address): Promise<boolean> {
  return await publicClient.readContract({
    address: BLOCKVOX_CONTRACT_ADDRESS,
    abi: blockvoxABI,
    functionName: 'hasVoted',
    args: [voterAddress],
  });
}

export async function getVotingMode(publicClient: PublicClient): Promise<number> {
  const mode = await publicClient.readContract({
    address: BLOCKVOX_CONTRACT_ADDRESS,
    abi: blockvoxABI,
    functionName: 'votingMode',
  });
  return mode as number;
}

export async function waitForTx(publicClient: PublicClient, hash: `0x${string}`) {
  return await publicClient.waitForTransactionReceipt({ hash });
}

/* ─── Admin Functions ───────────────────────────────── */

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

export async function endElection(walletClient: WalletClient, account: Address): Promise<`0x${string}`> {
  return await walletClient.writeContract({
    address: BLOCKVOX_CONTRACT_ADDRESS,
    abi: blockvoxABI,
    functionName: 'endElection',
    chain: avalancheFuji,
    account,
  });
}

export function isContractDeployed(): boolean {
  return BLOCKVOX_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000' && BLOCKVOX_CONTRACT_ADDRESS.length === 42;
}
