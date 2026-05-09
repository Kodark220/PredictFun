const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying MemeSurvivorBetting with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Use the deployer as the initial resolver
  // In production, this should be the GenLayer bridge/relayer address
  const resolverAddress = process.env.RESOLVER_ADDRESS || deployer.address;
  console.log("Resolver address:", resolverAddress);

  const MemeSurvivorBetting = await hre.ethers.getContractFactory("MemeSurvivorBetting");
  const contract = await MemeSurvivorBetting.deploy(resolverAddress);
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("MemeSurvivorBetting deployed to:", contractAddress);

  /*
  // Fund the contract with some ETH for payouts
  const fundAmount = hre.ethers.parseEther("0.005");
  const fundTx = await contract.fundContract({ value: fundAmount });
  await fundTx.wait();
  console.log("Funded contract with:", hre.ethers.formatEther(fundAmount), "ETH");
  */

  // Verify on Basescan if API key is available
  if (process.env.BASESCAN_API_KEY) {
    console.log("Waiting for block confirmations before verification...");
    await new Promise((resolve) => setTimeout(resolve, 30000));

    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [resolverAddress],
      });
      console.log("Contract verified on Basescan!");
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }

  // Configure bridge linkage
  const bridgeSenderAddress = "0xa46fB1a257C91F14871daf7d2011B36a210b0747";
  const genLayerTargetContract = process.env.GENLAYER_CONTRACT_ADDRESS || ethers.ZeroAddress; 
  
  console.log("\nConfiguring Bridge Linkage...");
  console.log("  BridgeSender:", bridgeSenderAddress);
  console.log("  GenLayer Contract:", genLayerTargetContract);
  
  const configTx = await contract.setBridgeConfig(bridgeSenderAddress, genLayerTargetContract);
  await configTx.wait();
  console.log("✓ Bridge configured!");

  console.log("\n=== Deployment Summary ===");
  console.log("Network:  Base Sepolia");
  console.log("Contract:", contractAddress);
  console.log("Resolver:", resolverAddress);
  console.log("Bridge:  ", bridgeSenderAddress);
  console.log("Funded:  ", hre.ethers.formatEther(fundAmount), "ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
