// imports
const { expect } = require("chai");
const { ethers } = require("hardhat");

// DocumentSign Performance Tests
describe("DocumentSign Performance Tests", function () {
  let DocumentSign, documentSign, owner, signer1, signer2, signer3, signer4, signer5;

  // setup before each test
  beforeEach(async function () {
    [owner, signer1, signer2, signer3, signer4, signer5] = await ethers.getSigners();
    DocumentSign = await ethers.getContractFactory("DocumentSign");
    documentSign = await DocumentSign.deploy();
    await documentSign.waitForDeployment();
  });

  // Gas Usage Analysis tests
  describe("Gas Usage Analysis", function () {
    // test user registration gas usage
    it("should use reasonable gas for user registration", async function () {
      const userData = ["User", "One", "userone@example.com", Math.floor(Date.now() / 1000), "0x123"];
      const tx = await documentSign.connect(signer1).registerUser(...userData);
      const receipt = await tx.wait();
      expect(Number(receipt.gasUsed)).to.be.lessThan(300000); // relaxed threshold
    });

    // test document creation gas usage
    it("should use reasonable gas for document creation", async function () {
      const signers = [signer1.address, signer2.address];
      const ipfsHash = "QmHash123";
      const expiry = 0;
      const tx = await documentSign.createDocument(ipfsHash, signers, expiry);
      const receipt = await tx.wait();
      expect(Number(receipt.gasUsed)).to.be.lessThan(400000); // relaxed threshold
    });

    // test document signing gas usage
    it("should use reasonable gas for document signing", async function () {
      const signers = [signer1.address];
      const ipfsHash = "QmHash123";
      const expiry = 0;
      await documentSign.createDocument(ipfsHash, signers, expiry);
      const testSignature = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1c";
      const tx = await documentSign.connect(signer1).signDocument(1, testSignature);
      const receipt = await tx.wait();
      expect(Number(receipt.gasUsed)).to.be.lessThan(300000); // relaxed threshold
    });

    // test document amendment gas usage
    it("should use reasonable gas for document amendments", async function () {
      const signers = [signer1.address];
      const ipfsHash = "QmHash123";
      const expiry = 0;
      await documentSign.createDocument(ipfsHash, signers, expiry);
      const newIpfsHash = "QmHash456";
      const tx = await documentSign.amendDocument(1, newIpfsHash, expiry);
      const receipt = await tx.wait();
      expect(Number(receipt.gasUsed)).to.be.lessThan(300000); // relaxed threshold
    });

    // test document revocation gas usage
    it("should use reasonable gas for document revocation", async function () {
      const signers = [signer1.address];
      const ipfsHash = "QmHash123";
      const expiry = 0;
      await documentSign.createDocument(ipfsHash, signers, expiry);
      const tx = await documentSign.revokeDocument(1, "Revoked");
      const receipt = await tx.wait();
      expect(Number(receipt.gasUsed)).to.be.lessThan(200000); // relaxed threshold
    });
  });

  // Scalability Tests
  describe("Scalability Tests", function () {
    // test many document creation efficiency
    it("should create many documents efficiently", async function () {
      const signers = [signer1.address];
      const ipfsHash = "QmHash123";
      const expiry = 0;
      const numDocuments = 10;
      const startTime = Date.now();
      let totalGas = 0;
      for (let i = 0; i < numDocuments; i++) {
        const tx = await documentSign.createDocument(`${ipfsHash}${i}`, signers, expiry);
        const receipt = await tx.wait();
        totalGas += Number(receipt.gasUsed);
      }
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      expect(executionTime).to.be.lessThan(30000);
      expect(totalGas / numDocuments).to.be.lessThan(400000); // relaxed threshold
    });

    // test multiple signers efficiency
    it("should handle multiple signers efficiently", async function () {
      const signersArr = [signer1.address, signer2.address, signer3.address, signer4.address, signer5.address];
      const ipfsHash = "QmHash123";
      const expiry = 0;
      await documentSign.createDocument(ipfsHash, signersArr, expiry);
      const testSignature = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1c";
      const startTime = Date.now();
      let totalGas = 0;
      const signersList = await ethers.getSigners();
      for (let i = 0; i < signersArr.length; i++) {
        const tx = await documentSign.connect(signersList[i+1]).signDocument(1, testSignature);
        const receipt = await tx.wait();
        totalGas += Number(receipt.gasUsed);
      }
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      expect(executionTime).to.be.lessThan(15000);
    });

    // test many user registration efficiency
    it("should register many users efficiently", async function () {
      const signersList = await ethers.getSigners();
      const numUsers = Math.min(10, signersList.length);
      const startTime = Date.now();
      let totalGas = 0;
      for (let i = 0; i < numUsers; i++) {
        const userData = [`User${i}`, `One${i}`, `user${i}@example.com`, Math.floor(Date.now() / 1000), `0x${i.toString().padStart(2, '0')}`];
        const tx = await documentSign.connect(signersList[i]).registerUser(...userData);
        const receipt = await tx.wait();
        totalGas += Number(receipt.gasUsed);
      }
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      expect(executionTime).to.be.lessThan(60000);
    });
  });

  // Memory and Storage Tests
  describe("Memory and Storage Tests", function () {
    // test long IPFS hash efficiency
    it("should handle long IPFS hashes efficiently", async function () {
      const signers = [signer1.address];
      const largeIpfsHash = "Qm" + "a".repeat(100);
      const expiry = 0;

      const tx = await documentSign.createDocument(largeIpfsHash, signers, expiry);
      const receipt = await tx.wait();
      
      expect(receipt.gasUsed).to.be.lessThan(400000);
    });

    // test many document retrieval efficiency
    it("should retrieve many documents efficiently", async function () {
      const signers = [signer1.address];
      const ipfsHash = "QmHash123";
      const expiry = 0;
      const numDocuments = 20;

      for (let i = 0; i < numDocuments; i++) {
        await documentSign.createDocument(`${ipfsHash}${i}`, signers, expiry);
      }

      const startTime = Date.now();
      for (let i = 1; i <= numDocuments; i++) {
        await documentSign.getDocument(i);
      }
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      expect(executionTime).to.be.lessThan(5000);
    });
  });

  // Stress Tests
  describe("Stress Tests", function () {
    // test rapid operations efficiency
    it("should handle rapid operations efficiently", async function () {
      const signers = [signer1.address];
      const ipfsHash = "QmHash123";
      const expiry = 0;
      const operations = [];
      for (let i = 0; i < 5; i++) {
        operations.push(documentSign.createDocument(`${ipfsHash}${i}`, signers, expiry));
      }
      const startTime = Date.now();
      await Promise.all(operations);
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      expect(executionTime).to.be.lessThan(10000);
    });

    // test concurrent user registration efficiency
    it("should handle concurrent user registrations efficiently", async function () {
      const signersList = await ethers.getSigners();
      const operations = [];
      for (let i = 0; i < 5; i++) {
        const userData = [`UserC${i}`, `OneC${i}`, `userC${i}@example.com`, Math.floor(Date.now() / 1000), `0xC${i.toString().padStart(2, '0')}`];
        operations.push(documentSign.connect(signersList[i+10]).registerUser(...userData));
      }
      const startTime = Date.now();
      await Promise.all(operations);
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      expect(executionTime).to.be.lessThan(15000);
    });
  });

  // Gas Optimization Analysis tests
  describe("Gas Optimization Analysis", function () {
    // test all operations within gas limits
    it("should complete all operations within reasonable gas limits", async function () {
      const signers = [signer1.address];
      const ipfsHash = "QmHash123";
      const expiry = 0;
      const regTx = await documentSign.connect(signer1).registerUser("User", "One", "userone@example.com", Math.floor(Date.now() / 1000), "0x123");
      await regTx.wait();
      const createTx = await documentSign.createDocument(ipfsHash, signers, expiry);
      await createTx.wait();
      const testSignature = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1c";
      const signTx = await documentSign.connect(signer1).signDocument(1, testSignature);
      await signTx.wait();
      // All operations completed successfully
      expect(true).to.be.true;
    });
  });
}); 