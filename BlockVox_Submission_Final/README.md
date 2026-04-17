# 🗳️ BlockVox — Trustless E-Voting on Avalanche

> **Final Submission: Round 2 (upXgen 2026, PVG Nashik)**  
> *A decentralized, verifiable, and private voting protocol designed for the next generation of digital democracy.*

---

## 🏛️ The Mission
In traditional e-voting, transparency often comes at the cost of privacy. **BlockVox** breaks this tradeoff. Built on the high-performance **Avalanche Fuji** network, BlockVox provides a cryptographically secure framework where every vote is verifiable, participant eligibility is mathematically guaranteed, and voting intent remains private until the tally.

## 🚀 Key Technical Innovations

### 1. 🔒 Commit-Reveal Privacy
Votes are submitted as cryptographic hashes: `keccak256(choice + high-entropy salt)`. This ensures that even on a public ledger, no one (not even the admin) knows the current results until the revelation phase begins.

### 2. 🌲 ZK-Eligibility (Merkle Whitelisting)
Eligibility is managed via a Merkle Tree. Voters provide a proof of their address against the on-chain Merkle Root, enabling **Zero-Knowledge** style eligibility verification without mapping PII (Personally Identifiable Information) directly to votes.

### 3. 🛡️ Sybil-Shield (Voter Token System)
To ensure **One-Person-One-Vote** in a high-friction demo environment, we use a "Burnable VoterPass" system. Each eligible voter is assigned a unique token that must be bound to their commit transaction, permanently preventing double-voting.

### 4. 📈 Three-Mode Protocol
BlockVox isn't just a poll; it's an e-voting engine supporting:
- **Single Choice**: Standard plurality.
- **Approval Voting**: Select all candidates you find acceptable.
- **Score Voting**: Rate candidates from 0-10 (High-resolution intent).

---

## 🛠️ Tech Stack
- **Blockchain**: Solidity Smart Contracts on Avalanche Fuji (C-Chain).
- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, Framer Motion.
- **Web3**: RainbowKit, Wagmi, Viem.
- **Privacy**: Commit-Reveal Schemes & Merkle Whitelists.
- **Visuals**: AI-Generated UI assets & Lucide Icons.

---

## 🎥 Demo Walkthrough

### Fast-Track (Demo Mode)
If you are testing in a gasless environment, toggle **"Demo Mode"** on both the Admin and Vote pages. 

1. **ADMIN**: 
   - Generate "Voter Tokens" (VoterPass).
   - Enter Election Name and Option names.
   - Click "Start Election" (Simulated/Simulated).
2. **VOTE**:
   - Enter a generated VoterPass (`PVG-XXXXXX`).
   - Select your candidate.
   - Click **"Commit Vote"** (Locks your intent).
   - Click **"Reveal Vote"** (Tallies the vote on the dashboard).
3. **DASHBOARD**:
   - Watch real-time analytics update with sub-second latency.
   - Monitor the **AI Fraud Shield** live audit feed.

---

## 📜 Contract Details
- **Network**: Avalanche Fuji Testnet (43113)
- **Contract Address**: `0x368f4B6BAb26E47d1fA6E2eeA0f718E235D3B649`
- **Explorer**: [SnowTrace (Fuji)](https://testnet.snowtrace.io/address/0x368f4B6BAb26E47d1fA6E2eeA0f718E235D3B649)

---

## 👨‍💻 Local Setup
1. Clone the repository.
2. `cd frontend`
3. `npm install`
4. `npm run dev`
5. Open `http://localhost:3000`

---

*Built with ❤️ for PVG Nashik by the BlockVox Team.*
