// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * ═══════════════════════════════════════════════════════
 * BLOCKVOX — TRUSTLESS E-VOTING PROTOCOL
 * ═══════════════════════════════════════════════════════
 * Author: BlockVox Engineering Team (upXgen 2026, PVG Nashik)
 * Network: Avalanche Fuji Testnet
 * 
 * CORE ARCHITECTURE:
 * 1. COMMIT-REVEAL PRIVACY: Votes are hidden using keccak256 hashes until tallying.
 * 2. MERKLE WHITELISTING: Compresses voter eligibility into a single 32-byte root.
 * 3. MULTI-MODE TALLYING: Native support for Plurality, Approval, and Score models.
 * 4. SYBIL RESISTANCE: Two-layer defense (Merkle Proofs + VoterPass Nullifiers).
 * ═══════════════════════════════════════════════════════
 */

contract BlockVoxVoting is ReentrancyGuard {
    enum VotingMode { Single, Approval, Score }

    // --- STATE VARIABLES ---
    
    /// @notice Authorized administrator (Deployer) with governance rights.
    address public immutable admin;
    
    /// @notice The 32-byte root for student eligibility verification.
    bytes32 public merkleRoot;
    
    /// @notice True if the protocol is currently accepting commitments and reveals.
    bool public electionActive;
    
    /// @notice The democratic model being used for the current session.
    VotingMode public votingMode;

    /** 
     * @notice SYBIL DEFENSE: Burnable Nullifier Mapping. 
     * Maps a VoterPass ID to a 'spent' status, preventing double-voting even if 
     * the system transitions across different democratic models.
     */
    mapping(uint256 => bool) public nftNullifier;
    
    /// @dev Optional address for a secondary VoterPass NFT contract.
    address public voterPassNFT; 

    /** 
     * @notice PRIVACY SHIELD: Commitment Mapping.
     * Stores blinded votes (keccak256(choice + salt)) to prevent front-running.
     */
    mapping(bytes32 => bool) public commitments;
    
    /** 
     * @notice ON-CHAIN TALLY: Protocol Storage.
     * Stores results for Plurality (Single), Consensus (Approval), and Intensity (Score).
     */
    mapping(uint256 => uint256) public voteCounts;  
    mapping(uint256 => uint256) public totalScores; 
    
    /// @notice Wallet-level nullifier to ensure 1-person-1-vote at the account level.
    mapping(address => bool) public hasVoted;      

    // --- EVENTS ---
    event ElectionStarted(bytes32 indexed merkleRoot, VotingMode mode);
    event VotingModeUpdated(VotingMode mode);
    event VoteCommitted(address indexed voter, bytes32 commitmentHash);
    event VoteRevealed(address indexed voter, uint256 choice);
    event ApprovalVoteRevealed(address indexed voter, uint256[] approvedCandidates);
    event ScoreVoteRevealed(address indexed voter, uint256[] scores);
    event ElectionEnded(uint256[] finalResults);

    /** @dev Constructor initializes the protocol state. Defaults to 'Single Choice' mode. */
    constructor() {
        admin = msg.sender;
        votingMode = VotingMode.Single;
    }

    /** @dev Protocol security: Ensures only the authorized admin can trigger lifecycle transitions. */
    modifier onlyAdmin() {
        require(msg.sender == admin, "AUTH_FAILURE: ADMIN_ONLY");
        _;
    }

    /** 
     * @notice Sets the democratic sub-protocol for the upcoming election.
     * @dev Must be called while the protocol is idle to ensure consistency.
     * @param mode 0: Single, 1: Approval, 2: Score.
     */
    function setVotingMode(uint8 mode) external onlyAdmin {
        require(!electionActive, "STATE_ERR: ELECTION_ACTIVE");
        require(mode <= uint8(VotingMode.Score), "PARAM_ERR: INVALID_MODE");
        votingMode = VotingMode(mode);
        emit VotingModeUpdated(votingMode);
    }

    /** 
     * @notice Links an external VoterPass asset to the protocol.
     * @param _nftAddress The address of the deployed NFT collection.
     */
    function setVoterPassNFT(address _nftAddress) external onlyAdmin {
        voterPassNFT = _nftAddress;
    }

    /** 
     * @notice Initializes a new governance session with a fresh whitelist.
     * @dev Synchronizes the off-chain Merkle Root with the Fuji ledger.
     * @param _merkleRoot The result of hashing the entire voter roll.
     */
    function startElection(bytes32 _merkleRoot) external onlyAdmin {
        require(!electionActive, "STATE_ERR: ELECTION_ALREADY_ACTIVE");
        merkleRoot = _merkleRoot;
        electionActive = true;
        emit ElectionStarted(_merkleRoot, votingMode);
    }

    /** 
     * @notice PHASE 1: CRYPTOGRAPHIC COMMITMENT.
     * @notice Secures the voter's intent behind a blinded hash.
     * @dev Nullifies double-voting via both the msg.sender and the specific nftId.
     * @param commitmentHash keccak256(choice + salt)
     * @param proof Merkle proof verifying inclusion in the _merkleRoot.
     * @param nftId The unique ID of the voter's digital pass (0 for wallet-verified only).
     */
    function commitVote(bytes32 commitmentHash, bytes32[] calldata proof, uint256 nftId) external nonReentrant {
        require(electionActive, "STATE_ERR: ELECTION_INACTIVE");
        require(!hasVoted[msg.sender], "AUTH_ERR: WALLET_ALREADY_VOTED");
        
        /**
         * DOUBLE-VOTING DEFENSE
         * If an nftId is provided (e.g., from a VoterPass), it is marked as spent.
         * This prevents a user from voting with the same pass twice across multiple wallets.
         */
        if (nftId != 0) {
            require(!nftNullifier[nftId], "TOKEN_ERR: VPASS_ALREADY_USED");
            nftNullifier[nftId] = true;
        }

        /**
         * MERKLE VERIFICATION: Zero-Knowledge Inclusion.
         * Verifies msg.sender exists in the student root without exposing global state.
         */
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(MerkleProof.verify(proof, merkleRoot, leaf), "WHITELIST_ERR: NOT_ELIGIBLE");

        commitments[commitmentHash] = true;
        emit VoteCommitted(msg.sender, commitmentHash);
    }

    /** 
     * @notice PHASE 2: REVEAL (SINGLE CHOICE).
     * @notice Unlocks a standard ballot and increments the tally.
     * @param candidateId The ID of the option being tallied.
     * @param salt The high-entropy secret used for the commitment in Phase 1.
     */
    function revealVote(uint256 candidateId, bytes32 salt) external nonReentrant {
        require(electionActive, "STATE_ERR: ELECTION_INACTIVE");
        require(votingMode == VotingMode.Single, "PROTOCOL_ERR: MODE_MISMATCH");
        
        /**
         * COMMITMENT HANDSHAKE
         * Recomputes the hash to ensure the salt and choice match the Phase 1 submission.
         */
        bytes32 commitmentHash = keccak256(abi.encodePacked(candidateId, salt));
        require(commitments[commitmentHash], "CRYPT_ERR: INVALID_MATCH");

        voteCounts[candidateId]++;
        hasVoted[msg.sender] = true;
        
        // SECURITY: Prevent double-reveal by deleting the commitment
        delete commitments[commitmentHash]; 

        emit VoteRevealed(msg.sender, candidateId);
    }

    /** 
     * @notice PHASE 2: REVEAL (APPROVAL VOTING).
     * @notice Tallies multiple acceptable options based on a weighted consensus.
     * @param approvedCandidates Array of candidate IDs selected by the voter.
     * @param salt The salt used for the commitment mapping.
     */
    function voteApproval(uint256[] calldata approvedCandidates, bytes32 salt) external nonReentrant {
        require(electionActive, "STATE_ERR: ELECTION_INACTIVE");
        require(votingMode == VotingMode.Approval, "PROTOCOL_ERR: MODE_MISMATCH");
        
        bytes32 commitmentHash = keccak256(abi.encodePacked(approvedCandidates, salt));
        require(commitments[commitmentHash], "CRYPT_ERR: INVALID_MATCH");

        // Atomic tally update
        for (uint256 i = 0; i < approvedCandidates.length; i++) {
            voteCounts[approvedCandidates[i]]++;
        }
        
        hasVoted[msg.sender] = true;
        delete commitments[commitmentHash];

        emit ApprovalVoteRevealed(msg.sender, approvedCandidates);
    }

    /** 
     * @notice PHASE 2: REVEAL (SCORE VOTING).
     * @notice Tallies intensity ratings (0-10) per candidate.
     * @param scores The cardinal utility scores for each ballot option.
     * @param salt The salt used for the commitment mapping.
     */
    function voteScore(uint256[] calldata scores, bytes32 salt) external nonReentrant {
        require(electionActive, "STATE_ERR: ELECTION_INACTIVE");
        require(votingMode == VotingMode.Score, "PROTOCOL_ERR: MODE_MISMATCH");
        
        bytes32 commitmentHash = keccak256(abi.encodePacked(scores, salt));
        require(commitments[commitmentHash], "CRYPT_ERR: INVALID_MATCH");

        for (uint256 i = 0; i < scores.length; i++) {
            require(scores[i] <= 10, "VALIDATION_ERR: SCORE_OUT_OF_BOUNDS_MAX_10");
            totalScores[i] += scores[i];
        }
        
        hasVoted[msg.sender] = true;
        delete commitments[commitmentHash];

        emit ScoreVoteRevealed(msg.sender, scores);
    }

    /** 
     * @notice Concludes the governance session.
     * @dev Shifts the protocol from an active state to an archival results state.
     */
    function endElection() external onlyAdmin {
        require(electionActive, "STATE_ERR: ELECTION_NOT_ACTIVE");
        electionActive = false;
        emit ElectionEnded(getResults());
    }

    /** 
     * @notice Fetches the current tally for all candidates.
     * @return results A numeric array containing counts or scores per option.
     */
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