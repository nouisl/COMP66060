// crypto util unit tests
import {
  formatSignature,
  createVerificationMessage,
  generateDocumentHash,
  signDocumentHash,
  verifySignature,
  generateAndStoreEncryptedKey,
  getEncryptedPrivateKey,
  getDecryptedPrivateKey
} from '../../utils/crypto';
import { ethers } from 'ethers';

describe('Crypto Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

// tests for the formatSignature utility
describe('formatSignature', () => {
    test('formats signature correctly', () => {
      const signature = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678901c';
      const formatted = formatSignature(signature);
      
      expect(formatted).toBe('0xabcdef12...5678901c');
      expect(formatted.length).toBeLessThan(signature.length);
    });

    test('handles short signatures', () => {
      const signature = '0x1234567890abcdef';
      
      const formatted = formatSignature(signature);
      
      expect(formatted).toBe('0x12345678...90abcdef');
    });

    test('handles empty signature', () => {
      const signature = '';
      
      const formatted = formatSignature(signature);
      
      expect(formatted).toBe('No signature');
    });
  });

  // tests for the createVerificationMessage utility
// builds a human-readable message that includes hash, signer and signature
describe('createVerificationMessage', () => {
    test('creates verification message', () => {
      const documentHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const signerAddress = '0x1234567890123456789012345678901234567890';
      const signature = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678901c';
      
      const message = createVerificationMessage(documentHash, signerAddress, signature);
      
      expect(message).toContain('Document Hash:');
      expect(message).toContain('Signer:');
      expect(message).toContain('Signature:');
      expect(message).toContain(documentHash);
      expect(message).toContain(signerAddress);
      expect(message).toContain(signature);
    });
  });

  describe('generateDocumentHash (deterministic for ipfsHash path)', () => {
    test('returns keccak256 of ipfsHash string', async () => {
      const ipfsHash = 'QmTestHash123';
      const expected = ethers.keccak256(ethers.toUtf8Bytes(ipfsHash));
      const result = await generateDocumentHash({}, ipfsHash);
      expect(result).toBe(expected);
    });
  });


  describe('sign/verify roundtrip', () => {
    test('signature verifies to signer address', async () => {
      const privateKey = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
      const wallet = new ethers.Wallet(privateKey);
      const ipfsHash = 'QmAnotherHash456';
      const docHash = await generateDocumentHash({}, ipfsHash);
      const signature = await signDocumentHash(docHash, wallet);
      const ok = verifySignature(docHash, signature, wallet.address);

      expect(ok).toBe(true);
    });
  });

  describe('encrypted private key lifecycle', () => {
    test('generate -> store -> getEncrypted -> decrypt succeeds with correct passphrase', async () => {
      const passphrase = 'correct horse battery staple';
      const user = '0xAbC0000000000000000000000000000000000000';
      const { publicKey, encryptedPrivateKey } = await generateAndStoreEncryptedKey(passphrase, user);
      expect(publicKey).toBeTruthy();
      expect(typeof encryptedPrivateKey).toBe('string');
      expect(getEncryptedPrivateKey(user)).toBe(encryptedPrivateKey);
      const decrypted = await getDecryptedPrivateKey(user, passphrase);
      expect(decrypted).toMatch(/^0x[0-9a-fA-F]+$/);
    });

    test('decrypt throws with wrong passphrase', async () => {
      const user = '0xAbC0000000000000000000000000000000000000';
      await generateAndStoreEncryptedKey('right', user);
      await expect(getDecryptedPrivateKey(user, 'wrong')).rejects.toThrow(/Decryption failed|Malformed UTF-8 data/i);
    });
  });
}); 