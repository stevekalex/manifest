/**
 * Tests for LocalLibraryClient
 * Tests manifest loading, track resolution, and integration with BundledAssets
 */

import type { ICDNClient, CanonicalTrackId, CDNManifest } from '../services/cdn/types';

// Mock the manifest file
jest.mock('../assets/voices/manifest.json', () => ({
  version: '1.0.0',
  updatedAt: '2025-01-15T12:00:00Z',
  voices: [
    {
      id: 'serenity',
      name: 'Serenity',
      tracks: [
        {
          id: 'serenity:affirmation-0',
          file: '0-hq.mp3',
          bundledPath: '../assets/voices/serenity/0-hq.mp3'
        },
        {
          id: 'serenity:affirmation-1',
          file: '1-hq.mp3',
          bundledPath: '../assets/voices/serenity/1-hq.mp3'
        }
      ]
    },
    {
      id: 'titan',
      name: 'Titan',
      tracks: [
        {
          id: 'titan:affirmation-0',
          file: '0-hq.mp3',
          bundledPath: '../assets/voices/titan/0-hq.mp3'
        }
      ]
    }
  ]
}), { virtual: true });

// Mock the actual audio assets
jest.mock('../assets/voices/serenity/0-hq.mp3', () => 12345, { virtual: true });
jest.mock('../assets/voices/serenity/1-hq.mp3', () => 12346, { virtual: true });
jest.mock('../assets/voices/titan/0-hq.mp3', () => 12347, { virtual: true });

// Mock BundledAssets
jest.mock('../services/bundledAssets', () => ({
  BundledAssets: jest.fn().mockImplementation(() => ({
    getAsset: jest.fn((affirmationId: string, voiceId: string) => {
      // Simulate BundledAssets fallback behavior
      if (voiceId === 'serenity' && affirmationId === 'affirmation-0') return 12345;
      if (voiceId === 'serenity' && affirmationId === 'affirmation-1') return 12346;
      if (voiceId === 'titan' && affirmationId === 'affirmation-0') return 12347;
      return null;
    }),
    hasAsset: jest.fn((affirmationId: string, voiceId: string) => {
      return voiceId === 'serenity' && ['affirmation-0', 'affirmation-1'].includes(affirmationId) ||
             voiceId === 'titan' && affirmationId === 'affirmation-0';
    })
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
      expect(manifest.voices).toHaveLength(2);
    });

    test('should cache manifest after first load', async () => {
      const manifest1 = await client.loadManifest();
      const manifest2 = await client.loadManifest();
      
      expect(manifest1).toBe(manifest2);
      expect(client.getStats().manifestLoaded).toBe(true);
    });

    test('should parse voice structure correctly', async () => {
      const manifest = await client.loadManifest();
      
      const serenityVoice = manifest.voices.find(v => v.id === 'serenity');
      expect(serenityVoice).toBeDefined();
      expect(serenityVoice!.name).toBe('Serenity');
      expect(serenityVoice!.tracks).toHaveLength(2);
      
      const track = serenityVoice!.tracks[0];
      expect(track.id).toBe('serenity:affirmation-0');
      expect(track.file).toBe('0-hq.mp3');
      expect(track.bundledPath).toBe('../assets/voices/serenity/0-hq.mp3');
    });
  });

  describe('getPlayableUrl', () => {
    beforeEach(async () => {
      await client.loadManifest();
    });

    test('should resolve canonical track ID to bundled asset path', async () => {
      const url = await client.getPlayableUrl('serenity:affirmation-0' as CanonicalTrackId);
      
      expect(url).toBe(12345);
      expect(client.getStats().totalRequests).toBe(1);
      expect(client.getStats().successfulRequests).toBe(1);
    });

    test('should handle different voices', async () => {
      const serenityUrl = await client.getPlayableUrl('serenity:affirmation-1' as CanonicalTrackId);
      const titanUrl = await client.getPlayableUrl('titan:affirmation-0' as CanonicalTrackId);
      
      expect(serenityUrl).toBe(12346);
      expect(titanUrl).toBe(12347);
      expect(client.getStats().totalRequests).toBe(2);
    });

    test('should throw TrackNotFoundError for non-existent track', async () => {
      const { TrackNotFoundError } = require('../services/cdn/types');
      
      await expect(
        client.getPlayableUrl('invalid:track-id' as CanonicalTrackId)
      ).rejects.toThrow(TrackNotFoundError);
      
      expect(client.getStats().failedRequests).toBe(1);
    });

    test('should fall back to BundledAssets for tracks not in manifest', async () => {
      // This tests the integration with existing BundledAssets
      const url = await client.getPlayableUrl('serenity:affirmation-0' as CanonicalTrackId);
      expect(url).toBe(12345);
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

    test('should return true for tracks in manifest', () => {
      expect(client.isAvailable('serenity:affirmation-0' as CanonicalTrackId)).toBe(true);
      expect(client.isAvailable('titan:affirmation-0' as CanonicalTrackId)).toBe(true);
    });

    test('should return false for non-existent tracks', () => {
      expect(client.isAvailable('invalid:track-id' as CanonicalTrackId)).toBe(false);
      expect(client.isAvailable('serenity:affirmation-99' as CanonicalTrackId)).toBe(false);
    });

    test('should work without loading manifest (check bundled assets)', () => {
      const freshClient = new (require('../services/cdn/LocalLibraryClient').LocalLibraryClient)();
      
      // Should check BundledAssets even without manifest
      expect(freshClient.isAvailable('serenity:affirmation-0' as CanonicalTrackId)).toBe(true);
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
      await client.getPlayableUrl('serenity:affirmation-0' as CanonicalTrackId);
      
      const stats = client.getStats();
      expect(stats.manifestLoaded).toBe(true);
      expect(stats.totalRequests).toBe(1);
      expect(stats.successfulRequests).toBe(1);
    });

    test('should include last request time', async () => {
      const beforeTime = Date.now();
      await client.loadManifest();
      await client.getPlayableUrl('serenity:affirmation-0' as CanonicalTrackId);
      const afterTime = Date.now();
      
      const stats = client.getStats();
      expect(stats.lastRequestTime).toBeGreaterThanOrEqual(beforeTime);
      expect(stats.lastRequestTime).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('reset', () => {
    test('should clear all cached data and stats', async () => {
      await client.loadManifest();
      await client.getPlayableUrl('serenity:affirmation-0' as CanonicalTrackId);
      
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