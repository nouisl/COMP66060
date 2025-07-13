import { ethers } from 'ethers';
import Docu3 from '../contracts/Docu3.json';

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

class DocumentService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30000; 
    this.lastFetch = 0;
  }

  async getDocumentsForUser(account) {
    const cacheKey = `documents_${account}`;
    const now = Date.now();
    
    if (this.cache.has(cacheKey) && (now - this.lastFetch) < this.cacheTimeout) {
      return this.cache.get(cacheKey);
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3.abi, provider);
      const count = await contract.documentCount();
      
      const docs = [];
      for (let i = 1; i <= count; i++) {
        const [
          ipfsHash,
          creator,
          signers,
          createdAt,
          signatureCount,
          fullySigned,
          isRevoked
        ] = await contract.getDocument(i);
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
        const isSigner = signers && signers.map(addr => addr.toLowerCase()).includes(account?.toLowerCase());
        const isCreator = creator && creator.toLowerCase() === account?.toLowerCase();
        if (isSigner || isCreator) {
          docs.push(docObj);
        }
      }
      this.cache.set(cacheKey, docs);
      this.lastFetch = now;
      return docs;
    } catch (error) {
      throw error;
    }
  }

  async getStatsForUser(account) {
    const docs = await this.getDocumentsForUser(account);
    
    let totalDocs = docs.length;
    let pendingSigs = 0;
    let signedDocs = 0;
    let createdDocs = 0;

    docs.forEach(doc => {
      const isSigner = doc.signers && doc.signers.map(addr => addr.toLowerCase()).includes(account?.toLowerCase());
      const isCreator = doc.creator && doc.creator.toLowerCase() === account?.toLowerCase();
      
      if (isCreator) createdDocs++;
      if (isSigner && !doc.fullySigned) pendingSigs++;
      if (doc.fullySigned) signedDocs++;
    });

    return {
      totalDocuments: totalDocs,
      pendingSignatures: pendingSigs,
      signedDocuments: signedDocs,
      createdDocuments: createdDocs
    };
  }

  clearCache() {
    this.cache.clear();
    this.lastFetch = 0;
  }
}

export const documentService = new DocumentService(); 