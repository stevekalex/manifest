import { StorageService, storageUtils } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage');

describe('StorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setItem', () => {
    it('should store item as JSON string', async () => {
      const testData = { name: 'test', value: 123 };
      const key = 'test-key';

      await StorageService.setItem(key, testData);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        key,
        JSON.stringify(testData)
      );
    });

    it('should handle storage errors', async () => {
      const mockError = new Error('Storage failed');
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(mockError);

      await expect(StorageService.setItem('key', 'value')).rejects.toThrow(
        'Storage failed'
      );
    });
  });

  describe('getItem', () => {
    it('should retrieve and parse JSON data', async () => {
      const testData = { name: 'test', value: 123 };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(testData)
      );

      const result = await StorageService.getItem('test-key');

      expect(result).toEqual(testData);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('test-key');
    });

    it('should return null for non-existent items', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await StorageService.getItem('non-existent');

      expect(result).toBeNull();
    });

    it('should handle parse errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json');

      const result = await StorageService.getItem('test-key');

      expect(result).toBeNull();
    });
  });

  describe('removeItem', () => {
    it('should remove item from storage', async () => {
      await StorageService.removeItem('test-key');

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('test-key');
    });
  });

  describe('clear', () => {
    it('should clear all storage', async () => {
      await StorageService.clear();

      expect(AsyncStorage.clear).toHaveBeenCalled();
    });
  });
});

describe('storageUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setCachedData and getCachedData', () => {
    it('should store and retrieve cached data', async () => {
      // Reset mock before test
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      
      const testData = { result: 'cached data' };
      const key = 'test-cache';

      await storageUtils.setCachedData(key, testData, 60);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        `cache_${key}`,
        expect.stringContaining('"data":{"result":"cached data"}')
      );

      // Mock the cached item retrieval
      const cachedItem = {
        data: testData,
        expiration: Date.now() + 60 * 60 * 1000,
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(cachedItem)
      );

      const result = await storageUtils.getCachedData(key);
      expect(result).toEqual(testData);
    });

    it('should return null for expired cached data', async () => {
      const expiredItem = {
        data: { result: 'expired data' },
        expiration: Date.now() - 1000, // Expired 1 second ago
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(expiredItem)
      );

      const result = await storageUtils.getCachedData('expired-key');

      expect(result).toBeNull();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('cache_expired-key');
    });

    it('should return null for non-existent cached data', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await storageUtils.getCachedData('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('clearExpiredCache', () => {
    it('should remove expired cache entries', async () => {
      const mockKeys = ['cache_valid', 'cache_expired', 'other_key'];
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(mockKeys);

      const validItem = {
        data: 'valid',
        expiration: Date.now() + 60000,
      };
      const expiredItem = {
        data: 'expired',
        expiration: Date.now() - 60000,
      };

      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(validItem))
        .mockResolvedValueOnce(JSON.stringify(expiredItem));

      await storageUtils.clearExpiredCache();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('cache_expired');
      expect(AsyncStorage.removeItem).not.toHaveBeenCalledWith('cache_valid');
    });
  });
});