require('dotenv').config();

const { expect } = require("chai");
const { ethers } = require("hardhat");
const PinataSDK = require('@pinata/sdk');

const pinata = new PinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_API_SECRET);

describe("Docu3 with Pinata IPFS integration", function () {
  let documentSign, owner, signer1;

  before(async function () {
    [owner, signer1] = await ethers.getSigners();
    const DocumentSign = await ethers.getContractFactory("DocumentSign");
    documentSign = await DocumentSign.deploy();
    await documentSign.waitForDeployment();
  });

  it("uploads a file to IPFS via Pinata and stores the hash on-chain", async function () {
    // uploading a file (buffer or string)
    const result = await pinata.pinJSONToIPFS({ message: "Hi, decentralized world!" });
    const ipfsHash = result.IpfsHash;
    // storing the hash on-chain
    const tx = await documentSign.createDocument(ipfsHash, [signer1.address]);
    await tx.wait();
    // get hash and check
    const doc = await documentSign.getDocument(1);
    expect(doc.ipfsHash).to.equal(ipfsHash);
  });
}); 