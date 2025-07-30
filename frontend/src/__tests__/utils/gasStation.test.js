import { fetchGasPrices, testGasStation, getGasConfig } from '../../utils/gasStation';

jest.mock('ethers', () => ({
  ethers: {
    parseUnits: jest.fn().mockReturnValue('1000000000')
  }
}));

global.fetch = jest.fn();

describe('Gas Station Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchGasPrices', () => {
    test('should fetch gas prices successfully', async () => {
      const mockResponse = {
        safeLow: { maxPriorityFee: 1.5, maxFee: 30 },
        standard: { maxPriorityFee: 2, maxFee: 35 },
        fast: { maxPriorityFee: 3, maxFee: 40 },
        estimatedBaseFee: 25,
        blockTime: 2,
        blockNumber: 12345
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await fetchGasPrices();

      expect(result).toEqual({
        safeLow: { maxPriorityFee: 1.5, maxFee: 30 },
        standard: { maxPriorityFee: 2, maxFee: 35 },
        fast: { maxPriorityFee: 3, maxFee: 40 },
        estimatedBaseFee: 25,
        blockTime: 2,
        blockNumber: 12345
      });
    });

    test('should handle API error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await expect(fetchGasPrices()).rejects.toThrow('Gas station API error: 500');
    });

    test('should handle invalid response format', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'data' })
      });

      await expect(fetchGasPrices()).rejects.toThrow('Invalid gas station response format: missing speed tiers');
    });
  });

  describe('testGasStation', () => {
    test('should return success when API is working', async () => {
      const mockResponse = {
        safeLow: { maxPriorityFee: 1.5, maxFee: 30 },
        standard: { maxPriorityFee: 2, maxFee: 35 },
        fast: { maxPriorityFee: 3, maxFee: 40 }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await testGasStation();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Gas station API is working correctly');
      expect(result.data).toBeDefined();
    });

    test('should return failure when API is not accessible', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await testGasStation();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Gas station API is not accessible');
      expect(result.error).toBe('Failed to fetch gas prices: Network error');
    });
  });

  describe('getGasConfig', () => {
    const mockGasPrices = {
      safeLow: { maxPriorityFee: 1.5, maxFee: 30 },
      standard: { maxPriorityFee: 2, maxFee: 35 },
      fast: { maxPriorityFee: 3, maxFee: 40 }
    };

    test('should throw error for invalid gas prices object', () => {
      expect(() => getGasConfig(null)).toThrow('Invalid gas prices object');
      expect(() => getGasConfig('invalid')).toThrow('Invalid gas prices object');
    });

    test('should throw error for invalid speed', () => {
      expect(() => getGasConfig(mockGasPrices, 'invalid')).toThrow('Invalid gas speed: invalid');
    });

    test('should throw error for invalid gas values', () => {
      const invalidGasPrices = {
        standard: { maxPriorityFee: -1, maxFee: 35 }
      };

      expect(() => getGasConfig(invalidGasPrices, 'standard')).toThrow('Invalid gas values for speed standard: maxFee=35, maxPriorityFee=-1');
    });
  });
}); 