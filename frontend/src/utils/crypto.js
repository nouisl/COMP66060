import { ethers } from 'ethers';
import CryptoJS from 'crypto-js';

export async function generateDocumentHash(document, ipfsHash) {
  if (document instanceof File) {
    const arrayBuffer = await document.arrayBuffer();
    const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
    return CryptoJS.SHA256(wordArray).toString();
  } else {
    return ethers.keccak256(ethers.toUtf8Bytes(ipfsHash));
  }
}

export async function signDocumentHash(documentHash, signer) {
  try {
    const hashBytes = ethers.isHexString(documentHash) 
      ? documentHash 
      : ethers.keccak256(ethers.toUtf8Bytes(documentHash));
    
    const signature = await signer.signMessage(ethers.getBytes(hashBytes));
    return signature;
  } catch (error) {
    throw new Error(`Failed to sign document: ${error.message}`);
  }
}

export function verifySignature(documentHash, signature, expectedSigner) {
  try {
    const hashBytes = ethers.isHexString(documentHash) 
      ? documentHash 
      : ethers.keccak256(ethers.toUtf8Bytes(documentHash));
    
    const recoveredAddress = ethers.verifyMessage(ethers.getBytes(hashBytes), signature);
    
    return recoveredAddress.toLowerCase() === expectedSigner.toLowerCase();
  } catch (error) {
    return false;
  }
}

export function formatSignature(signature) {
  if (!signature) return 'No signature';
  return `${signature.slice(0, 10)}...${signature.slice(-8)}`;
}

export function createVerificationMessage(documentHash, signerAddress, signature) {
  return `Document Hash: ${documentHash}\nSigner: ${signerAddress}\nSignature: ${signature}`;
}

export function generateDocumentId(ipfsHash, title, creator) {
  const content = `${ipfsHash}-${title}-${creator}-${Date.now()}`;
  return ethers.keccak256(ethers.toUtf8Bytes(content));
} 