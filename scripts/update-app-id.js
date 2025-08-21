import hre from "hardhat";

async function main() {
  console.log("🔄 Updating VeBetterDAO App ID in deployed contract...");

  // Contract details
  const CONTRACT_ADDRESS = "0xa56903cf66bacca8fb5911eb759a8566bda978ac";
  const NEW_APP_ID = "0x8201cf06f4fdce7134ec39087ca4127c972ce0fdeda5d297d8e7a7c33624247f";

  console.log("Contract:", CONTRACT_ADDRESS);
  console.log("New App ID:", NEW_APP_ID);

  // Get the contract instance
  const Learn2Earn = await hre.ethers.getContractFactory("Learn2Earn");
  const learn2Earn = Learn2Earn.attach(CONTRACT_ADDRESS);

  try {
    // Check current app ID
    const currentAppId = await learn2Earn.appId();
    console.log("Current App ID:", currentAppId);

    if (currentAppId.toLowerCase() === NEW_APP_ID.toLowerCase()) {
      console.log("✅ App ID is already correct!");
      return;
    }

    // Update the app ID (only registrar can do this)
    console.log("\n🔄 Updating App ID...");
    const tx = await learn2Earn.updateAppId(NEW_APP_ID, {
      gasLimit: 100000
    });

    console.log("Transaction submitted:", tx.hash);
    console.log("Waiting for confirmation...");

    await tx.wait();

    // Verify the update
    const updatedAppId = await learn2Earn.appId();
    console.log("\n✅ App ID updated successfully!");
    console.log("New App ID:", updatedAppId);

    console.log("\n🎉 Contract is now connected to your VeBetterDAO app!");
    console.log("\nNext steps:");
    console.log("1. Fund your VeBetterDAO app with B3TR tokens");
    console.log("2. Test the complete user flow");

  } catch (error) {
    console.error("❌ Failed to update App ID:", error.message);
    
    if (error.message.includes("Only the registrar")) {
      console.log("\n💡 Make sure you're using the wallet that deployed the contract");
    }
  }
}

main().catch(console.error);