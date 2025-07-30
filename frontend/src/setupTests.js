import '@testing-library/jest-dom';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

Object.defineProperty(window, 'crypto', {
  writable: true,
  value: {
    subtle: {
      digest: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])),
      generateKey: jest.fn().mockResolvedValue({
        exportKey: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))
      }),
      encrypt: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      importKey: jest.fn().mockResolvedValue({}),
      decrypt: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      exportKey: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))
    },
    getRandomValues: jest.fn().mockReturnValue(new Uint8Array(12).fill(1))
  }
});

Object.defineProperty(global, 'localStorage', {
  writable: true,
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  }
});

jest.mock('@web3uikit/core', () => ({
  useNotification: () => ({
    dispatch: jest.fn()
  })
}));

jest.mock('ethers', () => {
  const mockEthers = {
    keccak256: jest.fn().mockReturnValue('0xhash'),
    toUtf8Bytes: jest.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
    getBytes: jest.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
    verifyMessage: jest.fn().mockReturnValue('0x1234567890123456789012345678901234567890'),
    isHexString: jest.fn().mockReturnValue(true),
    ZeroAddress: '0x0000000000000000000000000000000000000000',
    BrowserProvider: jest.fn(),
    Contract: jest.fn()
  };
  
  return {
    ethers: mockEthers,
    ...mockEthers
  };
}); 