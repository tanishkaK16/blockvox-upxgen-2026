'use client';

/**
 * Pure-JS Merkle tree compatible with OpenZeppelin's MerkleProof.sol
 *
 * Leaf hashing matches the Solidity contract:
 *   bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
 *
 * Tree construction follows OZ convention:
 *   - Leaves are sorted before hashing pairs
 *   - Pairs are always sorted before hashing: keccak256(sort(a,b))
 *
 * Usage:
 *   const tree = buildMerkleTree(['0xabc...', '0xdef...']);
 *   const proof = getProof(tree, '0xabc...');
 *   const root  = tree.root;
 */

import { keccak256, encodePacked, type Address } from 'viem';

/* ─── Types ─────────────────────────────────────────── */

export interface MerkleTree {
  /** Hex-encoded root (0x…) to pass to startElection() */
  root: `0x${string}`;
  /** Sorted lowercase leaf hashes */
  leaves: `0x${string}`[];
  /** All tree layers [leaves, level1, ..., root] */
  layers: `0x${string}`[][];
  /** Original addresses (normalised to lowercase) */
  addresses: string[];
}

/* ─── Helpers ───────────────────────────────────────── */

/** Hash a single voter address leaf: keccak256(abi.encodePacked(address)) */
function hashLeaf(address: string): `0x${string}` {
  return keccak256(encodePacked(['address'], [address.toLowerCase() as Address]));
}

/** Hash two sibling nodes — always sort them first (OZ convention) */
function hashPair(a: `0x${string}`, b: `0x${string}`): `0x${string}` {
  const [lo, hi] = a.toLowerCase() < b.toLowerCase() ? [a, b] : [b, a];
  return keccak256(encodePacked(['bytes32', 'bytes32'], [lo, hi]));
}

/* ─── Build Tree ─────────────────────────────────────── */

export function buildMerkleTree(addresses: string[]): MerkleTree {
  if (addresses.length === 0) {
    const zero = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;
    return { root: zero, leaves: [], layers: [[]], addresses: [] };
  }

  // Normalise and deduplicate
  const unique = [...new Set(addresses.map((a) => a.toLowerCase().trim()))].filter(
    (a) => /^0x[0-9a-f]{40}$/i.test(a)
  );

  if (unique.length === 0) {
    throw new Error('No valid Ethereum addresses found in the file.');
  }

  // Hash each leaf
  const leaves = unique.map(hashLeaf).sort(); // sort leaves for determinism

  const layers: `0x${string}`[][] = [leaves];

  let currentLayer = leaves;

  while (currentLayer.length > 1) {
    const next: `0x${string}`[] = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      const left = currentLayer[i];
      const right = i + 1 < currentLayer.length ? currentLayer[i + 1] : left; // duplicate odd leaf
      next.push(hashPair(left, right));
    }
    layers.push(next);
    currentLayer = next;
  }

  const root = currentLayer[0];

  return { root, leaves, layers, addresses: unique };
}

/* ─── Generate Proof ─────────────────────────────────── */

export function getProof(tree: MerkleTree, address: string): `0x${string}`[] {
  const leaf = hashLeaf(address.toLowerCase());
  const leafIndex = tree.leaves.indexOf(leaf);

  if (leafIndex === -1) {
    // Address not in whitelist — return empty proof (will revert on-chain)
    return [];
  }

  const proof: `0x${string}`[] = [];
  let idx = leafIndex;

  for (let i = 0; i < tree.layers.length - 1; i++) {
    const layer = tree.layers[i];
    const isRightNode = idx % 2 === 1;
    const siblingIdx = isRightNode ? idx - 1 : idx + 1;

    if (siblingIdx < layer.length) {
      proof.push(layer[siblingIdx]);
    }
    // Move up
    idx = Math.floor(idx / 2);
  }

  return proof;
}

/** Verify a proof client-side (matches OZ MerkleProof.verify) */
export function verifyProof(
  root: `0x${string}`,
  address: string,
  proof: `0x${string}`[]
): boolean {
  let hash = hashLeaf(address.toLowerCase());
  for (const sibling of proof) {
    hash = hashPair(hash, sibling);
  }
  return hash.toLowerCase() === root.toLowerCase();
}

/* ─── Parse Voter File ───────────────────────────────── */

/** Parse addresses from a CSV or JSON file's text content */
export function parseVoterFile(text: string, filename: string): string[] {
  const lower = filename.toLowerCase();

  if (lower.endsWith('.json')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map(String);
      }
      // Could be { addresses: [...] } or { voters: [...] }
      const arr = parsed.addresses ?? parsed.voters ?? parsed.whitelist ?? [];
      return arr.map(String);
    } catch {
      throw new Error('Invalid JSON file. Expected an array of addresses.');
    }
  }

  if (lower.endsWith('.csv')) {
    // Split by newlines, strip header if it has "address", collect hex values
    return text
      .split(/[\r\n]+/)
      .map((line) => line.split(',')[0].trim().replace(/["']/g, ''))
      .filter((v) => /^0x[0-9a-f]{40}$/i.test(v));
  }

  throw new Error('Unsupported file type. Please upload a .csv or .json file.');
}

/* ─── LocalStorage persistence ───────────────────────── */

const LS_KEY = 'blockvox_merkle_tree';

export function saveMerkleTree(tree: MerkleTree) {
  if (typeof window === 'undefined') return;
  // Store only what we need (layers can be reconstructed, but we store for speed)
  localStorage.setItem(
    LS_KEY,
    JSON.stringify({
      root: tree.root,
      addresses: tree.addresses,
      leaves: tree.leaves,
      layers: tree.layers,
    })
  );
}

export function loadMerkleTree(): MerkleTree | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MerkleTree;
  } catch {
    return null;
  }
}

export function clearMerkleTree() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LS_KEY);
}
