const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Deploying DocumentSign contract...");

  const DocumentSign = await hre.ethers.getContractFactory("DocumentSign");
  const documentSign = await DocumentSign.deploy();

  await documentSign.waitForDeployment();

  const address = await documentSign.getAddress();
  console.log("DocumentSign deployed to:", address);

  console.log("Contract deployed successfully!");
  console.log("Please update your frontend environment variables:");
  console.log(`REACT_APP_CONTRACT_ADDRESS=${address}`);
  console.log("REACT_APP_NETWORK_ID=80002");
  
  const contractArtifact = await hre.artifacts.readArtifact("DocumentSign");
  fs.writeFileSync(
    './frontend/src/contracts/Docu3.json',
    JSON.stringify(contractArtifact, null, 2)
  );
  
  console.log("Contract ABI saved to frontend/src/contracts/Docu3.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });