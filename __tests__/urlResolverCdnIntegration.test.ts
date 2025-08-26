/**
 * Integration tests for URLResolver with CDN client
 * Tests the complete URL resolution flow from TTS placeholders to playable URLs
 */

import { URLResolver } from '../services/urlResolver';
import { BundledAssets } from '../services/bundledAssets';
import { RemoteCDNClient } from '../services/cdn/RemoteCDNClient';
import type { Playlist, VoiceId, AffirmationId } from '../types/audio';
import type { ICDNClient } from '../services/cdn/types';
import * as FileSystem from 'expo-file-system';

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///mock/document/',
  cacheDirectory: 'file:///mock/cache/',
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true, isDirectory: true }),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  readDirectoryAsync: jest.fn().mockResolvedValue([]),
  downloadAsync: jest.fn().mockResolvedValue({ uri: 'file:///mock/cache/file.mp3' }),
  createDownloadResumable: jest.fn(() => ({
    downloadAsync: jest.fn().mockResolvedValue({ uri: 'file:///mock/cache/file.mp3' })
  }))
}));

// Mock bundled assets
jest.mock('../services/bundledAssets', () => ({
  BundledAssets: jest.fn().mockImplementation(() => {
    const assets: Record<string, Record<string, string>> = {
      serenity: {
        'affirmation-0': 'bundled://serenity/0',
        'affirmation-1': 'bundled://serenity/1',
        'affirmation-2': 'bundled://serenity/2'
      },
      titan: {
        'affirmation-0': 'bundled://titan/0',
        'affirmation-1': 'bundled://titan/1'
      }
    };
    
    return {
      getAsset: jest.fn((affirmationId, voiceId) => {
        return assets[voiceId]?.[affirmationId] || null;
      }),
      hasAsset: jest.fn((affirmationId, voiceId) => {
        return !!(assets[voiceId]?.[affirmationId]);
      }),
      getAllAssets: jest.fn().mockReturnValue(assets),
      addAsset: jest.fn(),
      setFallbackVoice: jest.fn()
    };
  })
}));

