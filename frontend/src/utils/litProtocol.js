import * as LitJsSdk from '@lit-protocol/lit-node-client';
import { encryptString, decryptString, blobToBase64String, base64StringToBlob, uint8arrayToString } from '@lit-protocol/encryption';
import { checkAndSignAuthMessage } from '@lit-protocol/auth-helpers';
import { ethers } from 'ethers';
import Docu3 from '../contracts/Docu3.json';

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

class LitProtocolService {
  constructor() {
    this.litNodeClient = null;
    this.connected = false;
  }

  async connect() {
    try {
      this.litNodeClient = new LitJsSdk.LitNodeClient({
        litNetwork: 'datil-dev',
        alertWhenUnauthorized: false,
        debug: false,
      });
      await this.litNodeClient.connect();
      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw new Error(`Failed to connect to Lit Protocol: ${error.message || error.toString()}`);
    }
  }

  async getAuthSig() {
    if (!window.ethereum) {
      throw new Error('No wallet found. Please connect your wallet first.');
    }
    
    try {
      const authSig = await checkAndSignAuthMessage({
        chain: 'amoy',
      });
      return authSig;
    } catch (error) {
      throw new Error(`Failed to get auth signature: ${error.message || error.toString()}`);
    }
  }

  createAccessControlConditions(docId) {
    if (!CONTRACT_ADDRESS) {
      throw new Error('Contract address not configured. Please set REACT_APP_CONTRACT_ADDRESS environment variable.');
    }
    
    const isSignerAbi = Docu3.abi.find(abi => abi.name === 'isSigner' && abi.type === 'function');
    if (!isSignerAbi) {
      throw new Error('isSigner function not found in contract ABI');
    }
    
    return [
      {
        chain: 'amoy',
        contractAddress: CONTRACT_ADDRESS,
        functionName: 'isSigner',
        functionParams: [':userAddress', docId.toString()],
        functionAbi: isSignerAbi,
        returnValueTest: {
          comparator: '==',
          value: true,
        },
        standardContractType: '',
      }
    ];
  }

  async encryptFile(file, docId, uploaderAddress, signerAddresses) {
    if (!this.litNodeClient) {
      await this.connect();
    }

    try {
      const authSig = await this.getAuthSig();
      const accessControlConditions = this.createAccessControlConditions(docId);
      
      const fileBuffer = await file.arrayBuffer();
      const fileString = new TextDecoder().decode(fileBuffer);

      const { encryptedString, symmetricKey } = await encryptString(
        {
          accessControlConditions,
          dataToEncrypt: fileString,
          authSig,
          chain: 'amoy',
        },
        this.litNodeClient
      );

      const encryptedSymmetricKey = await this.litNodeClient.saveEncryptionKey({
        accessControlConditions,
        symmetricKey,
        authSig,
        chain: 'amoy',
      });

      return {
        encryptedFile: await blobToBase64String(encryptedString),
        encryptedSymmetricKey: uint8arrayToString(
          encryptedSymmetricKey,
          'base16'
        ),
        accessControlConditions
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message || error.toString()}`);
    }
  }

  async decryptFile(encryptedFileBase64, encryptedSymmetricKey, accessControlConditions, docId) {
    if (!this.litNodeClient) {
      await this.connect();
    }

    try {
      const authSig = await this.getAuthSig();

      const symmetricKey = await this.litNodeClient.getEncryptionKey({
        accessControlConditions,
        toDecrypt: encryptedSymmetricKey,
        chain: 'amoy',
        authSig,
      });

      const decryptedString = await decryptString(
        base64StringToBlob(encryptedFileBase64),
        symmetricKey
      );

      return new TextEncoder().encode(decryptedString);
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message || error.toString()}`);
    }
  }

  async checkAccess(docId, userAddress) {
    if (!window.ethereum) {
      return false;
    }
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3.abi, provider);
      
      const [, creator, signers] = await contract.getDocument(docId);
      
      const isCreator = creator.toLowerCase() === userAddress.toLowerCase();
      const isSigner = signers.some(signer => signer.toLowerCase() === userAddress.toLowerCase());
      
      return isCreator || isSigner;
    } catch (error) {
      return false;
    }
  }
}

let _litProtocolService = null;

export const litProtocolService = {
  get instance() {
    if (!_litProtocolService) {
      _litProtocolService = new LitProtocolService();
    }
    return _litProtocolService;
  }
}; 