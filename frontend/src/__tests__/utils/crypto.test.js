// crypto utilities unit tests
// tests ensure helper functions work as expected and edge cases are handled
import {
  formatSignature,
  createVerificationMessage
} from '../../utils/crypto';

describe('Crypto Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // tests for the formatSignature utility
// ensures signature strings are shortened correctly
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
}); 