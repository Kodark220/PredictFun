const { ethers } = require("ethers");

async function checkGenLayerBalance() {
    const address = "0xF9346827f713Eb953a2e22465b9Ee91901726BDC";
    
    // GenLayer RPC from README
    const rpc = "https://studio.genlayer.com:8443/api";

    try {
        const response = await fetch(rpc, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_getBalance',
                params: [address, 'latest']
            })
        });
        
        const data = await response.json();
        if (data.error) {
            console.log("Error from GenLayer RPC:", data.error.message);
        } else {
            console.log(`GenLayer Balance: ${ethers.formatEther(data.result)} GEN`);
        }
    } catch (e) {
        console.log("Failed to fetch GenLayer balance:", e.message);
    }
}

checkGenLayerBalance();
