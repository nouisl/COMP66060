const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DocumentSign", function () {
  let DocumentSign, documentSign, owner, signer1, signer2, nonSigner;

  beforeEach(async function () {
    [owner, signer1, signer2, nonSigner] = await ethers.getSigners();
    DocumentSign = await ethers.getContractFactory("DocumentSign");
    documentSign = await DocumentSign.deploy();
    await documentSign.waitForDeployment();
  });

  describe("createDocument", function () {
    it("should create a document with valid input", async function () {
      const signers = [signer1.address, signer2.address];
      const tx = await documentSign.createDocument("QmHash", signers);
      const receipt = await tx.wait();
      const event = receipt.logs.find(l => l.fragment && l.fragment.name === "DocumentCreated");
      expect(event).to.exist;
      const docId = event.args.docId;
      const doc = await documentSign.getDocument(docId);
      expect(doc.ipfsHash).to.equal("QmHash");
      expect(doc.creator).to.equal(owner.address);
      expect(doc.signers).to.deep.equal(signers);
      expect(doc.signatures).to.equal(0);
      expect(doc.isRevoked).to.equal(false);
    });

    it("should revert if IPFS hash is empty", async function () {
      await expect(documentSign.createDocument("", [signer1.address])).to.be.revertedWith("IPFS hash required");
    });

    it("should revert if no signers provided", async function () {
      await expect(documentSign.createDocument("QmHash", [])).to.be.revertedWith("At least one signer required");
    });

    it("should revert if owner is also a signer", async function () {
      await expect(documentSign.createDocument("QmHash", [owner.address])).to.be.revertedWith("Owner cannot be signer");
    });
  });

  describe("signDocument", function () {
    let docId;
    beforeEach(async function () {
      const tx = await documentSign.createDocument("QmHash", [signer1.address, signer2.address]);
      const receipt = await tx.wait();
      docId = receipt.logs.find(l => l.fragment && l.fragment.name === "DocumentCreated").args.docId;
    });

    it("should allow a signer to sign", async function () {
      await expect(documentSign.connect(signer1).signDocument(docId))
        .to.emit(documentSign, "DocumentSigned")
        .withArgs(docId, signer1.address, anyValue);
      expect(await documentSign.hasSigned(docId, signer1.address)).to.be.true;
      const doc = await documentSign.getDocument(docId);
      expect(doc.signatures).to.equal(1);
    });

    it("should not allow double signing", async function () {
      await documentSign.connect(signer1).signDocument(docId);
      await expect(documentSign.connect(signer1).signDocument(docId)).to.be.revertedWith("Already signed");
    });

    it("should not allow non-signer to sign", async function () {
      await expect(documentSign.connect(nonSigner).signDocument(docId)).to.be.revertedWith("Not authorized signer");
    });

    it("should not allow signing a revoked document", async function () {
      await documentSign.revokeDocument(docId);
      await expect(documentSign.connect(signer1).signDocument(docId)).to.be.revertedWith("Document is revoked");
    });
  });

  describe("revokeDocument", function () {
    let docId;
    beforeEach(async function () {
      const tx = await documentSign.createDocument("QmHash", [signer1.address]);
      const receipt = await tx.wait();
      docId = receipt.logs.find(l => l.fragment && l.fragment.name === "DocumentCreated").args.docId;
    });

    it("should allow owner to revoke", async function () {
      await expect(documentSign.revokeDocument(docId))
        .to.emit(documentSign, "DocumentRevoked")
        .withArgs(docId, owner.address, anyValue);
      const doc = await documentSign.getDocument(docId);
      expect(doc.isRevoked).to.be.true;
    });

    it("should not allow non-owner to revoke", async function () {
      await expect(documentSign.connect(signer1).revokeDocument(docId)).to.be.revertedWith("Not document owner");
    });

    it("should not allow revoking twice", async function () {
      await documentSign.revokeDocument(docId);
      await expect(documentSign.revokeDocument(docId)).to.be.revertedWith("Document is revoked");
    });
  });

  describe("getters and roles", function () {
    let docId;
    beforeEach(async function () {
      const tx = await documentSign.createDocument("QmHash", [signer1.address]);
      const receipt = await tx.wait();
      docId = receipt.logs.find(l => l.fragment && l.fragment.name === "DocumentCreated").args.docId;
    });

    it("should return correct role for owner and signers", async function () {
      expect(await documentSign.getRole(docId, owner.address)).to.equal(1); 
      expect(await documentSign.getRole(docId, signer1.address)).to.equal(2); 
      expect(await documentSign.getRole(docId, nonSigner.address)).to.equal(0); 
    });

    it("should return correct sign timestamp after signing", async function () {
      await documentSign.connect(signer1).signDocument(docId);
      const ts = await documentSign.getSignTimestamp(docId, signer1.address);
      expect(ts).to.be.gt(0);
    });
  });

  describe("expiry and amendment", function () {
    it("should create a document with expiry and prevent signing after expiry", async function () {
      const signers = [signer1.address, signer2.address];
      const now = Math.floor(Date.now() / 1000);
      const tx = await documentSign.createDocument("QmHash", signers, now + 1);
      const receipt = await tx.wait();
      const docId = receipt.logs.find(l => l.fragment && l.fragment.name === "DocumentCreated").args.docId;
      await new Promise(res => setTimeout(res, 1500));
      await expect(documentSign.connect(signer1).signDocument(docId)).to.be.revertedWith("Document expired");
    });

    it("should allow amendment before all signatures and prevent after all signed", async function () {
      const signers = [signer1.address, signer2.address];
      const tx = await documentSign.createDocument("QmHash", signers, 0);
      const receipt = await tx.wait();
      const docId = receipt.logs.find(l => l.fragment && l.fragment.name === "DocumentCreated").args.docId;
      await expect(documentSign.amendDocument(docId, "QmNewHash", 0))
        .to.emit(documentSign, "DocumentAmended");
      await documentSign.connect(signer1).signDocument(docId);
      await expect(documentSign.amendDocument(docId, "QmAnotherHash", 0))
        .to.emit(documentSign, "DocumentAmended");
      await documentSign.connect(signer2).signDocument(docId);
      await expect(documentSign.amendDocument(docId, "QmFail", 0)).to.be.revertedWith("Cannot amend fully signed document");
    });
  });

  describe("sequential signing", function () {
    let docId;
    beforeEach(async function () {
      const tx = await documentSign.createDocument("QmHash", [signer1.address, signer2.address], 0);
      const receipt = await tx.wait();
      docId = receipt.logs.find(l => l.fragment && l.fragment.name === "DocumentCreated").args.docId;
    });

    it("should only allow the current signer to sign in order", async function () {
      await expect(documentSign.connect(signer2).signDocument(docId)).to.be.revertedWith("Not your turn to sign");
      await documentSign.connect(signer1).signDocument(docId);
      await expect(documentSign.connect(signer1).signDocument(docId)).to.be.revertedWith("Already signed");
      await documentSign.connect(signer2).signDocument(docId);
    });

    it("getCurrentSigner returns the correct address", async function () {
      let current = await documentSign.getCurrentSigner(docId);
      expect(current).to.equal(signer1.address);
      await documentSign.connect(signer1).signDocument(docId);
      current = await documentSign.getCurrentSigner(docId);
      expect(current).to.equal(signer2.address);
      await documentSign.connect(signer2).signDocument(docId);
      current = await documentSign.getCurrentSigner(docId);
      expect(current).to.equal(ethers.constants.AddressZero);
    });

    it("should enforce sequential signing for three signers", async function () {
      const signers = [signer1.address, signer2.address, nonSigner.address];
      const tx = await documentSign.createDocument("QmHash", signers, 0);
      const receipt = await tx.wait();
      const docId = receipt.logs.find(l => l.fragment && l.fragment.name === "DocumentCreated").args.docId;
      await expect(documentSign.connect(signer2).signDocument(docId)).to.be.revertedWith("Not your turn to sign");
      await expect(documentSign.connect(nonSigner).signDocument(docId)).to.be.revertedWith("Not your turn to sign");
      await documentSign.connect(signer1).signDocument(docId);
      await expect(documentSign.connect(nonSigner).signDocument(docId)).to.be.revertedWith("Not your turn to sign");
      await documentSign.connect(signer2).signDocument(docId);
      await documentSign.connect(nonSigner).signDocument(docId);
      await expect(documentSign.connect(signer1).signDocument(docId)).to.be.revertedWith("Already signed");
    });
  });
});

const anyValue = (v) => typeof v === "bigint" && v > 0; 