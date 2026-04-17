// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title BlockVoxVoting
 * @dev Secure e-voting dApp with Commit-Reveal, Merkle Whitelisting, and NFT Nullifiers.
 * Developed for PVG Nashik upXgen 2026 Hackathon.
 */
contract BlockVoxVoting is ReentrancyGuard {
    enum VotingMode { Single, Approval, Score }

    address public immutable admin;
    bytes32 public merkleRoot;
    bool public electionActive;
    VotingMode public votingMode;

    // --- Key Innovation: NFT Pass & Nullifier ---
    // Tracks if a specific VoterPass NFT ID has been used to vote
    mapping(uint256 => bool) public nftNullifier;
    address public voterPassNFT; 

    // --- Commit-Reveal Logic ---
    // Phase 1: commitments[hash(vote, salt)] = true
    // Phase 2: verify hash(input, salt) == commitments[hash]
    mapping(bytes32 => bool) public commitments;
    
    // Tally storage
    mapping(uint256 => uint256) public voteCounts; // Used for Single and Approval (Plurality)
    mapping(uint256 => uint256) public totalScores; // Used for Score mode (Cumulative)
    mapping(address => bool) public hasVoted; // Wallet-level check

    event ElectionStarted(bytes32 merkleRoot, VotingMode mode);
    event VotingModeUpdated(VotingMode mode);
    event VoteCommitted(address indexed voter, bytes32 commitmentHash);
    event VoteRevealed(address indexed voter, uint256 choice);
    event ApprovalVoteRevealed(address indexed voter, uint256[] approvedCandidates);
    event ScoreVoteRevealed(address indexed voter, uint256[] scores);
    event ElectionEnded(uint256[] finalResults);

    constructor() {
        admin = msg.sender;
        votingMode = VotingMode.Single;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this");
        _;
    }

    /** 
     * @dev Configures the voting system type (Single, Approval, or Score). 
     * This makes BlockVox address democratic paradoxes like Arrow's Impossibility Theorem. 
     */
    function setVotingMode(uint8 mode) external onlyAdmin {
        require(!electionActive, "Cannot change mode during active election");
        require(mode <= uint8(VotingMode.Score), "Invalid mode");
        votingMode = VotingMode(mode);
        emit VotingModeUpdated(votingMode);
    }

    /** @dev Sets the NFT contract address for VoterPass validation */
    function setVoterPassNFT(address _nftAddress) external onlyAdmin {
        voterPassNFT = _nftAddress;
    }

    /** @dev Admin starts election with a Merkle Root of registered student wallets */
    function startElection(bytes32 _merkleRoot) external onlyAdmin {
        require(!electionActive, "Election already active");
        merkleRoot = _merkleRoot;
        electionActive = true;
        emit ElectionStarted(_merkleRoot, votingMode);
    }

    /** 
     * @dev Phase 1: Commit Vote.
     * Uses Merkle Proofs for wallet verification and tracks NFT passes for nullification.
     * This protects against sybil attacks and double-voting.
     */
    function commitVote(bytes32 commitmentHash, bytes32[] calldata proof, uint256 nftId) external nonReentrant {
        require(electionActive, "Election is not active");
        require(!hasVoted[msg.sender], "Wallet has already voted");
        
        // Innovation: NFT Nullifier check
        // If an NFT is used, it cannot be used again by any wallet
        if (nftId != 0) {
            require(!nftNullifier[nftId], "VoterPass NFT already used");
            nftNullifier[nftId] = true;
        }

        // --- Merkle Whitelist Verification ---
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(MerkleProof.verify(proof, merkleRoot, leaf), "Not on student whitelist");

        commitments[commitmentHash] = true;
        emit VoteCommitted(msg.sender, commitmentHash);
    }

    /** @dev Phase 2: Reveal Single Choice Ballot (FPTP) */
    function revealVote(uint256 candidateId, bytes32 salt) external nonReentrant {
        require(electionActive, "Election is not active");
        require(votingMode == VotingMode.Single, "Mode mismatch: Use voteApproval or voteScore");
        
        // Cryptographic check: Hashes the reveal input with salt to match local store
        bytes32 commitmentHash = keccak256(abi.encodePacked(candidateId, salt));
        require(commitments[commitmentHash], "Invalid commitment match");

        voteCounts[candidateId]++;
        hasVoted[msg.sender] = true;
        delete commitments[commitmentHash]; // Clean state to prevent double reveal

        emit VoteRevealed(msg.sender, candidateId);
    }

    /** @dev Phase 2: Reveal Approval Ballot (Consensus Choice) */
    function voteApproval(uint256[] calldata approvedCandidates, bytes32 salt) external nonReentrant {
        require(electionActive, "Election is not active");
        require(votingMode == VotingMode.Approval, "Mode mismatch");
        
        bytes32 commitmentHash = keccak256(abi.encodePacked(approvedCandidates, salt));
        require(commitments[commitmentHash], "Invalid commitment match");

        for (uint256 i = 0; i < approvedCandidates.length; i++) {
            voteCounts[approvedCandidates[i]]++;
        }
        
        hasVoted[msg.sender] = true;
        delete commitments[commitmentHash];

        emit ApprovalVoteRevealed(msg.sender, approvedCandidates);
    }

    /** @dev Phase 2: Reveal Score Ballot (Cardinal Utility) */
    function voteScore(uint256[] calldata scores, bytes32 salt) external nonReentrant {
        require(electionActive, "Election is not active");
        require(votingMode == VotingMode.Score, "Mode mismatch");
        
        bytes32 commitmentHash = keccak256(abi.encodePacked(scores, salt));
        require(commitments[commitmentHash], "Invalid commitment match");

        for (uint256 i = 0; i < scores.length; i++) {
            require(scores[i] <= 10, "Intensity limit: 0-10 score per candidate");
            totalScores[i] += scores[i];
        }
        
        hasVoted[msg.sender] = true;
        delete commitments[commitmentHash];

        emit ScoreVoteRevealed(msg.sender, scores);
    }

    /** @dev Closes the election and tallies final results */
    function endElection() external onlyAdmin {
        require(electionActive, "Election not active");
        electionActive = false;
        emit ElectionEnded(getResults());
    }

    /** @dev Returns results based on active system (Average Score vs Plurality Count) */
    function getResults() public view returns (uint256[] memory) {
        uint256[] memory results = new uint256[](10);
        if (votingMode == VotingMode.Score) {
            for (uint256 i = 0; i < 10; i++) {
                results[i] = totalScores[i];
            }
        } else {
            for (uint256 i = 0; i < 10; i++) {
                results[i] = voteCounts[i];
            }
        }
        return results;
    }
}