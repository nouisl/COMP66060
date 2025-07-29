const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Docu3 Contract", function () {
  let DocumentSign, documentSign, owner, signer1, signer2, nonSigner;

  beforeEach(async function () {
    [owner, signer1, signer2, nonSigner] = await ethers.getSigners();
    DocumentSign = await ethers.getContractFactory("DocumentSign");
    documentSign = await DocumentSign.deploy();
    await documentSign.waitForDeployment();
  });

  describe("User Registration", function () {
    it("should register a new user", async function () {
      const firstName = "John";
      const familyName = "Doe";
      const email = "john@example.com";
      const dob = Math.floor(Date.now() / 1000);
      const publicKey = "0x1234567890abcdef";

      await documentSign.connect(signer1).registerUser(
        firstName, familyName, email, dob, publicKey
      );

      const profile = await documentSign.getUserProfile(signer1.address);
      expect(profile.firstName).to.equal(firstName);
      expect(profile.familyName).to.equal(familyName);
      expect(profile.email).to.equal(email);
      expect(profile.dob).to.equal(dob);
      expect(profile.isRegistered).to.be.true;
      expect(profile.publicKey).to.equal(publicKey);
    });

    it("should prevent duplicate registration", async function () {
      const userData = ["John", "Doe", "john@example.com", Math.floor(Date.now() / 1000), "0x123"];
      
      await documentSign.connect(signer1).registerUser(...userData);
      
      await expect(
        documentSign.connect(signer1).registerUser(...userData)
      ).to.be.revertedWith("Already registered");
    });

    it("should prevent duplicate email registration", async function () {
      const email = "john@example.com";
      const userData1 = ["John", "Doe", email, Math.floor(Date.now() / 1000), "0x123"];
      const userData2 = ["Jane", "Smith", email, Math.floor(Date.now() / 1000), "0x456"];
      
      await documentSign.connect(signer1).registerUser(...userData1);
      
      await expect(
        documentSign.connect(signer2).registerUser(...userData2)
      ).to.be.revertedWith("Email already registered");
    });

    it("should emit UserRegistered event", async function () {
      const userData = ["John", "Doe", "john@example.com", Math.floor(Date.now() / 1000), "0x123"];
      
      await expect(documentSign.connect(signer1).registerUser(...userData))
        .to.emit(documentSign, "UserRegistered")
        .withArgs(signer1.address, ...userData);
    });
  });

  describe("Document Creation", function () {
    it("should create a document with valid input", async function () {
      const signers = [signer1.address, signer2.address];
      const ipfsHash = "QmHash123";
      const expiry = 0;

      const tx = await documentSign.createDocument(ipfsHash, signers, expiry);
      const receipt = await tx.wait();
      const event = receipt.logs.find(l => l.fragment && l.fragment.name === "DocumentCreated");
      expect(event).to.exist;
      
      const docId = event.args.docId;
      const doc = await documentSign.getDocument(docId);
      expect(doc.ipfsHash).to.equal(ipfsHash);
      expect(doc.creator).to.equal(owner.address);
      expect(doc.signers).to.deep.equal(signers);
      expect(doc.signatureCount).to.equal(0);
      expect(doc.fullySigned).to.be.false;
      expect(doc.isRevoked).to.be.false;
    });

    it("should revert if IPFS hash is empty", async function () {
      await expect(documentSign.createDocument("", [signer1.address], 0))
        .to.be.revertedWith("IPFS hash required");
    });

    it("should revert if no signers provided", async function () {
      await expect(documentSign.createDocument("QmHash", [], 0))
        .to.be.revertedWith("At least one signer required");
    });

    it("should revert if owner is also a signer", async function () {
      await expect(documentSign.createDocument("QmHash", [owner.address], 0))
        .to.be.revertedWith("Owner cannot be signer");
    });

    it("should revert if expiry is in the past", async function () {
      const pastExpiry = Math.floor(Date.now() / 1000) - 3600;
      await expect(documentSign.createDocument("QmHash", [signer1.address], pastExpiry))
        .to.be.revertedWith("Expiry must be in the future");
    });

    it("should create document with future expiry", async function () {
      const futureExpiry = Math.floor(Date.now() / 1000) + 3600;
      const signers = [signer1.address];
      
      await documentSign.createDocument("QmHash", signers, futureExpiry);
      
      const doc = await documentSign.getDocument(1);
      expect(doc.ipfsHash).to.equal("QmHash");
    });
  });

  describe("Document Signing", function () {
    let docId;
    const testSignature = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1c";

    beforeEach(async function () {
      const tx = await documentSign.createDocument("QmHash", [signer1.address, signer2.address], 0);
      const receipt = await tx.wait();
      docId = receipt.logs.find(l => l.fragment && l.fragment.name === "DocumentCreated").args.docId;
    });

    it("should allow a signer to sign with signature", async function () {
      await expect(documentSign.connect(signer1).signDocument(docId, testSignature))
        .to.emit(documentSign, "DocumentSigned")
        .withArgs(docId, signer1.address, anyValue, testSignature);
      
      expect(await documentSign.hasSigned(docId, signer1.address)).to.be.true;
      expect(await documentSign.getSignature(docId, signer1.address)).to.equal(testSignature);
      
      const doc = await documentSign.getDocument(docId);
      expect(doc.signatureCount).to.equal(1);
    });

    it("should allow legacy signing without signature", async function () {
      await expect(documentSign.connect(signer1).signDocumentLegacy(docId))
        .to.emit(documentSign, "DocumentSigned")
        .withArgs(docId, signer1.address, anyValue, "");
      
      expect(await documentSign.hasSigned(docId, signer1.address)).to.be.true;
      expect(await documentSign.getSignature(docId, signer1.address)).to.equal("");
    });

    it("should not allow double signing", async function () {
      await documentSign.connect(signer1).signDocument(docId, testSignature);
      await expect(documentSign.connect(signer1).signDocument(docId, testSignature))
        .to.be.revertedWith("Already signed");
    });

    it("should not allow non-signer to sign", async function () {
      await expect(documentSign.connect(nonSigner).signDocument(docId, testSignature))
        .to.be.revertedWith("Not authorized signer");
    });

    it("should not allow signing a revoked document", async function () {
      await documentSign.revokeDocument(docId, "Revoked");
      await expect(documentSign.connect(signer1).signDocument(docId, testSignature))
        .to.be.revertedWith("Document is revoked");
    });

    it("should not allow signing expired document", async function () {
      const pastExpiry = Math.floor(Date.now() / 1000) - 1;
      const tx = await documentSign.createDocument("QmHash", [signer1.address], pastExpiry);
      const receipt = await tx.wait();
      const expiredDocId = receipt.logs.find(l => l.fragment && l.fragment.name === "DocumentCreated").args.docId;
      
      await expect(documentSign.connect(signer1).signDocument(expiredDocId, testSignature))
        .to.be.revertedWith("Document expired");
    });

    it("should require signature parameter", async function () {
      await expect(documentSign.connect(signer1).signDocument(docId, ""))
        .to.be.revertedWith("Signature required");
    });

    it("should enforce sequential signing", async function () {
      await expect(documentSign.connect(signer2).signDocument(docId, testSignature))
        .to.be.revertedWith("Not your turn to sign");
      
      await documentSign.connect(signer1).signDocument(docId, testSignature);
      await documentSign.connect(signer2).signDocument(docId, testSignature);
      
      const doc = await documentSign.getDocument(docId);
      expect(doc.fullySigned).to.be.true;
    });
  });

  describe("Document Revocation", function () {
    let docId;
    const revokeReason = "Document revoked by creator";

    beforeEach(async function () {
      const tx = await documentSign.createDocument("QmHash", [signer1.address], 0);
      const receipt = await tx.wait();
      docId = receipt.logs.find(l => l.fragment && l.fragment.name === "DocumentCreated").args.docId;
    });

    it("should allow owner to revoke", async function () {
      await expect(documentSign.revokeDocument(docId, revokeReason))
        .to.emit(documentSign, "DocumentRevoked")
        .withArgs(docId, owner.address, anyValue, revokeReason);
      
      const doc = await documentSign.getDocument(docId);
      expect(doc.isRevoked).to.be.true;
    });

    it("should not allow non-owner to revoke", async function () {
      await expect(documentSign.connect(signer1).revokeDocument(docId, revokeReason))
        .to.be.revertedWith("Not document owner");
    });

    it("should not allow revoking twice", async function () {
      await documentSign.revokeDocument(docId, revokeReason);
      await expect(documentSign.revokeDocument(docId, revokeReason))
        .to.be.revertedWith("Document is revoked");
    });
  });

  describe("Document Amendment", function () {
    let docId;

    beforeEach(async function () {
      const tx = await documentSign.createDocument("QmHash", [signer1.address, signer2.address], 0);
      const receipt = await tx.wait();
      docId = receipt.logs.find(l => l.fragment && l.fragment.name === "DocumentCreated").args.docId;
    });

    it("should allow owner to amend before all signatures", async function () {
      const newIpfsHash = "QmNewHash";
      const newExpiry = 0;
      
      await expect(documentSign.amendDocument(docId, newIpfsHash, newExpiry))
        .to.emit(documentSign, "DocumentAmended")
        .withArgs(docId, newIpfsHash, owner.address, anyValue);
      
      const doc = await documentSign.getDocument(docId);
      expect(doc.ipfsHash).to.equal(newIpfsHash);
    });

    it("should not allow amendment after all signatures", async function () {
      await documentSign.connect(signer1).signDocument(docId, "0x123");
      await documentSign.connect(signer2).signDocument(docId, "0x456");
      
      await expect(documentSign.amendDocument(docId, "QmNewHash", 0))
        .to.be.revertedWith("Cannot amend fully signed document");
    });

    it("should not allow non-owner to amend", async function () {
      await expect(documentSign.connect(signer1).amendDocument(docId, "QmNewHash", 0))
        .to.be.revertedWith("Not document owner");
    });

    it("should not allow amendment of revoked document", async function () {
      await documentSign.revokeDocument(docId, "Revoked");
      await expect(documentSign.amendDocument(docId, "QmNewHash", 0))
        .to.be.revertedWith("Document is revoked");
    });

    it("should not allow amendment of expired document", async function () {
      const pastExpiry = Math.floor(Date.now() / 1000) - 1;
      const tx = await documentSign.createDocument("QmHash", [signer1.address], pastExpiry);
      const receipt = await tx.wait();
      const expiredDocId = receipt.logs.find(l => l.fragment && l.fragment.name === "DocumentCreated").args.docId;
      
      await expect(documentSign.amendDocument(expiredDocId, "QmNewHash", 0))
        .to.be.revertedWith("Document expired");
    });

    it("should require valid IPFS hash for amendment", async function () {
      await expect(documentSign.amendDocument(docId, "", 0))
        .to.be.revertedWith("IPFS hash required");
    });
  });

  describe("Signature Verification", function () {
    let docId;

    beforeEach(async function () {
      const tx = await documentSign.createDocument("QmHash", [signer1.address], 0);
      const receipt = await tx.wait();
      docId = receipt.logs.find(l => l.fragment && l.fragment.name === "DocumentCreated").args.docId;
      await documentSign.connect(signer1).signDocument(docId, "0x123");
    });

    it("should verify valid signature", async function () {
      const documentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test document"));
      const messageHash = ethers.utils.keccak256(
        ethers.utils.solidityPack(["string", "bytes32"], ["\x19Ethereum Signed Message:\n32", documentHash])
      );
      
      const signature = await signer1.signMessage(ethers.utils.arrayify(documentHash));
      
      const isValid = await documentSign.verifySignature(docId, signer1.address, documentHash, signature);
      expect(isValid).to.be.true;
    });

    it("should reject invalid signature", async function () {
      const documentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test document"));
      const wrongSignature = "0x" + "1".repeat(130);
      
      const isValid = await documentSign.verifySignature(docId, signer1.address, documentHash, wrongSignature);
      expect(isValid).to.be.false;
    });

    it("should reject signature from non-signer", async function () {
      const documentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test document"));
      const signature = await signer2.signMessage(ethers.utils.arrayify(documentHash));
      
      await expect(documentSign.verifySignature(docId, signer2.address, documentHash, signature))
        .to.be.revertedWith("Signer has not signed this document");
    });

    it("should reject invalid signature length", async function () {
      const documentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test document"));
      const invalidSignature = "0x123";
      
      await expect(documentSign.verifySignature(docId, signer1.address, documentHash, invalidSignature))
        .to.be.revertedWith("Invalid signature length");
    });
  });

  describe("Getters and Queries", function () {
    let docId;

    beforeEach(async function () {
      const tx = await documentSign.createDocument("QmHash", [signer1.address, signer2.address], 0);
      const receipt = await tx.wait();
      docId = receipt.logs.find(l => l.fragment && l.fragment.name === "DocumentCreated").args.docId;
    });

    it("should return correct role for owner and signers", async function () {
      expect(await documentSign.getRole(docId, owner.address)).to.equal(1); // Owner
      expect(await documentSign.getRole(docId, signer1.address)).to.equal(2); // Signer
      expect(await documentSign.getRole(docId, nonSigner.address)).to.equal(0); // Unregistered
    });

    it("should return correct sign timestamp after signing", async function () {
      await documentSign.connect(signer1).signDocument(docId, "0x123");
      const ts = await documentSign.getSignTimestamp(docId, signer1.address);
      expect(ts).to.be.gt(0);
    });

    it("should return current signer correctly", async function () {
      let current = await documentSign.getCurrentSigner(docId);
      expect(current).to.equal(signer1.address);
      
      await documentSign.connect(signer1).signDocument(docId, "0x123");
      current = await documentSign.getCurrentSigner(docId);
      expect(current).to.equal(signer2.address);
      
      await documentSign.connect(signer2).signDocument(docId, "0x456");
      current = await documentSign.getCurrentSigner(docId);
      expect(current).to.equal(ethers.constants.AddressZero);
    });

    it("should check if user is signer", async function () {
      expect(await documentSign.isSigner(owner.address, docId)).to.be.true;
      expect(await documentSign.isSigner(signer1.address, docId)).to.be.true;
      expect(await documentSign.isSigner(nonSigner.address, docId)).to.be.false;
    });

    it("should return all registered users", async function () {
      await documentSign.connect(signer1).registerUser("John", "Doe", "john@example.com", Math.floor(Date.now() / 1000), "0x123");
      await documentSign.connect(signer2).registerUser("Jane", "Smith", "jane@example.com", Math.floor(Date.now() / 1000), "0x456");
      
      const users = await documentSign.getAllRegisteredUsers();
      expect(users).to.include(signer1.address);
      expect(users).to.include(signer2.address);
    });
  });

  describe("Document Expiry", function () {
    it("should check if document is expired", async function () {
      const pastExpiry = Math.floor(Date.now() / 1000) - 1;
      const futureExpiry = Math.floor(Date.now() / 1000) + 3600;
      
      const tx1 = await documentSign.createDocument("QmHash1", [signer1.address], pastExpiry);
      const receipt1 = await tx1.wait();
      const expiredDocId = receipt1.logs.find(l => l.fragment && l.fragment.name === "DocumentCreated").args.docId;
      
      const tx2 = await documentSign.createDocument("QmHash2", [signer1.address], futureExpiry);
      const receipt2 = await tx2.wait();
      const validDocId = receipt2.logs.find(l => l.fragment && l.fragment.name === "DocumentCreated").args.docId;
      
      expect(await documentSign.isExpired(expiredDocId)).to.be.true;
      expect(await documentSign.isExpired(validDocId)).to.be.false;
    });
  });

  describe("Error Handling", function () {
    it("should handle non-existent document queries", async function () {
      await expect(documentSign.getDocument(999))
        .to.be.revertedWith("Document does not exist");
      
      await expect(documentSign.getRole(999, owner.address))
        .to.be.revertedWith("Document does not exist");
      
      await expect(documentSign.getCurrentSigner(999))
        .to.be.revertedWith("Document does not exist");
    });

    it("should handle unregistered user profile queries", async function () {
      await expect(documentSign.getUserProfile(nonSigner.address))
        .to.be.revertedWith("User not registered");
    });
  });
});

const anyValue = (v) => typeof v === "bigint" && v > 0; 