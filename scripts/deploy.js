import hre from "hardhat";

async function main() {
  console.log("Starting deployment to VeChain testnet...");

  // VeBetterDAO testnet contract addresses
  const X2EARN_REWARDS_POOL = "0x5F8f86B8D0Fa93cdaE20936d150175dF0205fB38";
  
  // Load APP_ID from environment variable
  const APP_ID = process.env.VEBETTERDAO_APP_ID;
  
  // Institute name for the Learn2Earn platform
  const INSTITUTE_NAME = "VeChain Learn2Earn Academy";

  // Get the contract factory
  const Learn2Earn = await hre.ethers.getContractFactory("Learn2Earn");
  
  console.log("Deploying Learn2Earn contract...");
  console.log("Parameters:");
  console.log("  Institute:", INSTITUTE_NAME);
  console.log("  X2EarnRewardsPool:", X2EARN_REWARDS_POOL);
  console.log("  App ID:", APP_ID);

  // Deploy the contract with specific gas settings
  const learn2Earn = await Learn2Earn.deploy(
    INSTITUTE_NAME,
    X2EARN_REWARDS_POOL,
    APP_ID,
    {
      gasLimit: 3000000  // Set a reasonable gas limit
    }
  );

  // Wait for deployment
  await learn2Earn.waitForDeployment();
  
  const contractAddress = await learn2Earn.getAddress();
  console.log("\n✅ Learn2Earn contract deployed successfully!");
  console.log("Contract address:", contractAddress);
  
  // Get deployment transaction details
  const deploymentTx = learn2Earn.deploymentTransaction();
  if (deploymentTx) {
    console.log("Deployment transaction hash:", deploymentTx.hash);
    console.log("\nView on VeChain Explorer:");
    console.log(`https://explore-testnet.vechain.org/transactions/${deploymentTx.hash}`);
  }

  // Verify initial contract state
  console.log("\nVerifying contract state...");
  const institute = await learn2Earn.institute();
  const appId = await learn2Earn.appId();
  const rewardAmount = await learn2Earn.rewardAmount();
  
  console.log("  Institute name:", institute);
  console.log("  App ID:", appId);
  console.log("  Reward amount:", hre.ethers.formatEther(rewardAmount), "B3TR");

  // Save deployment info
  const deploymentInfo = {
    network: "vechain_testnet",
    contractAddress: contractAddress,
    deploymentTime: new Date().toISOString(),
    constructor: {
      institute: INSTITUTE_NAME,
      x2EarnRewardsPool: X2EARN_REWARDS_POOL,
      appId: APP_ID
    },
    initialState: {
      institute: institute,
      appId: appId,
      rewardAmount: rewardAmount.toString()
    }
  };

  const fs = await import("fs");
  fs.writeFileSync(
    "deployment-info.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\n📝 Deployment info saved to deployment-info.json");

  console.log("\n🎉 Deployment complete!");
  console.log("\nNext steps:");
  console.log("1. Register your app on VeBetterDAO testnet if not done already");
  console.log("2. Update the APP_ID in your contract if needed");
  console.log("3. Add the contract as a Reward Distributor in VeBetterDAO");
  console.log("4. Update the contract address in your frontend .env file");
  console.log("5. Fund the contract with B3TR tokens for rewards");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });