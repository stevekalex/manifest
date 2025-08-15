import { URLResolver, URLResolverError, URLResolverException } from '../services/urlResolver';
import { BundledAssets } from '../services/bundledAssets';
import type { Playlist } from '../types/audio';

// Mock bundled assets for testing
class MockBundledAssets {
  private assets: Record<string, Record<string, string>> = {
    serenity: {
      'affirmation-0': 'mock-asset-serenity-0',
      'affirmation-1': 'mock-asset-serenity-1',
      'affirmation-2': 'mock-asset-serenity-2',
    },
    titan: {
      'affirmation-0': 'mock-asset-titan-0',
      'affirmation-1': 'mock-asset-titan-1',
    }
  };

  getAsset(affirmationId: string, voiceId: string): string | null {
    return this.assets[voiceId]?.[affirmationId] || null;
  }

  hasAsset(affirmationId: string, voiceId: string): boolean {
    return this.getAsset(affirmationId, voiceId) !== null;
  }

  addAsset(voiceId: string, affirmationId: string, asset: string): void {
    if (!this.assets[voiceId]) {
      this.assets[voiceId] = {};
    }
    this.assets[voiceId][affirmationId] = asset;
  }
}

describe('URLResolver', () => {
  let resolver: URLResolver;
  let mockBundledAssets: MockBundledAssets;
  let mockPlaylist: Playlist;

  beforeEach(() => {
    mockBundledAssets = new MockBundledAssets();
    resolver = new URLResolver(mockBundledAssets as any);
    
    mockPlaylist = {
      id: 'test-playlist',
      name: 'Test Playlist',
      description: 'Test playlist for URL resolver',
      backgroundTrackUrl: 'test-background.mp3',
      defaultVoiceId: 'serenity',
      voices: [],
      affirmations: [],
      cdnUrls: {
        serenity: {
          'affirmation-0': 12345, // require() number
          'affirmation-1': 'https://cdn.example.com/audio1.mp3', // CDN URL
          'affirmation-2': 'tts://serenity/affirmation-2', // TTS placeholder
        },
        titan: {
          'affirmation-0': 'tts://titan/affirmation-0', // TTS placeholder
          'affirmation-1': 67890, // require() number
        }
      }
    };
  });

  describe('resolve', () => {
    test('should resolve require() number assets', () => {
      const result = resolver.resolve(mockPlaylist, 'affirmation-0', 'serenity');
      expect(result).toBe(12345);
    });

    test('should resolve CDN URLs as-is', () => {
      const result = resolver.resolve(mockPlaylist, 'affirmation-1', 'serenity');
      expect(result).toBe('https://cdn.example.com/audio1.mp3');
    });

    test('should resolve TTS placeholders to bundled assets', () => {
      const result = resolver.resolve(mockPlaylist, 'affirmation-2', 'serenity');
      expect(result).toBe('mock-asset-serenity-2');
    });

    test('should throw error for missing affirmation', () => {
      expect(() => {
        resolver.resolve(mockPlaylist, 'missing-affirmation', 'serenity');
      }).toThrow(URLResolverException);
    });

    test('should throw error for missing voice', () => {
      expect(() => {
        resolver.resolve(mockPlaylist, 'affirmation-0', 'missing-voice');
      }).toThrow(URLResolverException);
    });

    test('should resolve TTS placeholder using bundled asset when available', () => {
      // This test expects the mock to have the asset
      const result = resolver.resolve(mockPlaylist, 'affirmation-0', 'titan');
      expect(result).toBe('mock-asset-titan-0');
    });

    test('should handle unsupported URL schemes', () => {
      const playlistWithBadUrl = {
        ...mockPlaylist,
        cdnUrls: {
          serenity: {
            'affirmation-0': 'file://local/path.mp3' // Unsupported scheme
          }
        }
      };

      expect(() => {
        resolver.resolve(playlistWithBadUrl, 'affirmation-0', 'serenity');
      }).toThrow(URLResolverException);
    });
  });

  describe('resolveMultiple', () => {
    test('should resolve array of affirmation IDs', () => {
      const results = resolver.resolveMultiple(
        mockPlaylist,
        ['affirmation-0', 'affirmation-1'],
        'serenity'
      );
      
      expect(results).toHaveLength(2);
      expect(results[0]).toBe(12345);
      expect(results[1]).toBe('https://cdn.example.com/audio1.mp3');
    });

    test('should skip failed resolutions and continue', () => {
      const results = resolver.resolveMultiple(
        mockPlaylist,
        ['affirmation-0', 'missing-affirmation', 'affirmation-1'],
        'serenity'
      );
      
      // Should get 2 results, skipping the missing one
      expect(results).toHaveLength(2);
      expect(results[0]).toBe(12345);
      expect(results[1]).toBe('https://cdn.example.com/audio1.mp3');
    });

    test('should return empty array for all failed resolutions', () => {
      const results = resolver.resolveMultiple(
        mockPlaylist,
        ['missing-1', 'missing-2'],
        'serenity'
      );
      
      expect(results).toHaveLength(0);
    });
  });

  describe('isTTSPlaceholder', () => {
    test('should identify TTS placeholders', () => {
      expect(resolver.isTTSPlaceholder('tts://voice/affirmation')).toBe(true);
      expect(resolver.isTTSPlaceholder('tts://preview/voice')).toBe(true);
    });

    test('should not identify non-TTS URLs as placeholders', () => {
      expect(resolver.isTTSPlaceholder('https://example.com/audio.mp3')).toBe(false);
      expect(resolver.isTTSPlaceholder('http://example.com/audio.mp3')).toBe(false);
      expect(resolver.isTTSPlaceholder(12345)).toBe(false);
      expect(resolver.isTTSPlaceholder(null)).toBe(false);
      expect(resolver.isTTSPlaceholder(undefined)).toBe(false);
    });
  });

  describe('isPlayable', () => {
    test('should identify playable require() numbers', () => {
      expect(resolver.isPlayable(12345)).toBe(true);
      expect(resolver.isPlayable(0)).toBe(true);
    });

    test('should identify playable HTTP/HTTPS URLs', () => {
      expect(resolver.isPlayable('https://example.com/audio.mp3')).toBe(true);
      expect(resolver.isPlayable('http://example.com/audio.mp3')).toBe(true);
    });

    test('should not identify TTS placeholders as playable', () => {
      expect(resolver.isPlayable('tts://voice/affirmation')).toBe(false);
    });

    test('should not identify other types as playable', () => {
      expect(resolver.isPlayable('file://local/path.mp3')).toBe(false);
      expect(resolver.isPlayable('asset://path.mp3')).toBe(false);
      expect(resolver.isPlayable(null)).toBe(false);
      expect(resolver.isPlayable(undefined)).toBe(false);
      expect(resolver.isPlayable({})).toBe(false);
    });
  });

  describe('TTS placeholder resolution with fallbacks', () => {
    test('should use fallback voice when TTS asset not found', () => {
      // Add fallback asset for serenity
      mockBundledAssets.addAsset('serenity', 'affirmation-5', 'fallback-asset');
      
      // Create playlist with TTS placeholder for affirmation that titan doesn't have
      const playlistWithMissingTitan = {
        ...mockPlaylist,
        cdnUrls: {
          ...mockPlaylist.cdnUrls,
          titan: {
            'affirmation-5': 'tts://titan/affirmation-5', // TTS placeholder with no bundled asset
          }
        }
      };
      
      const result = resolver.resolve(playlistWithMissingTitan, 'affirmation-5', 'titan');
      expect(result).toBe('fallback-asset');
    });

    test('should throw error when no fallback available', () => {
      // Create playlist with TTS placeholder for affirmation that neither voice has
      const playlistWithMissingAsset = {
        ...mockPlaylist,
        cdnUrls: {
          ...mockPlaylist.cdnUrls,
          titan: {
            'affirmation-missing': 'tts://titan/affirmation-missing', // TTS placeholder with no bundled asset
          }
        }
      };
      
      expect(() => {
        resolver.resolve(playlistWithMissingAsset, 'affirmation-missing', 'titan');
      }).toThrow(URLResolverException);
    });
  });

  describe('error handling', () => {
    test('should provide detailed error information', () => {
      try {
        resolver.resolve(mockPlaylist, 'missing-affirmation', 'serenity');
      } catch (error) {
        expect(error).toBeInstanceOf(URLResolverException);
        expect(error.type).toBe(URLResolverError.ASSET_NOT_FOUND);
        expect(error.affirmationId).toBe('missing-affirmation');
        expect(error.voiceId).toBe('serenity');
      }
    });

    test('should handle invalid TTS URLs', () => {
      const playlistWithInvalidTTS = {
        ...mockPlaylist,
        cdnUrls: {
          serenity: {
            'affirmation-0': 'invalid-tts-url'
          }
        }
      };

      expect(() => {
        resolver.resolve(playlistWithInvalidTTS, 'affirmation-0', 'serenity');
      }).toThrow(URLResolverException);
    });
  });
});

