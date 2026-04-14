async function main() {
    const BlockVoxVoting = await ethers.getContractFactory("BlockVoxVoting");
    const voting = await BlockVoxVoting.deploy();
    await voting.waitForDeployment();
    console.log("BlockVoxVoting deployed to:", await voting.getAddress());
    console.log("Explorer: https://testnet.snowtrace.io/address/" + await voting.getAddress());
}

main().catch(console.error);