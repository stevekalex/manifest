import { RemoteCDNClient } from '../services/cdn/RemoteCDNClient';
import * as cacheUtils from '../services/cdn/cacheUtils';

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/documents/',
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  downloadAsync: jest.fn(),
}));

// Mock cache utilities
jest.mock('../services/cdn/cacheUtils', () => ({
  isTrackCached: jest.fn(),
  getCachedFilePath: jest.fn(),
  downloadToCache: jest.fn(),
  ensureCacheDirectoryExists: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('RemoteCDNClient', () => {
  let client: RemoteCDNClient;
  const mockConfig = {
    baseUrl: 'https://gentle-poetry-33dd.stevekalex.workers.dev',
    cloudflareKey: 'test-key-123',
    concurrency: 2
  };

  beforeEach(() => {
    jest.clearAllMocks();
    client = new RemoteCDNClient(mockConfig);
  });

  describe('constructor', () => {
    test('should initialize with config', () => {
      expect(client).toBeDefined();
      expect(client.getStats().manifestLoaded).toBe(false);
    });

    test('should use default concurrency if not provided', () => {
      const clientWithDefaults = new RemoteCDNClient({
        baseUrl: 'https://example.com',
        cloudflareKey: 'key'
      });
      expect(clientWithDefaults).toBeDefined();
    });
  });

  describe('loadManifest', () => {
    test('should load static manifest', async () => {
      const manifest = await client.loadManifest();
      
      expect(manifest).toBeDefined();
      expect(manifest.version).toBe('1.0.0');
      expect(manifest.voices).toEqual([]);
      expect(client.getStats().manifestLoaded).toBe(true);
    });

    test('should return cached manifest on subsequent calls', async () => {
      const manifest1 = await client.loadManifest();
      const manifest2 = await client.loadManifest();
      
      expect(manifest1).toBe(manifest2);
    });
  });

  describe('constructCloudflareUrl', () => {
    test('should construct correct URL for valid track ID', async () => {
      // Access private method via any cast for testing
      const url = (client as any).constructCloudflareUrl('serenity:affirmation-0');
      
      expect(url).toBe('https://gentle-poetry-33dd.stevekalex.workers.dev/serenity/0-hq.mp3?k=test-key-123');
    });

    test('should construct URL for different voices and indices', async () => {
      const url1 = (client as any).constructCloudflareUrl('titan:affirmation-5');
      const url2 = (client as any).constructCloudflareUrl('serenity:affirmation-12');
      
      expect(url1).toBe('https://gentle-poetry-33dd.stevekalex.workers.dev/titan/5-hq.mp3?k=test-key-123');
      expect(url2).toBe('https://gentle-poetry-33dd.stevekalex.workers.dev/serenity/12-hq.mp3?k=test-key-123');
    });

    test('should throw error for invalid track ID format', () => {
      expect(() => {
        (client as any).constructCloudflareUrl('invalid-format');
      }).toThrow('Invalid track ID format');
    });

    test('should throw error for invalid affirmation ID format', () => {
      expect(() => {
        (client as any).constructCloudflareUrl('serenity:invalid-id');
      }).toThrow('Invalid affirmation ID format');
    });
  });

  describe('isAvailable', () => {
    test('should return true for valid track IDs', () => {
      expect(client.isAvailable('serenity:affirmation-0')).toBe(true);
      expect(client.isAvailable('titan:affirmation-5')).toBe(true);
    });

    test('should return false for invalid track IDs', () => {
      expect(client.isAvailable('invalid:format')).toBe(false);
      expect(client.isAvailable('serenity:not-affirmation')).toBe(false);
      expect(client.isAvailable('malformed')).toBe(false);
    });
  });

  describe('getPlayableUrl', () => {
    test('should return cached path if track is cached', async () => {
      const trackId = 'serenity:affirmation-0';
      const cachedPath = '/cache/serenity_affirmation-0.mp3';
      
      (cacheUtils.isTrackCached as jest.Mock).mockResolvedValue(true);
      (cacheUtils.getCachedFilePath as jest.Mock).mockResolvedValue(cachedPath);
      
      const result = await client.getPlayableUrl(trackId);
      
      expect(result).toBe(cachedPath);
      expect(cacheUtils.isTrackCached).toHaveBeenCalledWith(trackId);
      expect(client.getStats().successfulRequests).toBe(1);
    });

    test('should download and cache if not cached', async () => {
      const trackId = 'serenity:affirmation-0';
      const downloadedPath = '/cache/serenity_affirmation-0.mp3';
      
      (cacheUtils.isTrackCached as jest.Mock).mockResolvedValue(false);
      (cacheUtils.downloadToCache as jest.Mock).mockResolvedValue(downloadedPath);
      
      const result = await client.getPlayableUrl(trackId);
      
      expect(result).toBe(downloadedPath);
      expect(cacheUtils.downloadToCache).toHaveBeenCalledWith(
        'https://gentle-poetry-33dd.stevekalex.workers.dev/serenity/0-hq.mp3?k=test-key-123',
        trackId
      );
      expect(client.getStats().successfulRequests).toBe(1);
    });

    test('should handle download errors gracefully', async () => {
      const trackId = 'serenity:affirmation-0';
      
      (cacheUtils.isTrackCached as jest.Mock).mockResolvedValue(false);
      (cacheUtils.downloadToCache as jest.Mock).mockRejectedValue(new Error('Download failed'));
      
      await expect(client.getPlayableUrl(trackId)).rejects.toThrow();
      expect(client.getStats().failedRequests).toBe(1);
      expect(client.getStats().lastError).toBeDefined();
    });
  });

  describe('prefetch', () => {
    test('should do nothing for empty track list', async () => {
      await client.prefetch([]);
      
      expect(cacheUtils.ensureCacheDirectoryExists).not.toHaveBeenCalled();
    });

    test('should skip already cached tracks', async () => {
      const trackIds = ['serenity:affirmation-0', 'serenity:affirmation-1'];
      
      (cacheUtils.isTrackCached as jest.Mock)
        .mockResolvedValueOnce(true)  // First track cached
        .mockResolvedValueOnce(false); // Second track not cached
      
      (cacheUtils.downloadToCache as jest.Mock).mockResolvedValue('/cache/path');
      
      await client.prefetch(trackIds);
      
      // Should only download the uncached track
      expect(cacheUtils.downloadToCache).toHaveBeenCalledTimes(1);
      expect(cacheUtils.downloadToCache).toHaveBeenCalledWith(
        'https://gentle-poetry-33dd.stevekalex.workers.dev/serenity/1-hq.mp3?k=test-key-123',
        'serenity:affirmation-1'
      );
    });

    test('should handle download errors during prefetch', async () => {
      const trackIds = ['serenity:affirmation-0'];
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      (cacheUtils.isTrackCached as jest.Mock).mockResolvedValue(false);
      (cacheUtils.downloadToCache as jest.Mock).mockRejectedValue(new Error('Download failed'));
      
      // Should not throw error
      await expect(client.prefetch(trackIds)).resolves.toBeUndefined();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to prefetch'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    test('should respect concurrency limits', async () => {
      // Create client with concurrency of 2
      const clientWithConcurrency = new RemoteCDNClient({
        ...mockConfig,
        concurrency: 2
      });
      
      const trackIds = [
        'serenity:affirmation-0',
        'serenity:affirmation-1',
        'serenity:affirmation-2',
        'serenity:affirmation-3'
      ];
      
      (cacheUtils.isTrackCached as jest.Mock).mockResolvedValue(false);
      (cacheUtils.downloadToCache as jest.Mock).mockResolvedValue('/cache/path');
      
      await clientWithConcurrency.prefetch(trackIds);
      
      // All tracks should be downloaded
      expect(cacheUtils.downloadToCache).toHaveBeenCalledTimes(4);
    });
  });

  describe('getStats', () => {
    test('should return stats object', () => {
      const stats = client.getStats();
      
      expect(stats).toEqual({
        manifestLoaded: false,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0
      });
    });

    test('should update stats after operations', async () => {
      const trackId = 'serenity:affirmation-0';
      
      (cacheUtils.isTrackCached as jest.Mock).mockResolvedValue(true);
      (cacheUtils.getCachedFilePath as jest.Mock).mockResolvedValue('/cache/path');
      
      await client.getPlayableUrl(trackId);
      
      const stats = client.getStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.successfulRequests).toBe(1);
    });
  });

  describe('reset', () => {
    test('should reset manifest and stats', async () => {
      // Load manifest and make request to change stats
      await client.loadManifest();
      
      (cacheUtils.isTrackCached as jest.Mock).mockResolvedValue(true);
      (cacheUtils.getCachedFilePath as jest.Mock).mockResolvedValue('/cache/path');
      await client.getPlayableUrl('serenity:affirmation-0');
      
      // Verify stats changed
      expect(client.getStats().manifestLoaded).toBe(true);
      expect(client.getStats().totalRequests).toBe(1);
      
      // Reset and verify
      client.reset();
      
      const stats = client.getStats();
      expect(stats.manifestLoaded).toBe(false);
      expect(stats.totalRequests).toBe(0);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.failedRequests).toBe(0);
    });
  });
});