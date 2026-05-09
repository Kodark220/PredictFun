const { ethers } = require("ethers");

async function checkBalances() {
    const privateKey = "0x5678a4edece8e3ebfc492d01219254ce18b4088ccec7570c789d7680226a38c8";
    
    const baseSepoliaRpc = "https://sepolia.base.org";
    const zkSyncSepoliaRpc = "https://sepolia.era.zksync.dev";

    const baseProvider = new ethers.JsonRpcProvider(baseSepoliaRpc);
    const zkProvider = new ethers.JsonRpcProvider(zkSyncSepoliaRpc);

    const walletBase = new ethers.Wallet(privateKey, baseProvider);
    const walletZk = new ethers.Wallet(privateKey, zkProvider);

    console.log("Wallet Address:", walletBase.address);

    try {
        const baseBalance = await baseProvider.getBalance(walletBase.address);
        console.log(`Base Sepolia Balance: ${ethers.formatEther(baseBalance)} ETH`);
    } catch (e) {
        console.log("Failed to fetch Base Sepolia balance:", e.message);
    }

    try {
        const zkBalance = await zkProvider.getBalance(walletZk.address);
        console.log(`ZKsync Era Sepolia Balance: ${ethers.formatEther(zkBalance)} ETH`);
    } catch (e) {
        console.log("Failed to fetch ZKsync Sepolia balance:", e.message);
    }
}

checkBalances();
