import hre from "hardhat";

async function main() {
  console.log("VeBetterDAO App Registration Helper");
  console.log("====================================\n");

  // VeBetterDAO testnet X2EarnApps contract
  const X2EARN_APPS_ADDRESS = "0xcB23Eb1bBD5c07553795b9538b1061D0f4ABA153";
  
  // Mock B3TR token address on testnet
  const B3TR_TOKEN_ADDRESS = "0xbf64cf86894Ee0877C4e7d03936e35Ee8D8b864F";

  console.log("Important: Before running this script, you need to:");
  console.log("1. Have some testnet VET in your wallet");
  console.log("2. Have some testnet B3TR tokens (use the faucet)");
  console.log("\nB3TR Faucet: 0x5e9c1F0f52aC6b5004122059053b00017EAfB561");
  console.log("\nTo get testnet VET:");
  console.log("  - Visit: https://faucet.vecha.in/");
  console.log("  - Or use VeChain's official testnet faucet\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Your wallet address:", deployer.address);

  // Check VET balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("VET Balance:", hre.ethers.formatEther(balance), "VET");

  if (balance === 0n) {
    console.log("\n❌ You need testnet VET to continue!");
    console.log("Please get some from the faucet first.");
    return;
  }

  // Create app metadata
  const appMetadata = {
    name: "Learn2Earn Academy",
    description: "Educational platform rewarding learners with B3TR tokens",
    category: "Education",
    url: "https://learn2earn.vechain.org",
    twitter: "@learn2earn",
    discord: "discord.gg/learn2earn"
  };

  console.log("\n📝 App Registration Details:");
  console.log(JSON.stringify(appMetadata, null, 2));

  console.log("\n📋 Manual Registration Steps:");
  console.log("1. Visit: https://dev.testnet.governance.vebetterdao.org");
  console.log("2. Connect your VeWorld wallet");
  console.log("3. Navigate to 'Create App' section");
  console.log("4. Fill in the app details:");
  console.log("   - Name: Learn2Earn Academy");
  console.log("   - Description: Educational platform rewarding learners with B3TR tokens");
  console.log("   - Category: Education");
  console.log("5. Submit the transaction");
  console.log("6. Once approved, you'll receive an APP_ID");
  console.log("7. Update the APP_ID in deploy.js");

  console.log("\n🔗 Useful Links:");
  console.log("- VeBetterDAO Testnet: https://dev.testnet.governance.vebetterdao.org");
  console.log("- B3TR Faucet Contract: " + B3TR_TOKEN_ADDRESS);
  console.log("- X2EarnApps Contract: " + X2EARN_APPS_ADDRESS);
  console.log("- VeChain Testnet Explorer: https://explore-testnet.vechain.org");

  // Optional: Check if you have B3TR tokens
  const b3trABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)"
  ];

  try {
    const b3trToken = new hre.ethers.Contract(B3TR_TOKEN_ADDRESS, b3trABI, deployer);
    const b3trBalance = await b3trToken.balanceOf(deployer.address);
    const decimals = await b3trToken.decimals();
    
    console.log("\n💰 B3TR Balance:", hre.ethers.formatUnits(b3trBalance, decimals), "B3TR");
    
    if (b3trBalance === 0n) {
      console.log("⚠️  You don't have B3TR tokens. Use the faucet to get some!");
    }
  } catch (error) {
    console.log("\n⚠️  Could not check B3TR balance");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });