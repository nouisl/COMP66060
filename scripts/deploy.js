const hre = require("hardhat");

async function main() {
  const DocumentSign = await hre.ethers.getContractFactory("DocumentSign");
  const documentSign = await DocumentSign.deploy();

  await documentSign.deployed();

  console.log("DocumentSign deployed to:", documentSign.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});