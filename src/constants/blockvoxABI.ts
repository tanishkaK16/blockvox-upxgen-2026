export const blockvoxABI = [
    "constructor()",
    "function startElection(bytes32 _merkleRoot)",
    "function commitVote(bytes32 commitmentHash, bytes32[] proof)",
    "function revealVote(uint256 candidateId, bytes32 salt)",
    "function endElection()",
    "function getResults() view returns (uint256[])",
    "function isElectionActive() view returns (bool)",
    "event ElectionStarted(bytes32 merkleRoot)",
    "event VoteCommitted(address indexed voter, bytes32 commitmentHash)",
    "event VoteRevealed(address indexed voter, uint256 candidateId)",
    "event ElectionEnded(uint256[] finalResults)"
] as const;