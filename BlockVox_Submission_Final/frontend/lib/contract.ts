// BlockVoxVoting Smart Contract ABI & Address
// Deploy to Avalanche Fuji Testnet (chainId: 43113)

export const BLOCKVOX_ADDRESS = '0x368f4B6BAb26E47d1fA6E2eeA0f718E235D3B649' as const;

export const BLOCKVOX_ABI = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'bytes32', name: 'merkleRoot', type: 'bytes32' },
    ],
    name: 'ElectionStarted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'uint256[]', name: 'finalResults', type: 'uint256[]' },
    ],
    name: 'ElectionEnded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'address', name: 'voter', type: 'address' },
      { indexed: false, internalType: 'bytes32', name: 'commitment', type: 'bytes32' },
    ],
    name: 'VoteCommitted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'address', name: 'voter', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'candidateId', type: 'uint256' },
    ],
    name: 'VoteRevealed',
    type: 'event',
  },
  {
    inputs: [],
    name: 'admin',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'commitmentHash', type: 'bytes32' }],
    name: 'commitVote',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    name: 'commitments',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'electionActive',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'endElection',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getResults',
    outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'hasVoted',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'merkleRoot',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'candidateId', type: 'uint256' },
      { internalType: 'bytes32', name: 'salt', type: 'bytes32' },
    ],
    name: 'revealVote',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '_merkleRoot', type: 'bytes32' }],
    name: 'startElection',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'voteCounts',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Candidate names for the demo
export const CANDIDATES = [
  { id: 0, name: 'Alice Nakamoto', party: 'Innovation Party' },
  { id: 1, name: 'Bob Satoshi', party: 'Transparency Alliance' },
  { id: 2, name: 'Carol Wei', party: 'Digital Democracy Front' },
  { id: 3, name: 'Dave Vitalik', party: 'Decentralized People\'s Party' },
] as const;

// Snowtrace explorer URL
export const SNOWTRACE_URL = 'https://testnet.snowtrace.io';
