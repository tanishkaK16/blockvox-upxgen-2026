# BlockVox — Antigravity E-Voting on Avalanche 🗳️🚀

**BlockVox** is a trustless, production-grade e-voting protocol built for the **Avalanche Fuji Testnet**. It solves the "Mistrust & Manipulation" problem in digital elections using cryptographic Commit-Reveal cycles, Merkle-root whitelisting, and a real-time AI Fraud Shield.

---

## 🌌 The Mission
Traditional e-voting systems are either centralized (trusted) or transparently hackable. BlockVox provides a **weightless** user experience with **heavyweight** cryptographic integrity. 

- **Trustless Whitelisting**: Powered by Merkle Tree proofs.
- **Privacy-First**: Two-phase Commit-Reveal ensures ballots stay hidden until counting.
- **Live Integrity**: Real-time on-chain tallying with sub-second finality on Avalanche.
- **AI Fraud Shield**: Heuristic anomaly detection flagging Sybil and velocity attacks.

---

## 🏆 Market Differentiation
BlockVox outpaces existing e-voting prototypes by focusing on **Production Integrity** rather than just simulation.

| Feature                  | Voatz / Polyas     | Basic ETH dApps     | **BlockVox (Ours)**              |
|--------------------------|--------------------|---------------------|------------------------------|
| **Whitelisting**         | Centralized DB     | None / Manual       | **Real Merkle Root on-chain**   |
| **Dashboard**            | Static / Delayed   | Hardcoded / Sample  | **Live zero-start (On-Chain)** |
| **Fraud Detection**      | Proprietary/Hidden | None                | **Live AI Shield + Sim Suite** |
| **UX/UI**                | Basic Form         | Static Web3         | **Premium Glassmorphism + Motion** |
| **Voter Privacy**        | Centralized Trust  | Public Ballots      | **Commit-Reveal Hash Matching** |

---

## 🛠️ Technical Architecture

### 1. Merkle-Proof Whitelisting
Admin uploads a CSV representing the voter universe. The system generates a **Merkle Tree**, and only the root hash is stored on-chain. Voters connect their wallets and generate a **Cryptographic Proof** client-side to unlock their ballot—zero data leaks, absolute exclusion.

### 2. The Commit-Reveal Cycle
To prevent "Vote Mimicking" or early tally bias, voters submit a `keccak256(id, salt)` hash (Commitment). After the window closes, they submit their `id` and `salt` (Reveal). The contract verifies the hash matches before counting the vote in the live tally.

### 3. AI Fraud Shield
A heuristic engine monitors the Avalanche Fuji event stream for:
- **Velocity Spikes**: Detects automated script-based voting.
- **Sybil Clustering**: Identifies patterns of wallets with correlated funding sources.

---

## 🚀 Quick Start (Demo Mode)

1. **Clone & Install**:
   ```bash
   git clone [repository-url]
   cd boxvox/frontend
   npm install
   ```

2. **Environment**: Update `.env.local` with your Avalanche Fuji RPC and Contract Address.

3. **Launch Orbit**:
   ```bash
   npm run dev
   ```

4. **Demo Flow**:
   - Go to `/admin` → Upload `voters_sample.csv`.
   - Go to `/vote` → Connect Core/Metamask → Verify Eligibility → Commit → Reveal.
   - Go to `/dashboard` → Watch the bars bounce up live!

---

## ⚡ Built With
- **Blockchain**: Avalanche Fuji Testnet (EVM)
- **Frontend**: Next.js, Framer Motion (Glassmorphism UI)
- **Security**: OpenZeppelin (ECDSA & Cryptography)
- **Provider**: Wagmi / Viem / RainbowKit

---
**Developed at [Hackathon Name] 2k26.**  
*BlockVox — Secure, Scalable, Sovereign.*
