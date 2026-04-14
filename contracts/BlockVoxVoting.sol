// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract BlockVoxVoting is ReentrancyGuard {
    address public immutable admin;
    bytes32 public merkleRoot;
    bool public electionActive;

    // Commit-Reveal
    mapping(bytes32 => bool) public commitments;
    mapping(uint256 => uint256) public voteCounts;
    mapping(address => bool) public hasVoted;

    event ElectionStarted(bytes32 merkleRoot);
    event VoteCommitted(address indexed voter, bytes32 commitmentHash);
    event VoteRevealed(address indexed voter, uint256 candidateId);
    event ElectionEnded(uint256[] finalResults);

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this");
        _;
    }

    // Admin starts election with voter whitelist (Merkle Root)
    function startElection(bytes32 _merkleRoot) external onlyAdmin {
        require(!electionActive, "Election already active");
        merkleRoot = _merkleRoot;
        electionActive = true;
        emit ElectionStarted(_merkleRoot);
    }

    // Phase 1: Commit vote (hides the actual vote)
    function commitVote(bytes32 commitmentHash, bytes32[] calldata proof) external nonReentrant {
        require(electionActive, "Election is not active");
        require(!hasVoted[msg.sender], "Already voted");

        // Merkle proof verification
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(MerkleProof.verify(proof, merkleRoot, leaf), "Invalid voter proof");

        commitments[commitmentHash] = true;
        emit VoteCommitted(msg.sender, commitmentHash);
    }

    // Phase 2: Reveal vote
    function revealVote(uint256 candidateId, bytes32 salt) external nonReentrant {
        require(electionActive, "Election is not active");
        
        bytes32 commitmentHash = keccak256(abi.encodePacked(candidateId, salt));
        require(commitments[commitmentHash], "Invalid commitment");

        voteCounts[candidateId]++;
        hasVoted[msg.sender] = true;
        commitments[commitmentHash] = false; // Prevent reuse

        emit VoteRevealed(msg.sender, candidateId);
    }

    function endElection() external onlyAdmin {
        require(electionActive, "Election not active");
        electionActive = false;
        emit ElectionEnded(getResults());
    }

    function getResults() public view returns (uint256[] memory) {
        uint256[] memory results = new uint256[](10); // Support up to 10 candidates
        for (uint256 i = 0; i < 10; i++) {
            results[i] = voteCounts[i];
        }
        return results;
    }

    function isElectionActive() external view returns (bool) {
        return electionActive;
    }
}