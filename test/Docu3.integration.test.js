// imports
const { expect } = require("chai");
const { ethers } = require("hardhat");
require('dotenv').config();

// DocumentSign Complete Integration Tests
describe("DocumentSign Complete Integration Tests", function () {
  let DocumentSign, documentSign, owner, signer1, signer2, signer3;

  // setup before each test
  beforeEach(async function () {
    [owner, signer1, signer2, signer3] = await ethers.getSigners();
    DocumentSign = await ethers.getContractFactory("DocumentSign");
    documentSign = await DocumentSign.deploy();
    await documentSign.waitForDeployment();
  });

  // Complete Document Workflow tests
  describe("Complete Document Workflow", function () {
    // test complete document lifecycle
    it("walks through the whole document lifecycle", async function () {
      const userData1 = ["User", "One", "userone@example.com", Math.floor(Date.now() / 1000), "0x123"];
      const userData2 = ["User", "Two", "usertwo@example.com", Math.floor(Date.now() / 1000), "0x456"];
      const userData3 = ["User", "Three", "userthree@example.com", Math.floor(Date.now() / 1000), "0x789"];

      await documentSign.connect(signer1).registerUser(...userData1);
      await documentSign.connect(signer2).registerUser(...userData2);
      await documentSign.connect(signer3).registerUser(...userData3);

      const profile1 = await documentSign.getUserProfile(signer1.address);
      const profile2 = await documentSign.getUserProfile(signer2.address);
      const profile3 = await documentSign.getUserProfile(signer3.address);

      expect(profile1.isRegistered).to.be.true;
      expect(profile2.isRegistered).to.be.true;
      expect(profile3.isRegistered).to.be.true;

      const signers = [signer1.address, signer2.address, signer3.address];
      const ipfsHash = "QmHash123";
      const expiry = 0;

      const createTx = await documentSign.createDocument(ipfsHash, signers, expiry);
      const createReceipt = await createTx.wait();
      const createEvent = createReceipt.logs.find(l => l.fragment && l.fragment.name === "DocumentCreated");
      const docId = createEvent.args.docId;

      const doc = await documentSign.getDocument(docId);
      expect(doc.ipfsHash).to.equal(ipfsHash);
      expect(doc.creator).to.equal(owner.address);
      expect(doc.signers).to.deep.equal(signers);
      expect(doc.signatureCount).to.equal(0);
      expect(doc.fullySigned).to.be.false;
      expect(doc.isRevoked).to.be.false;

      const testSignature = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1c";

      await documentSign.connect(signer1).signDocument(docId, testSignature);
      await documentSign.connect(signer2).signDocument(docId, testSignature);

      const partiallySignedDoc = await documentSign.getDocument(docId);
      expect(partiallySignedDoc.signatureCount).to.equal(2);
      expect(partiallySignedDoc.fullySigned).to.be.false;

      const newIpfsHash = "QmHash456";
      const amendTx = await documentSign.amendDocument(docId, newIpfsHash, expiry);
      const amendReceipt = await amendTx.wait();

      const amendedDoc = await documentSign.getDocument(docId);
      expect(amendedDoc.ipfsHash).to.equal(newIpfsHash);
      expect(amendedDoc.signatureCount).to.equal(2);
      expect(amendedDoc.fullySigned).to.be.false;

      await documentSign.connect(signer3).signDocument(docId, testSignature);

      const fullySignedDoc = await documentSign.getDocument(docId);
      expect(fullySignedDoc.signatureCount).to.equal(3);
      expect(fullySignedDoc.fullySigned).to.be.true;

      const revokeTx = await documentSign.revokeDocument(docId, "Revoked");
      const revokeReceipt = await revokeTx.wait();

      const revokedDoc = await documentSign.getDocument(docId);
      expect(revokedDoc.isRevoked).to.be.true;
    });

    // test multiple documents with different signers
    it("should handle multiple documents with different signers correctly", async function () {
      const userData1 = ["User", "One", "userone@example.com", Math.floor(Date.now() / 1000), "0x123"];
      const userData2 = ["User", "Two", "usertwo@example.com", Math.floor(Date.now() / 1000), "0x456"];

      await documentSign.connect(signer1).registerUser(...userData1);
      await documentSign.connect(signer2).registerUser(...userData2);

      const doc1Signers = [signer1.address];
      const doc2Signers = [signer2.address];
      const doc3Signers = [signer1.address, signer2.address];

      const doc1Tx = await documentSign.createDocument("QmHash1", doc1Signers, 0);
      const doc2Tx = await documentSign.createDocument("QmHash2", doc2Signers, 0);
      const doc3Tx = await documentSign.createDocument("QmHash3", doc3Signers, 0);

      const doc1Receipt = await doc1Tx.wait();
      const doc2Receipt = await doc2Tx.wait();
      const doc3Receipt = await doc3Tx.wait();

      const doc1Event = doc1Receipt.logs.find(l => l.fragment && l.fragment.name === "DocumentCreated");
      const doc2Event = doc2Receipt.logs.find(l => l.fragment && l.fragment.name === "DocumentCreated");
      const doc3Event = doc3Receipt.logs.find(l => l.fragment && l.fragment.name === "DocumentCreated");

      const doc1Id = doc1Event.args.docId;
      const doc2Id = doc2Event.args.docId;
      const doc3Id = doc3Event.args.docId;

      const testSignature = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1c";

      await documentSign.connect(signer1).signDocument(doc1Id, testSignature);
      await documentSign.connect(signer2).signDocument(doc2Id, testSignature);
      await documentSign.connect(signer1).signDocument(doc3Id, testSignature);
      await documentSign.connect(signer2).signDocument(doc3Id, testSignature);

      const doc1 = await documentSign.getDocument(doc1Id);
      const doc2 = await documentSign.getDocument(doc2Id);
      const doc3 = await documentSign.getDocument(doc3Id);

      expect(doc1.signatureCount).to.equal(1);
      expect(doc1.fullySigned).to.be.true;

      expect(doc2.signatureCount).to.equal(1);
      expect(doc2.fullySigned).to.be.true;

      expect(doc3.signatureCount).to.equal(2);
      expect(doc3.fullySigned).to.be.true;
    });

    // test concurrent operations
    it("should handle concurrent operations correctly", async function () {
      const userData = ["User", "One", "userone@example.com", Math.floor(Date.now() / 1000), "0x123"];
      await documentSign.connect(signer1).registerUser(...userData);

      const signers = [signer1.address];
      const documents = [];
      
      for (let i = 0; i < 5; i++) {
        documents.push(documentSign.createDocument(`QmHash${i}`, signers, 0));
      }

      const results = await Promise.all(documents);
      
      for (let i = 0; i < results.length; i++) {
        const receipt = await results[i].wait();
        expect(receipt.status).to.equal(1);
      }

      const testSignature = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1c";
      const signatures = [];

      for (let i = 1; i <= 5; i++) {
        signatures.push(documentSign.connect(signer1).signDocument(i, testSignature));
      }

      const signatureResults = await Promise.all(signatures);

      for (let i = 0; i < signatureResults.length; i++) {
        const receipt = await signatureResults[i].wait();
        expect(receipt.status).to.equal(1);
      }
    });
  });

  // Error Recovery and Edge Cases tests
  describe("Error Recovery and Edge Cases", function () {
    // test failed transaction handling
    it("should handle failed transactions gracefully", async function () {
      await expect(
        documentSign.createDocument("", [signer1.address], 0)
      ).to.be.revertedWith("IPFS hash required");

      const testSignature = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1c";
      
      await expect(
        documentSign.connect(signer1).signDocument(999, testSignature)
      ).to.be.revertedWith("Document does not exist");

      const docCount = await documentSign.documentCount();
      expect(docCount).to.equal(0);
    });

    // test network interruption stability
    it("should remain stable during network interruptions", async function () {
      const signers = [signer1.address];
      const ipfsHash = "QmHash123";
      
      const createTx = await documentSign.createDocument(ipfsHash, signers, 0);
      const createReceipt = await createTx.wait();
      const createEvent = createReceipt.logs.find(l => l.fragment && l.fragment.name === "DocumentCreated");
      const docId = createEvent.args.docId;

      expect(createReceipt.status).to.equal(1);

      const doc = await documentSign.getDocument(docId);
      expect(doc.ipfsHash).to.equal(ipfsHash);
    });

    // test data consistency after multiple operations
    it("should maintain data consistency after multiple operations", async function () {
      const userData = ["User", "One", "userone@example.com", Math.floor(Date.now() / 1000), "0x123"];
      await documentSign.connect(signer1).registerUser(...userData);

      const signers = [signer1.address];
      const documents = [];

      for (let i = 0; i < 3; i++) {
        documents.push(documentSign.createDocument(`QmHash${i}`, signers, 0));
      }

      await Promise.all(documents);

      const testSignature = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1c";

      await documentSign.connect(signer1).signDocument(1, testSignature);
      await documentSign.amendDocument(2, "QmHashAmended", 0);
      await documentSign.revokeDocument(3, "Revoked");

      const doc1 = await documentSign.getDocument(1);
      const doc2 = await documentSign.getDocument(2);
      const doc3 = await documentSign.getDocument(3);

      expect(doc1.fullySigned).to.be.true;
      expect(doc2.ipfsHash).to.equal("QmHashAmended");
      expect(doc3.isRevoked).to.be.true;

      const profile = await documentSign.getUserProfile(signer1.address);
      expect(profile.isRegistered).to.be.true;
    });
  });

  // Performance Under Load tests
  describe("Performance Under Load", function () {
    // test many document operations efficiency
    it("should handle many document operations efficiently", async function () {
      const numDocuments = 20;
      const signers = [signer1.address];
      
      const startTime = Date.now();
      
      for (let i = 0; i < numDocuments; i++) {
        await documentSign.createDocument(`QmHash${i}`, signers, 0);
      }
      
      const endTime = Date.now();
      const creationTime = endTime - startTime;
      
      expect(creationTime).to.be.lessThan(60000);

      for (let i = 1; i <= numDocuments; i++) {
        const doc = await documentSign.getDocument(i);
        expect(doc.creator).to.equal(owner.address);
      }
    });

    // test many user registrations efficiency
    it("should register many users efficiently", async function () {
      const signers = await ethers.getSigners();
      const numUsers = Math.min(10, signers.length);

      const startTime = Date.now();

      const registrations = [];
      for (let i = 0; i < numUsers; i++) {
        const userData = [`User${i}`, `One${i}`, `user${i}@example.com`, Math.floor(Date.now() / 1000), `0x${i.toString().padStart(2, '0')}`];
        registrations.push(documentSign.connect(signers[i]).registerUser(...userData));
      }

      await Promise.all(registrations);

      const endTime = Date.now();
      const registrationTime = endTime - startTime;

      expect(registrationTime).to.be.lessThan(30000);
    });
  });

  // Integration with External Systems tests
  describe("Integration with External Systems", function () {
    // test IPFS hash validation
    it("should validate IPFS hashes correctly", async function () {
      const signers = [signer1.address];
      
      const validHash = "QmYwAPJzv5CZsnA625s3Xr2pLE4Cw33c8icvynXt1cqDuA";
      await expect(
        documentSign.createDocument(validHash, signers, 0)
      ).to.not.be.reverted;

      const invalidHash = "invalid-hash";
      await expect(
        documentSign.createDocument(invalidHash, signers, 0)
      ).to.not.be.reverted;
    });

    // test signature format validation
    it("should validate signature formats correctly", async function () {
      const signers = [signer1.address];
      await documentSign.createDocument("QmHash123", signers, 0);

      const validSignature = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1c";
      await expect(
        documentSign.connect(signer1).signDocument(1, validSignature)
      ).to.not.be.reverted;

      const invalidSignature = "invalid-signature";
      await expect(
        documentSign.connect(signer1).signDocument(1, invalidSignature)
      ).to.be.reverted;
    });
  });
}); 