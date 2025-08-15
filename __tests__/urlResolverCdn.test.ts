/**
 * Tests for URLResolver CDN Client Integration
 * Tests URLResolver with optional CDN client injection and fallback behavior
 */

import { URLResolver, URLResolverError, URLResolverException } from '../services/urlResolver';
import type { ICDNClient, CanonicalTrackId } from '../services/cdn/types';
import type { Playlist } from '../types/audio';

// Mock BundledAssets
class MockBundledAssets {
  private assets: Record<string, Record<string, string>> = {
    serenity: {
      'affirmation-0': 'mock-bundled-serenity-0',
      'affirmation-1': 'mock-bundled-serenity-1',
      'affirmation-2': 'mock-bundled-serenity-2',
    },
    titan: {
      'affirmation-0': 'mock-bundled-titan-0',
      'affirmation-1': 'mock-bundled-titan-1',
    }
  };

  getAsset(affirmationId: string, voiceId: string): string | null {
    return this.assets[voiceId]?.[affirmationId] || null;
  }

  hasAsset(affirmationId: string, voiceId: string): boolean {
    return this.getAsset(affirmationId, voiceId) !== null;
  }
}

// Mock CDN Client
class MockCDNClient implements ICDNClient {
  private manifest = {
    version: '1.0.0',
    updatedAt: '2025-01-15T12:00:00Z',
    voices: []
  };
  
  private availableTracks = new Set<string>([
    'serenity:affirmation-0',
    'serenity:affirmation-1',
    'serenity:affirmation-2',
    'titan:affirmation-0'
  ]);

  private shouldFailRequests = false;
  private requestDelay = 0;

  async loadManifest() {
    return this.manifest;
  }

  async getPlayableUrl(trackId: CanonicalTrackId): Promise<string | number> {
    if (this.shouldFailRequests) {
      throw new Error(`CDN request failed for ${trackId}`);
    }

    if (this.requestDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.requestDelay));
    }

    if (this.availableTracks.has(trackId)) {
      // Return CDN-resolved path
      return `cdn-resolved-${trackId.replace(':', '-')}`;
    }

    throw new Error(`Track not found: ${trackId}`);
  }

  isAvailable(trackId: CanonicalTrackId): boolean {
    return this.availableTracks.has(trackId);
  }

  async prefetch(trackIds: CanonicalTrackId[]): Promise<void> {
    // No-op for mock
  }

  getStats() {
    return {
      manifestLoaded: true,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0
    };
  }

  reset(): void {
    // No-op for mock
  }

  // Test helpers
  setAvailableTracks(tracks: string[]) {
    this.availableTracks = new Set(tracks);
  }

  setShouldFailRequests(shouldFail: boolean) {
    this.shouldFailRequests = shouldFail;
  }

  setRequestDelay(delay: number) {
    this.requestDelay = delay;
  }
}

