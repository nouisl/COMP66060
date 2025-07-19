import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { ethers } from 'ethers';
import Docu3 from '../contracts/Docu3.json';

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

if (!CONTRACT_ADDRESS) {
  throw new Error('REACT_APP_CONTRACT_ADDRESS environment variable is not set');
}

class LitProtocolService {
  constructor() {
    this.litNodeClient = null;
    this.connected = false;
  }

  async initialize() {
    if (!this.litNodeClient) {
      this.litNodeClient = new LitNodeClient({
        litNetwork: 'cayenne',
        debug: false
      });
    }
  }

  async connect() {
    await this.initialize();
    if (this.connected) return;
    await this.litNodeClient.connect();
    this.connected = true;
  }

  async getAuthSig(signer) {
    if (!window.ethereum) {
      throw new Error('No wallet found. Please connect your wallet first.');
    }
    
    const chainId = 80002;
    
    const authSig = await this.litNodeClient.signAndSaveAuthMessage({
      chainId,
      expiration: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      resourceAbilityRequests: [
        {
          resource: new Request('https://docu3.app'),
          ability: 'AccessControl'
        }
      ],
      wallet: signer
    });

    return authSig;
  }

  async createAccessControlConditions(docId, uploaderAddress, signerAddresses) {
    return [
      {
        contractAddress: CONTRACT_ADDRESS,
        standardContractType: 'CustomContract',
        chain: 'amoy',
        method: 'isSigner',
        parameters: [':userAddress', docId.toString()],
        returnValueTest: {
          comparator: '=',
          value: 'true'
        }
      }
    ];
  }

  async encryptFile(file, docId, uploaderAddress, signerAddresses) {
    if (!window.ethereum) {
      throw new Error('No wallet found. Please connect your wallet first.');
    }
    
    await this.connect();
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const authSig = await this.getAuthSig(signer);

    const accessControlConditions = await this.createAccessControlConditions(
      docId, 
      uploaderAddress, 
      signerAddresses
    );

    const fileBuffer = await file.arrayBuffer();
    
    const { symmetricKey } = await this.litNodeClient.generateSymmetricKey({
      chain: 'amoy',
      accessControlConditions,
      authSig
    });

    const encryptedFile = await this.litNodeClient.encryptFile({
      file: fileBuffer,
      symmetricKey
    });

    const encryptedSymmetricKey = await this.litNodeClient.saveEncryptionKey({
      accessControlConditions,
      symmetricKey,
      authSig,
      chain: 'amoy'
    });

    return {
      encryptedFile,
      encryptedSymmetricKey: encryptedSymmetricKey,
      accessControlConditions
    };
  }

  async decryptFile(encryptedFile, encryptedSymmetricKey, accessControlConditions, docId) {
    if (!window.ethereum) {
      throw new Error('No wallet found. Please connect your wallet first.');
    }
    
    await this.connect();
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const authSig = await this.getAuthSig(signer);

    const symmetricKey = await this.litNodeClient.getSymmetricKey({
      chain: 'amoy',
      accessControlConditions,
      authSig,
      encryptedSymmetricKey
    });

    const decryptedFile = await this.litNodeClient.decryptFile({
      file: encryptedFile,
      symmetricKey
    });

    return decryptedFile;
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