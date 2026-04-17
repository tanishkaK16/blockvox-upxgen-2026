import { parseEther } from 'viem';
import { blockvoxABI } from '../blockvoxABI';

export const BLOCKVOX_CONTRACT_ADDRESS = "0x..."; // Paste deployed address after Fuji deployment

// Commit Vote
export const commitVote = async (commitmentHash: string, publicClient: any, walletClient: any) => {
    const hash = await walletClient.writeContract({
        address: BLOCKVOX_CONTRACT_ADDRESS,
        abi: blockvoxABI,
        functionName: 'commitVote',
        args: [commitmentHash as `0x${string}`],
    });
    return hash;
};

// Reveal Vote
export const revealVote = async (candidateId: number, salt: string, publicClient: any, walletClient: any) => {
    const hash = await walletClient.writeContract({
        address: BLOCKVOX_CONTRACT_ADDRESS,
        abi: blockvoxABI,
        functionName: 'revealVote',
        args: [BigInt(candidateId), salt as `0x${string}`],
    });
    return hash;
};

// Get Live Results
export const getLiveResults = async (publicClient: any) => {
    const results = await publicClient.readContract({
        address: BLOCKVOX_CONTRACT_ADDRESS,
        abi: blockvoxABI,
        functionName: 'getResults',
    });
    return results;
};