describe('URLResolver CDN Integration', () => {
  let resolver: URLResolver;
  let resolverWithCDN: URLResolver;
  let mockBundledAssets: MockBundledAssets;
  let mockCDNClient: MockCDNClient;
  let mockPlaylist: Playlist;

  beforeEach(() => {
    mockBundledAssets = new MockBundledAssets();
    mockCDNClient = new MockCDNClient();
    
    // Create resolvers with and without CDN client
    resolver = new URLResolver(mockBundledAssets as any);
    resolverWithCDN = new URLResolver(mockBundledAssets as any, mockCDNClient);
    
    mockPlaylist = {
      id: 'test-playlist',
      name: 'Test Playlist',
      description: 'Test playlist for CDN resolver',
      backgroundTrackUrl: 'test-background.mp3',
      defaultVoiceId: 'serenity',
      voices: [],
      affirmations: [],
      cdnUrls: {
        serenity: {
          'affirmation-0': 12345, // require() number - should bypass CDN
          'affirmation-1': 'https://cdn.example.com/audio1.mp3', // CDN URL - should try CDN first
          'affirmation-2': 'tts://serenity/affirmation-2', // TTS placeholder
        },
        titan: {
          'affirmation-0': 'tts://titan/affirmation-0', // TTS placeholder
          'affirmation-1': 67890, // require() number
        }
      }
    };
  });

  describe('constructor', () => {
    test('should work without CDN client (backward compatibility)', () => {
      const resolver = new URLResolver(mockBundledAssets as any);
      expect(resolver).toBeDefined();
    });

    test('should work with CDN client injection', () => {
      const resolver = new URLResolver(mockBundledAssets as any, mockCDNClient);
      expect(resolver).toBeDefined();
    });
  });

  describe('CDN-first resolution', () => {
    test('should use CDN client for TTS placeholders when available', async () => {
      const result = await resolverWithCDN.resolve(mockPlaylist, 'affirmation-2', 'serenity');
      
      // Should resolve via CDN instead of bundled assets
      expect(result).toBe('cdn-resolved-serenity-affirmation-2');
    });

    test('should fallback to bundled assets when CDN client not available', () => {
      const result = resolver.resolve(mockPlaylist, 'affirmation-2', 'serenity');
      
      // Should use bundled assets fallback
      expect(result).toBe('mock-bundled-serenity-2');
    });

    test('should still use require() numbers directly (bypass CDN)', async () => {
      const result = await resolverWithCDN.resolve(mockPlaylist, 'affirmation-0', 'serenity');
      
      // require() numbers should bypass CDN
      expect(result).toBe(12345);
    });

    test('should still use CDN URLs as-is', async () => {
      const result = await resolverWithCDN.resolve(mockPlaylist, 'affirmation-1', 'serenity');
      
      // HTTPS URLs should be returned as-is
      expect(result).toBe('https://cdn.example.com/audio1.mp3');
    });
  });

  describe('CDN fallback behavior', () => {
    test('should fallback to bundled assets when CDN fails', async () => {
      mockCDNClient.setShouldFailRequests(true);
      
      const result = await resolverWithCDN.resolve(mockPlaylist, 'affirmation-2', 'serenity');
      
      // Should fallback to bundled assets
      expect(result).toBe('mock-bundled-serenity-2');
    });

    test('should fallback when track not available in CDN', async () => {
      mockCDNClient.setAvailableTracks(['serenity:affirmation-0']); // Only one track available
      
      const result = await resolverWithCDN.resolve(mockPlaylist, 'affirmation-2', 'serenity');
      
      // Should fallback to bundled assets
      expect(result).toBe('mock-bundled-serenity-2');
    });

    test('should maintain original error when both CDN and bundled assets fail', async () => {
      mockCDNClient.setAvailableTracks([]); // No tracks in CDN
      
      // Add a TTS URL that will fail in both CDN and bundled assets
      const testPlaylist = {
        ...mockPlaylist,
        cdnUrls: {
          ...mockPlaylist.cdnUrls,
          serenity: {
            ...mockPlaylist.cdnUrls.serenity,
            'missing-affirmation': 'tts://serenity/missing-affirmation'
          }
        }
      };
      
      await expect(
        resolverWithCDN.resolve(testPlaylist, 'missing-affirmation', 'serenity')
      ).rejects.toThrow(URLResolverException);
    });
  });

  describe('resolveMultiple with CDN', () => {
    test('should resolve multiple URLs using CDN-first strategy', async () => {
      const affirmationIds = ['affirmation-0', 'affirmation-2'] as const;
      const results = await resolverWithCDN.resolveMultiple(mockPlaylist, affirmationIds, 'serenity');
      
      expect(results).toHaveLength(2);
      expect(results[0]).toBe(12345); // require() number bypasses CDN
      expect(results[1]).toBe('cdn-resolved-serenity-affirmation-2'); // TTS via CDN
    });

    test('should handle mixed success/failure scenarios', async () => {
      mockCDNClient.setAvailableTracks(['serenity:affirmation-0']); // Limited availability
      
      const affirmationIds = ['affirmation-0', 'affirmation-2'] as const;
      const results = await resolverWithCDN.resolveMultiple(mockPlaylist, affirmationIds, 'serenity');
      
      expect(results).toHaveLength(2);
      expect(results[0]).toBe(12345); // require() number
      expect(results[1]).toBe('mock-bundled-serenity-2'); // Fallback to bundled
    });

    test('should work without CDN client (backward compatibility)', () => {
      const affirmationIds = ['affirmation-0', 'affirmation-2'] as const;
      const results = resolver.resolveMultiple(mockPlaylist, affirmationIds, 'serenity');
      
      expect(results).toHaveLength(2);
      expect(results[0]).toBe(12345);
      expect(results[1]).toBe('mock-bundled-serenity-2');
    });
  });

  describe('canonical track ID generation', () => {
    test('should generate correct canonical track IDs', async () => {
      // This tests the internal canonical ID generation logic
      const result = await resolverWithCDN.resolve(mockPlaylist, 'affirmation-0', 'titan');
      
      // Should use CDN with canonical ID titan:affirmation-0
      expect(result).toBe('cdn-resolved-titan-affirmation-0');
    });

    test('should handle voice fallback in canonical IDs', async () => {
      // Set up CDN to not have titan tracks
      mockCDNClient.setAvailableTracks(['serenity:affirmation-0']);
      
      const result = await resolverWithCDN.resolve(mockPlaylist, 'affirmation-0', 'titan');
      
      // Should fallback to bundled assets since CDN doesn't have titan tracks
      expect(result).toBe('mock-bundled-titan-0');
    });
  });

  describe('performance and caching', () => {
    test('should handle CDN request timeouts gracefully', async () => {
      mockCDNClient.setRequestDelay(100); // Simulate slow CDN
      
      const startTime = Date.now();
      const result = await resolverWithCDN.resolve(mockPlaylist, 'affirmation-2', 'serenity');
      const endTime = Date.now();
      
      expect(result).toBe('cdn-resolved-serenity-affirmation-2');
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });

    test('should not block on CDN for require() numbers', async () => {
      mockCDNClient.setRequestDelay(100);
      
      const startTime = Date.now();
      const result = await resolverWithCDN.resolve(mockPlaylist, 'affirmation-0', 'serenity');
      const endTime = Date.now();
      
      expect(result).toBe(12345);
      expect(endTime - startTime).toBeLessThan(50); // Should be immediate
    });
  });

  describe('error handling', () => {
    test('should provide meaningful error messages when both sources fail', async () => {
      mockCDNClient.setAvailableTracks([]);
      
      try {
        await resolverWithCDN.resolve(mockPlaylist, 'nonexistent', 'serenity');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(URLResolverException);
        expect(error.type).toBe(URLResolverError.ASSET_NOT_FOUND);
        expect(error.message).toContain('nonexistent');
        expect(error.affirmationId).toBe('nonexistent');
        expect(error.voiceId).toBe('serenity');
      }
    });

    test('should handle CDN client internal errors gracefully', async () => {
      mockCDNClient.setShouldFailRequests(true);
      
      const result = await resolverWithCDN.resolve(mockPlaylist, 'affirmation-2', 'serenity');
      
      // Should fallback to bundled assets without throwing CDN error
      expect(result).toBe('mock-bundled-serenity-2');
    });
  });

  describe('isPlayable compatibility', () => {
    test('should maintain isPlayable behavior with CDN integration', async () => {
      // CDN-resolved URLs should be playable
      const cdnResult = await resolverWithCDN.resolve(mockPlaylist, 'affirmation-2', 'serenity');
      expect(resolverWithCDN.isPlayable(cdnResult)).toBe(true);

      // require() numbers should still be playable
      const requireResult = await resolverWithCDN.resolve(mockPlaylist, 'affirmation-0', 'serenity');
      expect(resolverWithCDN.isPlayable(requireResult)).toBe(true);

      // TTS URLs should still not be playable
      expect(resolverWithCDN.isPlayable('tts://test')).toBe(false);
    });
  });

  describe('backward compatibility', () => {
    test('should maintain exact same behavior when CDN client not provided', () => {
      // Test that all existing functionality works identically
      const withoutCDN = resolver.resolve(mockPlaylist, 'affirmation-0', 'serenity');
      const withCDN = resolverWithCDN.resolve(mockPlaylist, 'affirmation-0', 'serenity');
      
      // require() numbers should be identical
      expect(withoutCDN).toBe(withCDN);
    });

    test('should handle all existing URL types identically when CDN not used', () => {
      const testCases = [
        ['affirmation-0', 'serenity', 12345],
        ['affirmation-1', 'serenity', 'https://cdn.example.com/audio1.mp3'],
        ['affirmation-1', 'titan', 67890]
      ] as const;

      for (const [affirmation, voice, expected] of testCases) {
        const withoutCDN = resolver.resolve(mockPlaylist, affirmation, voice);
        const withCDN = resolverWithCDN.resolve(mockPlaylist, affirmation, voice);
        
        expect(withoutCDN).toBe(expected);
        expect(withCDN).toBe(expected);
      }
    });
  });
});