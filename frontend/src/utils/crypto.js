import { ethers } from 'ethers';
import EthCrypto from 'eth-crypto';

export async function generateDocumentHash(document, ipfsHash) {
  if (document instanceof File) {
    const arrayBuffer = await document.arrayBuffer();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', arrayBuffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    return ethers.keccak256(ethers.toUtf8Bytes(ipfsHash));
  }
}

export async function encryptDocument(fileBuffer, uploader, signerAddresses, getPublicKey) {
  const allRecipients = [uploader, ...signerAddresses];
  const key = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    fileBuffer
  );
  const rawKey = new Uint8Array(await window.crypto.subtle.exportKey('raw', key));
  const encryptedKeys = {};
  let debug = { encryptedKeys: {}, errors: [] };
  for (const addr of allRecipients) {
    try {
      const publicKey = await getPublicKey(addr);
      const encryptedKey = await EthCrypto.encryptWithPublicKey(publicKey, Array.from(rawKey).map(b => b.toString(16).padStart(2, '0')).join(''));
      encryptedKeys[addr] = EthCrypto.cipher.stringify(encryptedKey);
      debug.encryptedKeys[addr] = { encryptedKeyObj: encryptedKey, encryptedKeyString: encryptedKeys[addr] };
    } catch (e) {
      debug.errors.push(`EncryptWithPublicKey error for ${addr}: ${e.message || e}`);
      encryptedKeys[addr] = undefined;
      debug.encryptedKeys[addr] = { error: e.message || e };
    }
  }
  return {
    encryptedFile: encryptedBuffer, 
    encryptedKeys,
    iv: Array.from(iv), 
    debug
  };
}

export async function decryptDocument(encryptedFile, encryptedKeys, userAddress, passphrase, iv) {
  const encryptedSymmetricKey = encryptedKeys[userAddress];
  const cipher = EthCrypto.cipher.parse(encryptedSymmetricKey);
  const privateKey = await getDecryptedPrivateKey(userAddress, passphrase);
  const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
  const symmetricKeyHex = await EthCrypto.decryptWithPrivateKey(cleanPrivateKey, cipher);
  const symmetricKey = new Uint8Array(symmetricKeyHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  const key = await window.crypto.subtle.importKey(
    'raw',
    symmetricKey,
    { name: 'AES-GCM' },
    true,
    ['decrypt']
  );
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    key,
    encryptedFile
  );
  return decryptedBuffer; 
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
  const CryptoJS = require('crypto-js');
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
  const CryptoJS = require('crypto-js');
  const bytes = CryptoJS.AES.decrypt(encryptedPrivateKey, passphrase);
  const decryptedPrivateKey = bytes.toString(CryptoJS.enc.Utf8);
  if (!decryptedPrivateKey) throw new Error('Decryption failed. Wrong passphrase?');
  return decryptedPrivateKey;
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