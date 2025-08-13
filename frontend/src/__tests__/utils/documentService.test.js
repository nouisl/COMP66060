// mock ethers before importing the module under test
jest.mock('ethers', () => ({
  ethers: {
    BrowserProvider: jest.fn(),
    Contract: jest.fn()
  }
}));

import { ethers as mockedEthers } from 'ethers';

// import after mocks are set up
import { documentService } from '../../utils/documentService';

const makeContractMock = ({
  documentCount = 3,
  docs = {},
  hasSignedResults = {}
} = {}) => {
  const documentCountFn = jest.fn().mockResolvedValue(documentCount);
  const getDocumentFn = jest.fn(async (id) => {
    const def = docs[id];
    if (!def) throw new Error('Not found');
    return [
      def.ipfsHash,
      def.creator,
      def.signers,
      def.createdAt,
      def.signatureCount,
      def.fullySigned,
      def.isRevoked
    ];
  });
  const hasSignedFn = jest.fn(async (docId, account) => {
    const key = `${docId}:${account.toLowerCase()}`;
    return hasSignedResults[key] ?? false;
  });

  const contractMock = { documentCount: documentCountFn, getDocument: getDocumentFn, hasSigned: hasSignedFn };
  mockedEthers.Contract.mockImplementation(() => contractMock);
  mockedEthers.BrowserProvider.mockImplementation(() => ({ provider: 'mock' }));
  return { documentCountFn, getDocumentFn, hasSignedFn, contractMock };
};

describe('documentService', () => {
  const user = '0xUser000000000000000000000000000000000000';
  const creator = '0xCreator00000000000000000000000000000000';

  beforeEach(() => {
    jest.clearAllMocks();
    documentService.clearCache();
  });

  test('getDocumentsForUser returns only relevant, non-revoked, non-empty docs and maps fields', async () => {
    const docs = {
      1: { ipfsHash: 'Qm1', creator, signers: ['0xSignerA', user], createdAt: 111, signatureCount: 1, fullySigned: false, isRevoked: false },
      2: { ipfsHash: 'Qm2', creator, signers: ['0xSignerB'], createdAt: 222, signatureCount: 0, fullySigned: false, isRevoked: true }, // revoked -> skip
      3: { ipfsHash: 'Qm3', creator: user, signers: ['0xSignerX'], createdAt: 333, signatureCount: 2, fullySigned: true, isRevoked: false },
      4: { ipfsHash: '', creator, signers: [user], createdAt: 444, signatureCount: 0, fullySigned: false, isRevoked: false } // empty -> skip
    };
    makeContractMock({ documentCount: 4, docs });

    const result = await documentService.getDocumentsForUser(user);

    expect(result).toHaveLength(2);
    // doc 1
    expect(result.find(d => d.docId === 1)).toMatchObject({
      ipfsHash: 'Qm1', creator, createdAt: 111, signatureCount: 1, fullySigned: false, isRevoked: false
    });
    // doc 3
    expect(result.find(d => d.docId === 3)).toMatchObject({
      ipfsHash: 'Qm3', creator: user, createdAt: 333, signatureCount: 2, fullySigned: true, isRevoked: false
    });
  });

  test('getDocumentsForUser uses cache and clearCache invalidates it', async () => {
    const docs = {
      1: { ipfsHash: 'Qm1', creator, signers: [user], createdAt: 111, signatureCount: 0, fullySigned: false, isRevoked: false },
      2: { ipfsHash: 'Qm2', creator, signers: [], createdAt: 222, signatureCount: 0, fullySigned: false, isRevoked: false }
    };
    const { documentCountFn, getDocumentFn } = makeContractMock({ documentCount: 2, docs });

    const first = await documentService.getDocumentsForUser(user);
    expect(first).toHaveLength(1);
    const countCallsAfterFirst = documentCountFn.mock.calls.length;
    const getDocCallsAfterFirst = getDocumentFn.mock.calls.length;

    const second = await documentService.getDocumentsForUser(user);
    expect(second).toEqual(first);
    expect(documentCountFn.mock.calls.length).toBe(countCallsAfterFirst); // no new calls
    expect(getDocumentFn.mock.calls.length).toBe(getDocCallsAfterFirst);

    documentService.clearCache();
    await documentService.getDocumentsForUser(user);
    expect(documentCountFn.mock.calls.length).toBeGreaterThan(countCallsAfterFirst);
  });

  test('getStatsForUser computes pending, signed, and created stats correctly', async () => {
    const docs = {
      1: { ipfsHash: 'Qm1', creator, signers: [user, '0xOther'], createdAt: 111, signatureCount: 1, fullySigned: false, isRevoked: false }, // signer & not fully signed
      2: { ipfsHash: 'Qm2', creator: user, signers: ['0xOther'], createdAt: 222, signatureCount: 2, fullySigned: true, isRevoked: false }, // creator + fully signed
      3: { ipfsHash: 'Qm3', creator, signers: [user], createdAt: 333, signatureCount: 0, fullySigned: false, isRevoked: false } // signer & not fully signed
    };
    const hasSignedResults = {
      [`1:${user.toLowerCase()}`]: false, // pending
      [`3:${user.toLowerCase()}`]: true   // not pending
    };
    makeContractMock({ documentCount: 3, docs, hasSignedResults });

    const stats = await documentService.getStatsForUser(user);

    expect(stats).toEqual({
      totalDocuments: 3, // 3 returned docs (no revoked/empty)
      pendingSignatures: 1, // doc 1 only
      signedDocuments: 1,   // doc 2
      createdDocuments: 1   // doc 2
    });
  });
});