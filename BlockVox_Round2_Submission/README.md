# BlockVox - Decentralized E-Voting for College Elections
**upXgen 2026 | PVG Nashik | Round 2 Submission**

## What We Built
BlockVox is a secure voting system for college elections. We solved real problems like double voting, lack of trust in counting, and unfair results.

## Key Features We Implemented
- Commit-Reveal voting for privacy
- Burnable VoterPass NFT + Nullifier (prevents multiple votes even with many wallets)
- Multi-mode voting: Single, Approval (multiple candidates), Score (0-10)
- Live Fairness Simulator (shows why results change under different systems)
- Hybrid QR code + wallet registration (easy for students with poor internet)
- Live results dashboard that refreshes every 5 seconds

## Tech Stack
- Blockchain: Avalanche Fuji Testnet (live deployed)
- Smart Contracts: Solidity 0.8.24
- Frontend: Next.js 15 + TypeScript + Tailwind
- Web3: Wagmi + RainbowKit
- Contract Address: 0x368f4B6BAb26E47d1fA6E2eeA0f718E235D3B649

## How to Run
1. Clone repo
2. cd frontend && npm install
3. npm run dev
4. Use the deployed contract on Fuji testnet

All code was written by our team during the hackathon. The NFT nullifier and Fairness Simulator are our strongest parts.

## Problem Solved
We made voting transparent, prevented cheating, and added fair voting modes so results feel fair.

Ready for Round 2 review and finale demo.

Team BlockVox - PVG Nashik
