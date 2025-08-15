import { URLResolver, URLResolverError, URLResolverException } from '../services/urlResolver';
import { BundledAssets } from '../services/bundledAssets';
import type { Playlist } from '../types/audio';

// Mock audio files
jest.mock('../ethereal-ambient-music-55115.mp3', () => 12345, { virtual: true });
jest.mock('../lst-atmospheric-ambient-310691.mp3', () => 23456, { virtual: true });

describe('URLResolver Background Track Resolution', () => {
  let urlResolver: URLResolver;
  let bundledAssets: BundledAssets;
  let mockPlaylist: Playlist;

  beforeEach(() => {
    bundledAssets = new BundledAssets();
    urlResolver = new URLResolver(bundledAssets);
    
    mockPlaylist = {
      id: 'test-playlist',
      name: 'Test Playlist',
      description: 'Test playlist',
      backgroundTrackUrl: 'default-background.mp3',
      defaultVoiceId: 'serenity',
      voices: [],
      affirmations: [],
      cdnUrls: {},
    };
  });

  describe('resolveBackgroundTrack', () => {
    test('should resolve bundled background tracks', () => {
      const etherealUrl = urlResolver.resolveBackgroundTrack('ethereal');
      const atmosphericUrl = urlResolver.resolveBackgroundTrack('atmospheric');
      
      expect(etherealUrl).toBe(12345);
      expect(atmosphericUrl).toBe(23456);
    });

    test('should use custom background tracks from playlist', () => {
      const playlistWithCustomTracks: Playlist = {
        ...mockPlaylist,
        backgroundTracks: {
          'ethereal': 'https://cdn.example.com/custom-ethereal.mp3',
          'atmospheric': 'https://cdn.example.com/custom-atmospheric.mp3',
        }
      };

      const customUrl = urlResolver.resolveBackgroundTrack('ethereal', playlistWithCustomTracks);
      
      expect(customUrl).toBe('https://cdn.example.com/custom-ethereal.mp3');
    });

    test('should prioritize custom tracks over bundled tracks', () => {
      const playlistWithCustomTracks: Playlist = {
        ...mockPlaylist,
        backgroundTracks: {
          'ethereal': 'https://cdn.example.com/custom-ethereal.mp3',
        }
      };

      // Should use custom track, not bundled
      const customUrl = urlResolver.resolveBackgroundTrack('ethereal', playlistWithCustomTracks);
      expect(customUrl).toBe('https://cdn.example.com/custom-ethereal.mp3');
      
      // Should still use bundled for tracks not in custom mapping
      const bundledUrl = urlResolver.resolveBackgroundTrack('atmospheric', playlistWithCustomTracks);
      expect(bundledUrl).toBe(23456);
    });

    test('should fall back to playlist default background track', () => {
      const unknownTrackUrl = urlResolver.resolveBackgroundTrack('unknown-track', mockPlaylist);
      
      expect(unknownTrackUrl).toBe('default-background.mp3');
    });

    test('should throw error for unknown track without playlist fallback', () => {
      expect(() => {
        urlResolver.resolveBackgroundTrack('unknown-track');
      }).toThrow(URLResolverException);
      
      expect(() => {
        urlResolver.resolveBackgroundTrack('unknown-track');
      }).toThrow('Background track not found: unknown-track');
    });

    test('should throw error for unknown track with no playlist background', () => {
      const playlistWithoutBackground: Playlist = {
        ...mockPlaylist,
        backgroundTrackUrl: undefined as any
      };

      expect(() => {
        urlResolver.resolveBackgroundTrack('unknown-track', playlistWithoutBackground);
      }).toThrow(URLResolverException);
    });
  });

  describe('Background track integration with existing functionality', () => {
    test('should work alongside affirmation resolution', () => {
      // Test that background track resolution doesn't interfere with affirmation resolution
      const backgroundUrl = urlResolver.resolveBackgroundTrack('ethereal');
      expect(backgroundUrl).toBe(12345);
      
      // Add a test affirmation asset
      bundledAssets.addAsset('serenity', 'affirmation-0', 'test-affirmation');
      
      const testPlaylist: Playlist = {
        ...mockPlaylist,
        cdnUrls: {
          serenity: {
            'affirmation-0': 'tts://serenity/affirmation-0'
          }
        }
      };
      
      const affirmationUrl = urlResolver.resolve(testPlaylist, 'affirmation-0', 'serenity');
      expect(affirmationUrl).toBe('test-affirmation');
    });

    test('should handle mixed URL types consistently', () => {
      const playlistWithMixedTracks: Playlist = {
        ...mockPlaylist,
        backgroundTracks: {
          'cdn-track': 'https://cdn.example.com/track.mp3',
          'require-track': 99999,
        }
      };

      const cdnUrl = urlResolver.resolveBackgroundTrack('cdn-track', playlistWithMixedTracks);
      const requireUrl = urlResolver.resolveBackgroundTrack('require-track', playlistWithMixedTracks);
      
      expect(cdnUrl).toBe('https://cdn.example.com/track.mp3');
      expect(requireUrl).toBe(99999);
      
      // Both should be playable
      expect(urlResolver.isPlayable(cdnUrl)).toBe(true);
      expect(urlResolver.isPlayable(requireUrl)).toBe(true);
    });
  });

  describe('Error handling', () => {
    test('should provide detailed error information', () => {
      try {
        urlResolver.resolveBackgroundTrack('nonexistent-track');
      } catch (error) {
        expect(error).toBeInstanceOf(URLResolverException);
        expect((error as URLResolverException).type).toBe(URLResolverError.ASSET_NOT_FOUND);
        expect((error as URLResolverException).affirmationId).toBe('nonexistent-track');
        expect(error.message).toContain('Background track not found: nonexistent-track');
      }
    });
  });
});