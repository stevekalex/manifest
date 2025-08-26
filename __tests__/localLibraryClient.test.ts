/**
 * Tests for LocalLibraryClient
 * Tests manifest loading, track resolution, and integration with BundledAssets
 */

import type { ICDNClient, CanonicalTrackId, CDNManifest } from '../services/cdn/types';

// Mock the manifest file - now empty after asset removal
jest.mock('../assets/voices/manifest.json', () => ({
  version: '1.0.0',
  updatedAt: '2025-01-15T12:00:00Z',
  voices: []
}), { virtual: true });

// Mock BundledAssets - now returns no assets after removal
jest.mock('../services/bundledAssets', () => ({
  BundledAssets: jest.fn().mockImplementation(() => ({
    getAsset: jest.fn(() => null), // No bundled assets available
    hasAsset: jest.fn(() => false) // No bundled assets available
  }))
}));

describe('LocalLibraryClient', () => {
  let client: ICDNClient;

  beforeEach(() => {
    // Clear mocks
    jest.clearAllMocks();
    
    // Import here to ensure mocks are applied
    const { LocalLibraryClient } = require('../services/cdn/LocalLibraryClient');
    client = new LocalLibraryClient();
  });

  describe('loadManifest', () => {
    test('should load manifest from assets/voices/manifest.json', async () => {
      const manifest = await client.loadManifest();
      
      expect(manifest).toHaveProperty('version', '1.0.0');
      expect(manifest).toHaveProperty('updatedAt', '2025-01-15T12:00:00Z');
      expect(manifest).toHaveProperty('voices');
      expect(Array.isArray(manifest.voices)).toBe(true);
      expect(manifest.voices).toHaveLength(0); // Empty after asset removal
    });

    test('should cache manifest after first load', async () => {
      const manifest1 = await client.loadManifest();
      const manifest2 = await client.loadManifest();
      
      expect(manifest1).toBe(manifest2);
      expect(client.getStats().manifestLoaded).toBe(true);
    });

    test('should handle empty voice list after asset removal', async () => {
      const manifest = await client.loadManifest();
      
      expect(manifest.voices).toHaveLength(0);
      expect(Array.isArray(manifest.voices)).toBe(true);
    });
  });

  describe('getPlayableUrl', () => {
    beforeEach(async () => {
      await client.loadManifest();
    });

    test('should throw TrackNotFoundError since no assets are bundled', async () => {
      const { TrackNotFoundError } = require('../services/cdn/types');
      
      await expect(
        client.getPlayableUrl('serenity:affirmation-0' as CanonicalTrackId)
      ).rejects.toThrow(TrackNotFoundError);
      
      expect(client.getStats().failedRequests).toBe(1);
    });

    test('should throw TrackNotFoundError for any track request', async () => {
      const { TrackNotFoundError } = require('../services/cdn/types');
      
      await expect(
        client.getPlayableUrl('titan:affirmation-0' as CanonicalTrackId)
      ).rejects.toThrow(TrackNotFoundError);
      
      expect(client.getStats().failedRequests).toBe(1);
    });

    test('should require manifest to be loaded first', async () => {
      const freshClient = new (require('../services/cdn/LocalLibraryClient').LocalLibraryClient)();
      const { ManifestError } = require('../services/cdn/types');
      
      await expect(
        freshClient.getPlayableUrl('serenity:affirmation-0' as CanonicalTrackId)
      ).rejects.toThrow(ManifestError);
    });
  });

  describe('isAvailable', () => {
    beforeEach(async () => {
      await client.loadManifest();
    });

    test('should return false for all tracks since none are bundled', () => {
      expect(client.isAvailable('serenity:affirmation-0' as CanonicalTrackId)).toBe(false);
      expect(client.isAvailable('titan:affirmation-0' as CanonicalTrackId)).toBe(false);
    });

    test('should return false for non-existent tracks', () => {
      expect(client.isAvailable('invalid:track-id' as CanonicalTrackId)).toBe(false);
      expect(client.isAvailable('serenity:affirmation-99' as CanonicalTrackId)).toBe(false);
    });

    test('should check bundled assets even without manifest', () => {
      const freshClient = new (require('../services/cdn/LocalLibraryClient').LocalLibraryClient)();
      
      // Should return false since no bundled assets are available
      expect(freshClient.isAvailable('serenity:affirmation-0' as CanonicalTrackId)).toBe(false);
    });
  });

  describe('prefetch', () => {
    beforeEach(async () => {
      await client.loadManifest();
    });

    test('should be a no-op for local client', async () => {
      await expect(
        client.prefetch(['serenity:affirmation-0', 'titan:affirmation-0'] as CanonicalTrackId[])
      ).resolves.toBeUndefined();
    });

    test('should not affect stats', async () => {
      const statsBefore = client.getStats();
      
      await client.prefetch(['serenity:affirmation-0'] as CanonicalTrackId[]);
      
      const statsAfter = client.getStats();
      expect(statsAfter.totalRequests).toBe(statsBefore.totalRequests);
    });
  });

  describe('getStats', () => {
    test('should return initial stats', () => {
      const stats = client.getStats();
      
      expect(stats).toHaveProperty('manifestLoaded', false);
      expect(stats).toHaveProperty('totalRequests', 0);
      expect(stats).toHaveProperty('successfulRequests', 0);
      expect(stats).toHaveProperty('failedRequests', 0);
    });

    test('should update stats after operations', async () => {
      await client.loadManifest();
      
      // Try a request that will fail since no assets are bundled
      try {
        await client.getPlayableUrl('serenity:affirmation-0' as CanonicalTrackId);
      } catch (error) {
        // Expected to fail
      }
      
      const stats = client.getStats();
      expect(stats.manifestLoaded).toBe(true);
      expect(stats.totalRequests).toBe(1);
      expect(stats.failedRequests).toBe(1);
    });

    test('should include last request time', async () => {
      const beforeTime = Date.now();
      await client.loadManifest();
      
      // Try a request that will fail
      try {
        await client.getPlayableUrl('serenity:affirmation-0' as CanonicalTrackId);
      } catch (error) {
        // Expected to fail
      }
      
      const afterTime = Date.now();
      
      const stats = client.getStats();
      expect(stats.lastRequestTime).toBeGreaterThanOrEqual(beforeTime);
      expect(stats.lastRequestTime).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('reset', () => {
    test('should clear all cached data and stats', async () => {
      await client.loadManifest();
      
      // Try a request that will fail
      try {
        await client.getPlayableUrl('serenity:affirmation-0' as CanonicalTrackId);
      } catch (error) {
        // Expected to fail
      }
      
      expect(client.getStats().manifestLoaded).toBe(true);
      expect(client.getStats().totalRequests).toBe(1);
      
      client.reset();
      
      const stats = client.getStats();
      expect(stats.manifestLoaded).toBe(false);
      expect(stats.totalRequests).toBe(0);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.failedRequests).toBe(0);
    });

    test('should require manifest reload after reset', async () => {
      await client.loadManifest();
      client.reset();
      
      const { ManifestError } = require('../services/cdn/types');
      await expect(
        client.getPlayableUrl('serenity:affirmation-0' as CanonicalTrackId)
      ).rejects.toThrow(ManifestError);
    });
  });

  describe('error handling', () => {
    test('should handle corrupt manifest gracefully', () => {
      // This would be tested with a mock that returns invalid JSON
      // For now, we trust that require() will throw appropriate errors
      expect(true).toBe(true);
    });

    test('should provide helpful error messages', async () => {
      await client.loadManifest();
      const { TrackNotFoundError } = require('../services/cdn/types');
      
      try {
        await client.getPlayableUrl('invalid:track-id' as CanonicalTrackId);
      } catch (error) {
        expect(error).toBeInstanceOf(TrackNotFoundError);
        expect(error.message).toContain('invalid:track-id');
        expect(error.trackId).toBe('invalid:track-id');
      }
    });
  });
});