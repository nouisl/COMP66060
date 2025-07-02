const hre = require("hardhat");

async function main() {
  const DocumentSign = await hre.ethers.getContractFactory("DocumentSign");
  const documentSign = await DocumentSign.deploy();

  console.log("DocumentSign deployed to:", documentSign.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});