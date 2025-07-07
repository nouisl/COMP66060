const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  const DocumentSign = await hre.ethers.getContractFactory("DocumentSign");
  const documentSign = await DocumentSign.deploy();

  console.log("DocumentSign deployed to:", documentSign.target);

  const addressData = { address: documentSign.target };
  const outputDir = path.join(__dirname, '../frontend/src/contracts');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(outputDir, 'contract-address.json'),
    JSON.stringify(addressData, null, 2)
  );
  console.log('Contract address saved to frontend/src/contracts/contract-address.json');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});