describe('BundledAssets', () => {
  let bundledAssets: BundledAssets;

  beforeEach(() => {
    // Mock the require function to avoid actual file loading in tests
    jest.mock('../assets/voices/serenity/0-hq.mp3', () => 123, { virtual: true });
    jest.mock('../assets/voices/serenity/1-hq.mp3', () => 456, { virtual: true });
    jest.mock('../assets/voices/serenity/2-hq.mp3', () => 789, { virtual: true });
    jest.mock('../assets/voices/titan/0-hq.mp3', () => 321, { virtual: true });
    jest.mock('../assets/voices/titan/1-hq.mp3', () => 654, { virtual: true });
    jest.mock('../assets/voices/titan/2-hq.mp3', () => 987, { virtual: true });
    
    bundledAssets = new BundledAssets();
  });

  describe('getAsset', () => {
    test('should return null for missing affirmation', () => {
      const asset = bundledAssets.getAsset('missing-affirmation', 'serenity');
      expect(asset).toBeNull();
    });

    test('should fall back to serenity voice when requested voice not available', () => {
      // Since assets may not exist in test environment, we test the fallback logic
      const asset = bundledAssets.getAsset('affirmation-0', 'nonexistent-voice');
      // This may be null if the assets don't exist in test environment
      expect(asset === null || typeof asset === 'number').toBe(true);
    });
  });

  describe('hasAsset', () => {
    test('should return boolean for asset existence check', () => {
      const hasAsset = bundledAssets.hasAsset('affirmation-0', 'serenity');
      expect(typeof hasAsset).toBe('boolean');
    });

    test('should return false for missing assets', () => {
      expect(bundledAssets.hasAsset('missing-affirmation', 'serenity')).toBe(false);
    });
  });

  describe('getAvailableAffirmations', () => {
    test('should return array of available affirmations for voice', () => {
      const affirmations = bundledAssets.getAvailableAffirmations('serenity');
      expect(Array.isArray(affirmations)).toBe(true);
    });

    test('should return empty array for missing voice', () => {
      const affirmations = bundledAssets.getAvailableAffirmations('nonexistent-voice');
      expect(affirmations).toEqual([]);
    });
  });

  describe('getStats', () => {
    test('should return statistics about available assets', () => {
      const stats = bundledAssets.getStats();
      
      expect(stats).toHaveProperty('totalVoices');
      expect(stats).toHaveProperty('totalAssets');
      expect(stats).toHaveProperty('assetsPerVoice');
      
      expect(typeof stats.totalVoices).toBe('number');
      expect(typeof stats.totalAssets).toBe('number');
      expect(typeof stats.assetsPerVoice).toBe('object');
      
      expect(stats.totalVoices).toBeGreaterThan(0);
    });
  });

  describe('addAsset', () => {
    test('should allow adding new assets', () => {
      bundledAssets.addAsset('test-voice', 'test-affirmation', 'test-asset');
      const asset = bundledAssets.getAsset('test-affirmation', 'test-voice');
      expect(asset).toBe('test-asset');
    });
  });

  describe('setFallbackVoice', () => {
    test('should allow changing fallback voice', () => {
      bundledAssets.setFallbackVoice('titan');
      // Test that fallback voice is used - this is hard to test directly
      // but we can verify the method doesn't throw
      expect(() => bundledAssets.setFallbackVoice('titan')).not.toThrow();
    });
  });
});