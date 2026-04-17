/**
 * BlockVox Fairness Simulator Engine
 * 
 * Implements 4 distinct voting algorithms:
 * 1. FPTP (First Past The Post)
 * 2. Approval Voting
 * 3. Score Voting
 * 4. IRV (Instant Runoff Voting / Ranked Choice)
 */

export interface Candidate {
  id: number;
  name: string;
}

export interface VoterPreference {
  ranks: number[]; // Array of candidate IDs in order of preference
  approvals: number[]; // Array of candidate IDs approved
  scores: Record<number, number>; // Candidate ID -> Score (0-10)
}

export interface SimulationResults {
  system: string;
  winner: Candidate | null;
  distribution: { name: string; value: number }[];
  fairnessScore: number;
  explanation: string;
}

/** 1. First Past The Post (FPTP) */
export function runFPTP(candidates: Candidate[], preferences: VoterPreference[]): SimulationResults {
  const counts: Record<number, number> = {};
  candidates.forEach(c => counts[c.id] = 0);

  preferences.forEach(p => {
    if (p.ranks.length > 0) {
      counts[p.ranks[0]]++;
    }
  });

  const distribution = candidates.map(c => ({ name: c.name, value: counts[c.id] }));
  const sorted = [...candidates].sort((a, b) => counts[b.id] - counts[a.id]);

  return {
    system: "First-Past-The-Post",
    winner: sorted[0],
    distribution,
    fairnessScore: 35, // Violates IIA, Condorcet, etc.
    explanation: "Simplest form. Often leads to tactical voting and the 'Spoiler Effect'."
  };
}

/** 2. Approval Voting */
export function runApproval(candidates: Candidate[], preferences: VoterPreference[]): SimulationResults {
  const counts: Record<number, number> = {};
  candidates.forEach(c => counts[c.id] = 0);

  preferences.forEach(p => {
    p.approvals.forEach(id => {
      if (counts[id] !== undefined) counts[id]++;
    });
  });

  const distribution = candidates.map(c => ({ name: c.name, value: counts[c.id] }));
  const sorted = [...candidates].sort((a, b) => counts[b.id] - counts[a.id]);

  return {
    system: "Approval Voting",
    winner: sorted[0],
    distribution,
    fairnessScore: 70,
    explanation: "Voters can select multiple candidates. Favors consensus candidates over polarising ones."
  };
}

/** 3. Score Voting */
export function runScore(candidates: Candidate[], preferences: VoterPreference[]): SimulationResults {
  const totals: Record<number, number> = {};
  candidates.forEach(c => totals[c.id] = 0);

  preferences.forEach(p => {
    Object.entries(p.scores).forEach(([id, score]) => {
      const cid = parseInt(id);
      if (totals[cid] !== undefined) totals[cid] += score;
    });
  });

  const distribution = candidates.map(c => ({ 
    name: c.name, 
    value: parseFloat((totals[c.id] / preferences.length).toFixed(2)) 
  }));
  
  const sorted = [...candidates].sort((a, b) => totals[b.id] - totals[a.id]);

  return {
    system: "Score Voting",
    winner: sorted[0],
    distribution,
    fairnessScore: 85,
    explanation: "Most expressive. Reduces the impact of vote splitting by allowing nuanced ratings."
  };
}

/** 4. Instant Runoff Voting (IRV) */
export function runIRV(candidates: Candidate[], preferences: VoterPreference[]): SimulationResults {
  let activeCandidateIds = candidates.map(c => c.id);
  let roundsLog = [];

  while (activeCandidateIds.length > 1) {
    const counts: Record<number, number> = {};
    activeCandidateIds.forEach(id => counts[id] = 0);

    // Count #1 votes from active set
    preferences.forEach(p => {
      for (const rankId of p.ranks) {
        if (activeCandidateIds.includes(rankId)) {
          counts[rankId]++;
          break;
        }
      }
    });

    const totalVotes = Object.values(counts).reduce((a, b) => a + b, 0);
    const sortedActive = activeCandidateIds
      .map(id => ({ id, count: counts[id] }))
      .sort((a, b) => b.count - a.count);

    // Check for majority
    if (sortedActive[0].count > totalVotes / 2) {
      activeCandidateIds = [sortedActive[0].id];
      break;
    }

    // Eliminate the candidate with the fewest votes
    const loser = sortedActive[sortedActive.length - 1];
    activeCandidateIds = activeCandidateIds.filter(id => id !== loser.id);
  }

  const winner = candidates.find(c => c.id === activeCandidateIds[0]) || null;

  return {
    system: "Instant Runoff",
    winner,
    distribution: candidates.map(c => ({ 
      name: c.name, 
      value: winner?.id === c.id ? 100 : 0 // Simplified for final state
    })),
    fairnessScore: 65,
    explanation: "Eliminates least popular choices and redistributes votes. Can violate monotonicity."
  };
}

/** Veritasium Mode Data */
export const VERITASIUM_CANDIDATES: Candidate[] = [
  { id: 1, name: "Einstein" },
  { id: 2, name: "Curie" },
  { id: 3, name: "Bohr" }
];

export function getVeritasiumPreferences(): VoterPreference[] {
  const prefs: VoterPreference[] = [];

  // 33 voters: Einstein > Curie > Bohr
  for (let i = 0; i < 33; i++) {
    prefs.push({
      ranks: [1, 2, 3],
      approvals: [1, 2],
      scores: { 1: 10, 2: 7, 3: 2 }
    });
  }

  // 33 voters: Curie > Bohr > Einstein
  for (let i = 0; i < 33; i++) {
    prefs.push({
      ranks: [2, 3, 1],
      approvals: [2, 3],
      scores: { 2: 10, 3: 7, 1: 2 }
    });
  }

  // 34 voters: Bohr > Einstein > Curie
  for (let i = 0; i < 34; i++) {
    prefs.push({
      ranks: [3, 1, 2],
      approvals: [3],
      scores: { 3: 10, 1: 4, 2: 1 }
    });
  }

  return prefs;
}