describe('URLResolver CDN Integration', () => {
  let urlResolver: URLResolver;
  let bundledAssets: BundledAssets;
  let mockCDNClient: ICDNClient;
  let mockPlaylist: Playlist;

  beforeEach(() => {
    jest.clearAllMocks();
    
    bundledAssets = new BundledAssets();
    
    // Create mock CDN client with realistic behavior
    mockCDNClient = {
      loadManifest: jest.fn().mockResolvedValue({
        version: '1.0.0',
        updatedAt: '2025-01-15T12:00:00Z',
        voices: ['serenity', 'titan', 'harmony']
      }),
      getPlayableUrl: jest.fn().mockImplementation(async (trackId) => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 50));
        return `file:///cache/cdn/${trackId}.mp3`;
      }),
      isAvailable: jest.fn().mockImplementation((trackId) => {
        // Only some tracks are cached
        const cachedTracks = [
          'serenity:affirmation-3',
          'serenity:affirmation-4',
          'titan:affirmation-2',
          'harmony:affirmation-0'
        ];
        return cachedTracks.includes(trackId);
      }),
      prefetch: jest.fn().mockResolvedValue(undefined),
      getStats: jest.fn().mockReturnValue({
        manifestLoaded: true,
        totalRequests: 10,
        successfulRequests: 8,
        failedRequests: 2
      }),
      reset: jest.fn()
    };

    urlResolver = new URLResolver(bundledAssets, mockCDNClient);

    // Create test playlist with mixed URL types
    mockPlaylist = {
      id: 'test-playlist',
      name: 'Mixed URL Test Playlist',
      description: 'Tests various URL resolution scenarios',
      backgroundTrackUrl: 12345, // Mock require() value
      defaultVoiceId: 'serenity',
      voices: [
        { id: 'serenity', name: 'Serenity' },
        { id: 'titan', name: 'Titan' },
        { id: 'harmony', name: 'Harmony' }
      ],
      affirmations: Array.from({ length: 10 }, (_, i) => ({
        id: `affirmation-${i}`,
        text: `Test affirmation ${i}`
      })),
      cdnUrls: {
        serenity: {
          'affirmation-0': 100, // Mock bundled require()
          'affirmation-1': 'https://cdn.example.com/serenity/1.mp3',    // Direct CDN URL
          'affirmation-2': 'tts://serenity/affirmation-2',             // TTS placeholder
          'affirmation-3': 'tts://serenity/affirmation-3',             // TTS - available in CDN
          'affirmation-4': 'tts://serenity/affirmation-4',             // TTS - available in CDN
          'affirmation-5': 'tts://serenity/affirmation-5',             // TTS - not in CDN
        },
        titan: {
          'affirmation-0': 'tts://titan/affirmation-0',                // TTS - has bundled fallback
          'affirmation-1': 'tts://titan/affirmation-1',                // TTS - has bundled fallback
          'affirmation-2': 'tts://titan/affirmation-2',                // TTS - available in CDN
          'affirmation-3': 'tts://titan/affirmation-3',                // TTS - no fallback
        },
        harmony: {
          'affirmation-0': 'tts://harmony/affirmation-0',              // TTS - available in CDN
          'affirmation-1': 'tts://harmony/affirmation-1',              // TTS - no bundled, not in CDN
        }
      }
    };
  });

  describe('Single URL resolution', () => {
    test('should resolve bundled require() assets synchronously', () => {
      const result = urlResolver.resolve(mockPlaylist, 'affirmation-0', 'serenity');
      
      // Should return the require() number directly
      expect(typeof result).toBe('number');
      expect(result).toBe(100); // Mock require value
    });

    test('should pass through HTTP/HTTPS URLs unchanged', () => {
      const result = urlResolver.resolve(mockPlaylist, 'affirmation-1', 'serenity');
      
      expect(result).toBe('https://cdn.example.com/serenity/1.mp3');
    });

    test('should resolve TTS placeholder using CDN when available', async () => {
      const result = urlResolver.resolve(mockPlaylist, 'affirmation-3', 'serenity');
      
      // Should return a promise since CDN client is available
      expect(result).toBeInstanceOf(Promise);
      
      const resolvedUrl = await result;
      expect(resolvedUrl).toBe('file:///cache/cdn/serenity:affirmation-3.mp3');
      expect(mockCDNClient.isAvailable).toHaveBeenCalledWith('serenity:affirmation-3');
      expect(mockCDNClient.getPlayableUrl).toHaveBeenCalledWith('serenity:affirmation-3');
    });

    test('should fall back to bundled assets when CDN unavailable', async () => {
      const result = urlResolver.resolve(mockPlaylist, 'affirmation-5', 'serenity');
      
      // Should return a promise
      expect(result).toBeInstanceOf(Promise);
      
      const resolvedUrl = await result;
      // CDN doesn't have it, but serenity has no bundled fallback for affirmation-5
      // So it should use the 'serenity' fallback voice
      expect(resolvedUrl).toBe('bundled://serenity/0'); // Falls back to first available
      expect(mockCDNClient.isAvailable).toHaveBeenCalledWith('serenity:affirmation-5');
    });

    test('should use fallback voice when primary voice unavailable', async () => {
      const result = urlResolver.resolve(mockPlaylist, 'affirmation-3', 'titan');
      
      const resolvedUrl = await result;
      // Titan affirmation-3 not in CDN or bundled, should fall back to serenity
      expect(resolvedUrl).toBe('bundled://serenity/0');
      expect(bundledAssets.getAsset).toHaveBeenCalledWith('affirmation-3', 'titan');
      expect(bundledAssets.getAsset).toHaveBeenCalledWith('affirmation-3', 'serenity');
    });

    test('should throw when no resolution possible', async () => {
      const result = urlResolver.resolve(mockPlaylist, 'affirmation-1', 'harmony');
      
      // Harmony affirmation-1: not in CDN, no bundled, no fallback
      await expect(result).rejects.toThrow('No asset found for TTS placeholder');
    });
  });

  describe('Batch URL resolution', () => {
    test('should resolve mixed URL types in batch', async () => {
      const affirmationIds = ['affirmation-0', 'affirmation-1', 'affirmation-3', 'affirmation-5'];
      const result = urlResolver.resolveMultiple(mockPlaylist, affirmationIds, 'serenity');
      
      // Should return promise since some are TTS placeholders
      expect(result).toBeInstanceOf(Promise);
      
      const resolvedUrls = await result;
      expect(resolvedUrls).toHaveLength(4);
      expect(resolvedUrls[0]).toBe(100); // Mock require value
      expect(resolvedUrls[1]).toBe('https://cdn.example.com/serenity/1.mp3');
      expect(resolvedUrls[2]).toBe('file:///cache/cdn/serenity:affirmation-3.mp3');
      // affirmation-5 should fallback but doesn't exist in our mock
    });

    test('should handle all synchronous URLs without returning promise', () => {
      const affirmationIds = ['affirmation-0', 'affirmation-1'];
      const result = urlResolver.resolveMultiple(mockPlaylist, affirmationIds, 'serenity');
      
      // Should return array directly (no TTS placeholders)
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    test('should skip failed resolutions in batch', async () => {
      const affirmationIds = ['affirmation-0', 'affirmation-1', 'affirmation-99']; // 99 doesn't exist
      const result = urlResolver.resolveMultiple(mockPlaylist, affirmationIds, 'harmony');
      
      const resolvedUrls = await result;
      // Should only return successfully resolved URLs
      expect(resolvedUrls.length).toBeLessThan(affirmationIds.length);
    });
  });

  describe('CDN client integration', () => {
    test('should work without CDN client (backward compatibility)', () => {
      // Create resolver without CDN
      const resolverNoCDN = new URLResolver(bundledAssets);
      
      const result = resolverNoCDN.resolve(mockPlaylist, 'affirmation-0', 'titan');
      
      // Should use bundled fallback synchronously
      expect(typeof result).toBe('string');
      expect(result).toBe('bundled://titan/0');
    });

    test('should handle CDN client errors gracefully', async () => {
      // Make CDN client throw errors
      mockCDNClient.getPlayableUrl = jest.fn().mockRejectedValue(new Error('Network error'));
      
      const result = urlResolver.resolve(mockPlaylist, 'affirmation-3', 'serenity');
      const resolvedUrl = await result;
      
      // Should fall back to bundled assets
      expect(resolvedUrl).toBe('bundled://serenity/0');
      expect(mockCDNClient.isAvailable).toHaveBeenCalled();
    });

    test('should check CDN availability before attempting download', async () => {
      const result = urlResolver.resolve(mockPlaylist, 'affirmation-2', 'serenity');
      await result;
      
      // Should check availability first
      expect(mockCDNClient.isAvailable).toHaveBeenCalledBefore(
        mockCDNClient.getPlayableUrl as jest.Mock
      );
    });
  });

  describe('URL validation', () => {
    test('should validate playable URLs correctly', () => {
      expect(urlResolver.isPlayable(12345)).toBe(true); // require() number
      expect(urlResolver.isPlayable('https://example.com/file.mp3')).toBe(true);
      expect(urlResolver.isPlayable('http://example.com/file.mp3')).toBe(true);
      expect(urlResolver.isPlayable('bundled://serenity/0')).toBe(true);
      expect(urlResolver.isPlayable('file:///cache/file.mp3')).toBe(true);
      expect(urlResolver.isPlayable('tts://voice/id')).toBe(false);
      expect(urlResolver.isPlayable('')).toBe(false);
      expect(urlResolver.isPlayable(null)).toBe(false);
    });

    test('should identify TTS placeholders', () => {
      expect(urlResolver.isTTSPlaceholder('tts://voice/id')).toBe(true);
      expect(urlResolver.isTTSPlaceholder('https://example.com')).toBe(false);
      expect(urlResolver.isTTSPlaceholder(12345)).toBe(false);
    });
  });

  describe('Background track resolution', () => {
    test('should resolve background tracks from playlist', () => {
      const playlistWithBgTracks = {
        ...mockPlaylist,
        backgroundTracks: {
          'ocean': 'https://cdn.example.com/bg/ocean.mp3',
          'forest': 200 // Mock require value
        }
      };
      
      const oceanUrl = urlResolver.resolveBackgroundTrack('ocean', playlistWithBgTracks);
      expect(oceanUrl).toBe('https://cdn.example.com/bg/ocean.mp3');
      
      const forestUrl = urlResolver.resolveBackgroundTrack('forest', playlistWithBgTracks);
      expect(forestUrl).toBe(200); // Mock require value
    });

    test('should fall back to bundled background tracks', () => {
      const url = urlResolver.resolveBackgroundTrack('ethereal');
      expect(url).toBe(12345); // Mock bundled background track
    });

    test('should use playlist default for unknown tracks', () => {
      const url = urlResolver.resolveBackgroundTrack('unknown', mockPlaylist);
      expect(url).toBe(mockPlaylist.backgroundTrackUrl);
    });

    test('should throw when no background track found', () => {
      expect(() => urlResolver.resolveBackgroundTrack('unknown')).toThrow();
    });
  });
});