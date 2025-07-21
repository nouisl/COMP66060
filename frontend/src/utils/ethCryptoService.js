import EthCrypto from 'eth-crypto';
import CryptoJS from 'crypto-js';
import { ethers } from 'ethers';
import Docu3 from '../contracts/Docu3.json';

class EthCryptoService {
  async getPublicKey(address) {
    if (!window.ethereum) throw new Error('No wallet found');
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(process.env.REACT_APP_CONTRACT_ADDRESS, Docu3.abi, provider);
    const profile = await contract.getUserProfile(address);
    const publicKey = profile[5];
    if (!publicKey) throw new Error('No public key found for user');
    return publicKey;
  }

  async encryptFile(file, uploaderAddress, signerAddresses) {
    const allowedAddresses = [uploaderAddress, ...signerAddresses];
    const symmetricKey = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
    const fileBuffer = await file.arrayBuffer();
    const wordArray = CryptoJS.lib.WordArray.create(fileBuffer);
    const encrypted = CryptoJS.AES.encrypt(wordArray, symmetricKey).toString();
    const encryptedKeys = {};
    for (const address of allowedAddresses) {
      const publicKey = await this.getPublicKey(address);
      const encryptedKey = EthCrypto.encryptWithPublicKey(publicKey, symmetricKey);
      encryptedKeys[address] = EthCrypto.cipher.stringify(await encryptedKey);
    }
    return {
      encryptedFile: encrypted,
      encryptedKeys
    };
  }

  async decryptFile(encryptedFile, encryptedKeys, userAddress, signer) {
    const encryptedKey = encryptedKeys[userAddress];
    if (!encryptedKey) throw new Error('No encrypted key for this user');
    const cipher = EthCrypto.cipher.parse(encryptedKey);
    const privateKey = await this.getPrivateKey(signer);
    const symmetricKey = await EthCrypto.decryptWithPrivateKey(privateKey, cipher);
    const decrypted = CryptoJS.AES.decrypt(encryptedFile, symmetricKey);
    const decryptedBytes = decrypted.sigBytes > 0 ? decrypted : null;
    if (!decryptedBytes) throw new Error('Decryption failed');
    const uint8 = new Uint8Array(decryptedBytes.words.length * 4);
    for (let i = 0; i < decryptedBytes.words.length; i++) {
      const word = decryptedBytes.words[i];
      uint8[i * 4] = (word >> 24) & 0xff;
      uint8[i * 4 + 1] = (word >> 16) & 0xff;
      uint8[i * 4 + 2] = (word >> 8) & 0xff;
      uint8[i * 4 + 3] = word & 0xff;
    }
    return uint8.slice(0, decryptedBytes.sigBytes);
  }

  async getPrivateKey(signer) {
    if (signer.privateKey) return signer.privateKey;
    throw new Error('Signer must provide privateKey');
  }
}

let _ethCryptoService = null;

export const ethCryptoService = {
  get instance() {
    if (!_ethCryptoService) {
      _ethCryptoService = new EthCryptoService();
    }
    return _ethCryptoService;
  }
}; 