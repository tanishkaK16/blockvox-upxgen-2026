/**
 * BlockVox Smart Contract Integration
 *
 * Provides typed helpers for interacting with the BlockVoxVoting contract
 * on Avalanche Fuji Testnet using viem's PublicClient / WalletClient.
 *
 * Usage:
 *   import { commitVote, revealVote, getLiveResults, ... } from '@/lib/blockvox';
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
// Replace with your deployed contract address after `npx hardhat run scripts/deploy.js --network fuji`
export const BLOCKVOX_CONTRACT_ADDRESS: Address =
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as Address) ||
  '0x368f4B6BAb26E47d1fA6E2eeA0f718E235D3B649';

/* ─── ABI (human-readable → parsed at build time) ──── */
export const blockvoxABI = parseAbi([
  'constructor()',
  'function startElection(bytes32 _merkleRoot)',
  'function commitVote(bytes32 commitmentHash, bytes32[] proof)',
  'function revealVote(uint256 candidateId, bytes32 salt)',
  'function endElection()',
  'function getResults() view returns (uint256[])',
  'function isElectionActive() view returns (bool)',
  'function admin() view returns (address)',
  'function merkleRoot() view returns (bytes32)',
  'function hasVoted(address) view returns (bool)',
  'function commitments(bytes32) view returns (bool)',
  'function voteCounts(uint256) view returns (uint256)',
  'event ElectionStarted(bytes32 merkleRoot)',
  'event VoteCommitted(address indexed voter, bytes32 commitmentHash)',
  'event VoteRevealed(address indexed voter, uint256 candidateId)',
  'event ElectionEnded(uint256[] finalResults)',
]);

/* ─── Cryptography ──────────────────────────────────── */

/** Generate a random 32-byte salt as hex string */
export function generateSalt(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return ('0x' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;
}

/**
 * Compute the commitment hash: keccak256(abi.encodePacked(candidateId, salt))
 * Matches the Solidity: `keccak256(abi.encodePacked(candidateId, salt))`
 */
export function computeCommitmentHash(
  candidateId: number,
  salt: `0x${string}`
): `0x${string}` {
  return keccak256(
    encodePacked(
      ['uint256', 'bytes32'],
      [BigInt(candidateId), salt]
    )
  );
}

/* ─── Contract Write Functions ──────────────────────── */

/**
 * Phase 1: Commit a vote on-chain
 * Sends commitVote(bytes32 commitmentHash) transaction
 */
export async function commitVoteOnChain(
  commitmentHash: `0x${string}`,
  proof: `0x${string}`[],
  walletClient: WalletClient,
  account: Address
): Promise<`0x${string}`> {
  const hash = await walletClient.writeContract({
    address: BLOCKVOX_CONTRACT_ADDRESS,
    abi: blockvoxABI,
    functionName: 'commitVote',
    args: [commitmentHash, proof],
    chain: avalancheFuji,
    account,
  });
  return hash;
}

/**
 * Phase 2: Reveal a vote on-chain
 * Sends revealVote(uint256 candidateId, bytes32 salt) transaction
 */
export async function revealVoteOnChain(
  candidateId: number,
  salt: `0x${string}`,
  walletClient: WalletClient,
  account: Address
): Promise<`0x${string}`> {
  const hash = await walletClient.writeContract({
    address: BLOCKVOX_CONTRACT_ADDRESS,
    abi: blockvoxABI,
    functionName: 'revealVote',
    args: [BigInt(candidateId), salt],
    chain: avalancheFuji,
    account,
  });
  return hash;
}

/* ─── Contract Read Functions ───────────────────────── */

/** Get live election results (array of vote counts per candidate) */
export async function getLiveResults(
  publicClient: PublicClient
): Promise<readonly bigint[]> {
  const results = await publicClient.readContract({
    address: BLOCKVOX_CONTRACT_ADDRESS,
    abi: blockvoxABI,
    functionName: 'getResults',
  });
  return results;
}

/** Check if election is currently active */
export async function isElectionActive(
  publicClient: PublicClient
): Promise<boolean> {
  const active = await publicClient.readContract({
    address: BLOCKVOX_CONTRACT_ADDRESS,
    abi: blockvoxABI,
    functionName: 'isElectionActive',
  });
  return active;
}

/** Check if a specific address has already voted */
export async function hasVoted(
  publicClient: PublicClient,
  voterAddress: Address
): Promise<boolean> {
  const voted = await publicClient.readContract({
    address: BLOCKVOX_CONTRACT_ADDRESS,
    abi: blockvoxABI,
    functionName: 'hasVoted',
    args: [voterAddress],
  });
  return voted as boolean;
}

/** Get the current Merkle root */
export async function getMerkleRoot(
  publicClient: PublicClient
): Promise<`0x${string}`> {
  const root = await publicClient.readContract({
    address: BLOCKVOX_CONTRACT_ADDRESS,
    abi: blockvoxABI,
    functionName: 'merkleRoot',
  });
  return root;
}

/** Wait for a transaction to be mined and return the receipt */
export async function waitForTx(
  publicClient: PublicClient,
  hash: `0x${string}`
) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return receipt;
}

/* ─── Admin Functions ───────────────────────────────── */

/** Start an election with a Merkle root */
export async function startElection(
  merkleRoot: `0x${string}`,
  walletClient: WalletClient,
  account: Address
): Promise<`0x${string}`> {
  const hash = await walletClient.writeContract({
    address: BLOCKVOX_CONTRACT_ADDRESS,
    abi: blockvoxABI,
    functionName: 'startElection',
    args: [merkleRoot],
    chain: avalancheFuji,
    account,
  });
  return hash;
}

/** End the active election */
export async function endElection(
  walletClient: WalletClient,
  account: Address
): Promise<`0x${string}`> {
  const hash = await walletClient.writeContract({
    address: BLOCKVOX_CONTRACT_ADDRESS,
    abi: blockvoxABI,
    functionName: 'endElection',
    chain: avalancheFuji,
    account,
  });
  return hash;
}

/* ─── Utility ───────────────────────────────────────── */

/** Check if the contract is deployed (address != zero address) */
export function isContractDeployed(): boolean {
  return (
    BLOCKVOX_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000' &&
    BLOCKVOX_CONTRACT_ADDRESS.length === 42
  );
}
