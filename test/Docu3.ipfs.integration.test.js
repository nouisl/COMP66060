// imports
require('dotenv').config();

const { expect } = require("chai");
const { ethers } = require("hardhat");

// DocumentSign with Pinata IPFS integration tests
describe("DocumentSign with Pinata IPFS integration", function () {
  let documentSign, owner, signer1;

  // setup before all tests
  before(async function () {
    [owner, signer1] = await ethers.getSigners();
    const DocumentSign = await ethers.getContractFactory("DocumentSign");
    documentSign = await DocumentSign.deploy();
    await documentSign.waitForDeployment();
  });

  // test file upload to IPFS and on-chain storage
  it("uploads a file to IPFS via Pinata and stores the hash on-chain", async function () {
    if (!process.env.PINATA_API_KEY || !process.env.PINATA_API_SECRET) {
      this.skip();
    }

    const PinataSDK = require('@pinata/sdk');
    const pinata = new PinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_API_SECRET);
    
    const result = await pinata.pinJSONToIPFS({ message: "Hi, decentralized world!" });
    const ipfsHash = result.IpfsHash;
    
    const tx = await documentSign.createDocument(ipfsHash, [signer1.address], 0);
    const receipt = await tx.wait();
    const event = receipt.logs.find(l => l.fragment && l.fragment.name === "DocumentCreated");
    const docId = event.args.docId;
    
    const doc = await documentSign.getDocument(docId);
    expect(doc.ipfsHash).to.equal(ipfsHash);
  });

  // test document creation with IPFS hash and signing
  it("creates document with IPFS hash and allows signing", async function () {
    if (!process.env.PINATA_API_KEY || !process.env.PINATA_API_SECRET) {
      this.skip();
    }

    const PinataSDK = require('@pinata/sdk');
    const pinata = new PinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_API_SECRET);
    
    const testData = { 
      title: "Test Document", 
      content: "This is a test document for IPFS integration",
      timestamp: Date.now()
    };
    
    const result = await pinata.pinJSONToIPFS(testData);
    const ipfsHash = result.IpfsHash;
    
    const tx = await documentSign.createDocument(ipfsHash, [signer1.address], 0);
    const receipt = await tx.wait();
    const event = receipt.logs.find(l => l.fragment && l.fragment.name === "DocumentCreated");
    const docId = event.args.docId;
    
    const testSignature = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1c";
    
    await documentSign.connect(signer1).signDocument(docId, testSignature);
    
    const doc = await documentSign.getDocument(docId);
    expect(doc.signatureCount).to.equal(1);
    expect(doc.fullySigned).to.be.true;
  });

  // test document amendment with new IPFS hash
  it("handles document amendment with new IPFS hash", async function () {
    if (!process.env.PINATA_API_KEY || !process.env.PINATA_API_SECRET) {
      this.skip();
    }

    const PinataSDK = require('@pinata/sdk');
    const pinata = new PinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_API_SECRET);
    
    const initialData = { content: "Initial document content" };
    const result1 = await pinata.pinJSONToIPFS(initialData);
    const initialHash = result1.IpfsHash;
    
    const tx = await documentSign.createDocument(initialHash, [signer1.address], 0);
    const receipt = await tx.wait();
    const event = receipt.logs.find(l => l.fragment && l.fragment.name === "DocumentCreated");
    const docId = event.args.docId;
    
    const updatedData = { content: "Updated document content" };
    const result2 = await pinata.pinJSONToIPFS(updatedData);
    const updatedHash = result2.IpfsHash;
    
    await documentSign.amendDocument(docId, updatedHash, 0);
    
    const doc = await documentSign.getDocument(docId);
    expect(doc.ipfsHash).to.equal(updatedHash);
  });
}); 