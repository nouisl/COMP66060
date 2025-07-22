import { ethers } from 'ethers';
import CryptoJS from 'crypto-js';
import EthCrypto from 'eth-crypto';

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

export async function generateAndStoreEncryptedKey(passphrase, userAddress) {
  const identity = EthCrypto.createIdentity();
  const encryptedPrivateKey = CryptoJS.AES.encrypt(identity.privateKey, passphrase).toString();
  localStorage.setItem(`docu3_privateKey_${userAddress}`, encryptedPrivateKey);
  return { publicKey: identity.publicKey, encryptedPrivateKey };
}

export function getEncryptedPrivateKey(userAddress) {
  return localStorage.getItem(`docu3_privateKey_${userAddress}`);
}

export async function getDecryptedPrivateKey(userAddress, passphrase) {
  const encryptedPrivateKey = getEncryptedPrivateKey(userAddress);
  if (!encryptedPrivateKey) throw new Error('No encrypted key found. Please register or restore your key.');
  const bytes = CryptoJS.AES.decrypt(encryptedPrivateKey, passphrase);
  const decryptedPrivateKey = bytes.toString(CryptoJS.enc.Utf8);
  if (!decryptedPrivateKey) throw new Error('Decryption failed. Wrong passphrase?');
  return decryptedPrivateKey;
}

export async function encryptDocument(fileBuffer, uploader, signerAddresses, getPublicKey) {
  const allRecipients = [uploader, ...signerAddresses];
  const symmetricKey = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
  const encryptedFile = CryptoJS.AES.encrypt(CryptoJS.lib.WordArray.create(fileBuffer), symmetricKey).toString();
  const encryptedKeys = {};
  for (const addr of allRecipients) {
    const publicKey = await getPublicKey(addr);
    const encryptedKey = await EthCrypto.encryptWithPublicKey(publicKey, symmetricKey);
    encryptedKeys[addr] = EthCrypto.cipher.stringify(encryptedKey);
  }
  return { encryptedFile, encryptedKeys };
}

export async function decryptDocument(encryptedFile, encryptedKeys, userAddress, passphrase) {
  const encryptedSymmetricKey = encryptedKeys[userAddress];
  const cipher = EthCrypto.cipher.parse(encryptedSymmetricKey);
  const privateKey = await getDecryptedPrivateKey(userAddress, passphrase);
  const symmetricKey = await EthCrypto.decryptWithPrivateKey(privateKey, cipher);
  const decrypted = CryptoJS.AES.decrypt(encryptedFile, symmetricKey);
  const decryptedBytes = decrypted.sigBytes > 0 ? decrypted : null;
  if (!decryptedBytes) throw new Error('Failed to decrypt document');
  const uint8Array = new Uint8Array(decryptedBytes.words.length * 4);
  for (let i = 0; i < decryptedBytes.words.length; i++) {
    const word = decryptedBytes.words[i];
    uint8Array[i * 4] = (word >> 24) & 0xff;
    uint8Array[i * 4 + 1] = (word >> 16) & 0xff;
    uint8Array[i * 4 + 2] = (word >> 8) & 0xff;
    uint8Array[i * 4 + 3] = word & 0xff;
  }
  return uint8Array.slice(0, decryptedBytes.sigBytes);
}

export function downloadEncryptedKey(userAddress) {
  const encryptedKey = getEncryptedPrivateKey(userAddress);
  if (!encryptedKey) return;
  const blob = new Blob([encryptedKey], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `docu3_encrypted_key_${userAddress}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function restoreEncryptedKey(userAddress, encryptedKey) {
  localStorage.setItem(`docu3_privateKey_${userAddress}`, encryptedKey);
} 