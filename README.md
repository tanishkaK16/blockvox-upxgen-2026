# 🗳️ BlockVox Protocol
### *Trustless E-Voting on Avalanche Fuji*

**Final Submission: Round 2 (upXgen 2026, PVG Nashik)**  
*A decentralized, verifiable, and private voting protocol designed for the next generation of digital democracy.*

---

## 🚀 Quick Judge Testing Guide

1.  **Initialize Environment**: Run `npm install` and then `npm run dev` in the project root.
2.  **Toggle Demo Mode**: Enable the **"Demo Mode"** checkbox in the header of the Admin and Vote pages for a gas-free, high-fidelity experience.
3.  **Admin Orchestration**:
    -   Navigate to `/admin`.
    -   Upload `voters_sample.csv` (located in root).
    -   Click **"Generate 50 Tokens"** to seed the VoterPass registry.
    -   Click **"Start Election"** to sync the Merkle Root with the ledger.
4.  **Voter Participation**:
    -   Navigate to `/vote`.
    -   Enter a generated **VoterPass** (e.g., PVG-XXXXXX from the admin registry).
    -   Perform the two-phase **Commit-Reveal** handshake (Choice -> Lock -> Unlock).
5.  **Tally Verification**:
    -   Monitor live results on the `/dashboard`.
    -   Explore synthetic preference models in the `/simulator`.

---

## 🏛️ Project Gateway
BlockVox is a secure, private, and verifiable e-voting protocol built on **Avalanche Fuji Testnet**. It features a modern commit-reveal architecture, Merkle tree whitelisting, and a high-fidelity transparency dashboard.

### 📖 Essential Documentation
For a deep dive into our innovations, architecture, and demo guide, please refer to:
- **[📜 Full Project Documentation](./FINAL_DOCUMENTATION_BLOCKVOX.md)** (Read this first for the full vision)
- **[🛠️ Technical Explanation](./TECHNICAL_EXPLANATION.md)** (Deep dive into cryptography and sub-protocols)

---

## 📂 Modular Structure
- `/contracts`: Core protocol logic (Solidity ^0.8.24) with NatSpec documentation.
- `/frontend/app`: Next.js 15 UI with modular `PhaseRenderer` architecture.
- `/frontend/lib`: Cryptography, Merkle Trees, and Simulation Engine.
- `/frontend/hooks`: Reactive on-chain synchronization.
- `/scripts`: Deployment and automation scripts.

---

## ⚡ Protocol Pillars
### 1. Commit-Reveal Privacy
Votes are hidden using keccak256 hashes until the reveal phase concludes, preventing front-running and tactical manipulation.

### 2. Merkle Whitelisting
Thousands of eligible participants are compressed into a 32-byte root for hyper-efficient on-chain eligibility verification.

### 3. AI Fraud Shield
Real-time monitoring and visualization of protocol integrity, sybil resistance, and consensus health.

### 4. Fairness Sandbox
A governance tool comparing plurality vs. consensus-based voting models (FPTP, IRV, Approval, Score).

---

**Built with ❤️ for PVG Nashik. [SnowTrace Contract Address](https://testnet.snowtrace.io/address/0x368f4B6BAb26E47d1fA6E2eeA0f718E235D3B649)**
