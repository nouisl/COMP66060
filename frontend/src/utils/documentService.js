// imports
import { ethers } from 'ethers';
import Docu3 from '../contracts/Docu3.json';

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

// DocumentService class for blockchain interactions
class DocumentService {
  constructor() {
    // define cache for performance
    this.cache = new Map();
    this.cacheTimeout = 30000; 
    this.lastFetch = 0;
  }

  // get documents for user from blockchain
  async getDocumentsForUser(account) {
    const cacheKey = `documents_${account}`;
    const now = Date.now();
    
    // return cached data if valid
    if (this.cache.has(cacheKey) && (now - this.lastFetch) < this.cacheTimeout) {
      return this.cache.get(cacheKey);
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3.abi, provider);
      const count = await contract.documentCount();
      
      // fetch all documents
      const docs = [];
      for (let i = 1; i <= count; i++) {
        try {
          const [
            ipfsHash,
            creator,
            signers,
            createdAt,
            signatureCount,
            fullySigned,
            isRevoked
          ] = await contract.getDocument(i);
          
          // skip revoked documents
          if (isRevoked) {
            continue;
          }
          
          // skip empty documents
          if (!ipfsHash || ipfsHash.trim() === '') {
            continue;
          }
          
          const docObj = {
            ipfsHash,
            creator,
            signers,
            createdAt,
            signatureCount,
            fullySigned,
            isRevoked,
            docId: i
          };
          // check if user is signer or creator
          const isSigner = signers && signers.map(addr => addr.toLowerCase()).includes(account?.toLowerCase());
          const isCreator = creator && creator.toLowerCase() === account?.toLowerCase();
          if (isSigner || isCreator) {
            docs.push(docObj);
          }
        } catch (docError) {
          continue;
        }
      }
      // cache results
      this.cache.set(cacheKey, docs);
      this.lastFetch = now;
      return docs;
    } catch (error) {
      throw error;
    }
  }

  // get user statistics from documents
  async getStatsForUser(account) {
    const docs = await this.getDocumentsForUser(account);
    
    let totalDocs = docs.length;
    let pendingSigs = 0;
    let signedDocs = 0;
    let createdDocs = 0;

    // calculate stats for each document
    for (const doc of docs) {
      const isSigner = doc.signers && doc.signers.map(addr => addr.toLowerCase()).includes(account?.toLowerCase());
      const isCreator = doc.creator && doc.creator.toLowerCase() === account?.toLowerCase();
      if (isCreator) createdDocs++;
      if (isSigner && !doc.fullySigned) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3.abi, provider);
          const docIdNum = typeof doc.docId === 'string' ? parseInt(doc.docId, 10) : doc.docId;
          const hasSigned = await contract.hasSigned(docIdNum, account);
          if (!hasSigned) pendingSigs++;
        } catch (e) {
          pendingSigs++;
        }
      }
      if (doc.fullySigned) signedDocs++;
    }

    return {
      totalDocuments: totalDocs,
      pendingSignatures: pendingSigs,
      signedDocuments: signedDocs,
      createdDocuments: createdDocs
    };
  }

  // clear cache data
  clearCache() {
    this.cache.clear();
    this.lastFetch = 0;
  }
}

// export singleton instance
export const documentService = new DocumentService(); 