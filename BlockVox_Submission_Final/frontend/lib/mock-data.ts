// Mock data generators for demo/hackathon presentation

export interface VoteRecord {
  txHash: string;
  voter: string;
  timestamp: number;
  candidateId: number;
  status: 'committed' | 'revealed' | 'verified';
}

export interface FraudAlert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  message: string;
  timestamp: number;
  address: string;
  resolved: boolean;
}

// Generate random hex string
function randomHex(length: number): string {
  const chars = '0123456789abcdef';
  let result = '0x';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// Generate random Ethereum-style address
function randomAddress(): string {
  return randomHex(40);
}

// Generate mock vote records
export function generateMockVotes(count: number): VoteRecord[] {
  const statuses: VoteRecord['status'][] = ['committed', 'revealed', 'verified'];
  const records: VoteRecord[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    records.push({
      txHash: randomHex(64),
      voter: randomAddress(),
      timestamp: now - Math.floor(Math.random() * 86400000),
      candidateId: Math.floor(Math.random() * 4),
      status: statuses[Math.floor(Math.random() * statuses.length)],
    });
  }

  return records.sort((a, b) => b.timestamp - a.timestamp);
}

// Generate mock fraud alerts
export function generateMockAlerts(): FraudAlert[] {
  return [
    {
      id: 'alert-001',
      type: 'critical',
      message: 'Duplicate commitment hash detected from two different wallets',
      timestamp: Date.now() - 120000,
      address: randomAddress(),
      resolved: false,
    },
    {
      id: 'alert-002',
      type: 'warning',
      message: 'Unusual voting pattern: 47 votes from same IP cluster in 2 minutes',
      timestamp: Date.now() - 300000,
      address: randomAddress(),
      resolved: false,
    },
    {
      id: 'alert-003',
      type: 'info',
      message: 'Merkle proof verification passed for batch #127',
      timestamp: Date.now() - 600000,
      address: randomAddress(),
      resolved: true,
    },
    {
      id: 'alert-004',
      type: 'warning',
      message: 'Gas price anomaly detected: potential front-running attempt',
      timestamp: Date.now() - 900000,
      address: randomAddress(),
      resolved: true,
    },
    {
      id: 'alert-005',
      type: 'critical',
      message: 'Sybil attack pattern identified: wallet cluster sharing same seed phrase derivation',
      timestamp: Date.now() - 1200000,
      address: randomAddress(),
      resolved: false,
    },
  ];
}

// Simulated live vote counts that increment
export function getSimulatedCounts(base: number[]): number[] {
  return base.map((v) => v + Math.floor(Math.random() * 3));
}

// Initial vote count bases
export const INITIAL_VOTE_COUNTS = [1847, 1623, 1456, 1102];

// Format address for display
export function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// Format timestamp
export function formatTime(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// Format large numbers
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}
