/**
 * Tests for AudioPlaybackService CDN Integration
 * Tests URLResolver integration in audioPlaybackService, specifically the
 * reconstructTracksFromSnapshot method that currently uses direct cdnUrls access
 */

import { AudioPlaybackService } from '../services/audioPlaybackService';
import { URLResolver } from '../services/urlResolver';
import type { ICDNClient } from '../services/cdn/types';
import type { Playlist, PlaybackSnapshot } from '../types/audio';
import { useAudioStore } from '../store/audioStore';

// Mock dependencies
jest.mock('../store/audioStore');
jest.mock('react-native-track-player', () => ({
  setupPlayer: jest.fn().mockResolvedValue(undefined),
  updateOptions: jest.fn().mockResolvedValue(undefined),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  getPlayerState: jest.fn().mockResolvedValue({ state: 'stopped' }),
  reset: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  State: {
    None: 'none',
    Stopped: 'stopped',
    Playing: 'playing',
    Paused: 'paused'
  },
  Event: {
    PlaybackQueueEnded: 'playback-queue-ended',
    PlaybackTrackChanged: 'playback-track-changed'
  },
  RepeatMode: {
    Off: 'off'
  },
  Capability: {
    Play: 'play',
    Pause: 'pause',
    Stop: 'stop'
  },
  IOSCategoryMode: {
    Default: 'default'
  },
  IOSCategoryOptions: {
    MixWithOthers: 'mixWithOthers'
  },
  AndroidAudioContentType: {
    Music: 'music'
  }
}));

// Mock BundledAssets
class MockBundledAssets {
  getAsset(affirmationId: string, voiceId: string): string | null {
    if (voiceId === 'serenity' && affirmationId === 'affirmation-0') return 'mock-bundled-serenity-0';
    if (voiceId === 'serenity' && affirmationId === 'affirmation-1') return 'mock-bundled-serenity-1';
    if (voiceId === 'titan' && affirmationId === 'affirmation-0') return 'mock-bundled-titan-0';
    return null;
  }

  hasAsset(affirmationId: string, voiceId: string): boolean {
    return this.getAsset(affirmationId, voiceId) !== null;
  }
}

// Mock CDN Client
class MockCDNClient implements ICDNClient {
  private availableTracks = new Set<string>(['serenity:affirmation-0', 'titan:affirmation-0']);

  async loadManifest() {
    return {
      version: '1.0.0',
      updatedAt: '2025-01-15T12:00:00Z',
      voices: []
    };
  }

  async getPlayableUrl(trackId: string): Promise<string | number> {
    if (this.availableTracks.has(trackId)) {
      return `cdn-resolved-${trackId.replace(':', '-')}`;
    }
    throw new Error(`Track not found: ${trackId}`);
  }

  isAvailable(trackId: string): boolean {
    return this.availableTracks.has(trackId);
  }

  async prefetch(): Promise<void> {}
  getStats() {
    return {
      manifestLoaded: true,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0
    };
  }
  reset(): void {}

  setAvailableTracks(tracks: string[]) {
    this.availableTracks = new Set(tracks);
  }
}

describe('AudioPlaybackService CDN Integration', () => {
  let audioService: AudioPlaybackService;
  let urlResolver: URLResolver;
  let urlResolverWithCDN: URLResolver;
  let mockBundledAssets: MockBundledAssets;
  let mockCDNClient: MockCDNClient;
  let mockPlaylist: Playlist;
  let mockSnapshot: PlaybackSnapshot;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockBundledAssets = new MockBundledAssets();
    mockCDNClient = new MockCDNClient();
    
    // Create URLResolvers with and without CDN
    urlResolver = new URLResolver(mockBundledAssets as any);
    urlResolverWithCDN = new URLResolver(mockBundledAssets as any, mockCDNClient);
    
    mockPlaylist = {
      id: 'test-playlist',
      name: 'Test Playlist',
      description: 'Test playlist for playback service',
      backgroundTrackUrl: 'test-background.mp3',
      defaultVoiceId: 'serenity',
      voices: [
        { id: 'serenity', name: 'Serenity' },
        { id: 'titan', name: 'Titan' }
      ],
      affirmations: [
        { id: 'affirmation-0', text: 'I am confident and strong' },
        { id: 'affirmation-1', text: 'I am worthy of success' }
      ],
      cdnUrls: {
        serenity: {
          'affirmation-0': 'tts://serenity/affirmation-0',
          'affirmation-1': 'https://cdn.example.com/serenity-1.mp3'
        },
        titan: {
          'affirmation-0': 'tts://titan/affirmation-0'
        }
      }
    };
    
    mockSnapshot = {
      affirmationIds: ['affirmation-0', 'affirmation-1'],
      currentIndex: 0,
      position: 5.5,
      isPlaying: false,
      timestamp: Date.now()
    };

    // Mock audio store
    (useAudioStore.getState as jest.Mock).mockReturnValue({
      currentVoiceId: 'serenity',
      playlist: mockPlaylist
    });
  });

  describe('constructor dependency injection', () => {
    test('should work without URLResolver (backward compatibility)', () => {
      const service = new AudioPlaybackService();
      expect(service).toBeDefined();
    });

    test('should accept URLResolver in constructor', () => {
      const service = new AudioPlaybackService(undefined, urlResolver);
      expect(service).toBeDefined();
    });

    test('should accept URLResolver with CDN client', () => {
      const service = new AudioPlaybackService(undefined, urlResolverWithCDN);
      expect(service).toBeDefined();
    });
  });

  describe('reconstructTracksFromSnapshot', () => {
    test('should use URLResolver when available (CDN-first)', async () => {
      const service = new AudioPlaybackService(undefined, urlResolverWithCDN);
      
      // Access private method via any cast for testing
      const tracks = await (service as any).reconstructTracksFromSnapshot(mockSnapshot);
      
      expect(tracks).toHaveLength(2);
      
      // First track should come from CDN
      expect(tracks[0].id).toBe('affirmation-0');
      expect(tracks[0].url).toBe('cdn-resolved-serenity-affirmation-0');
      expect(tracks[0].title).toBe('I am confident and strong');
      
      // Second track should use HTTPS URL as-is
      expect(tracks[1].id).toBe('affirmation-1');
      expect(tracks[1].url).toBe('https://cdn.example.com/serenity-1.mp3');
      expect(tracks[1].title).toBe('I am worthy of success');
    });

    test('should use URLResolver without CDN (bundled assets)', async () => {
      const service = new AudioPlaybackService(undefined, urlResolver);
      
      const tracks = await (service as any).reconstructTracksFromSnapshot(mockSnapshot);
      
      expect(tracks).toHaveLength(2);
      
      // First track should come from bundled assets
      expect(tracks[0].id).toBe('affirmation-0');
      expect(tracks[0].url).toBe('mock-bundled-serenity-0');
      
      // Second track should use HTTPS URL as-is
      expect(tracks[1].id).toBe('affirmation-1');
      expect(tracks[1].url).toBe('https://cdn.example.com/serenity-1.mp3');
    });

    test('should return empty array when no URLResolver is available', async () => {
      const service = new AudioPlaybackService();
      
      const tracks = await (service as any).reconstructTracksFromSnapshot(mockSnapshot);
      
      // Should return empty array since URLResolver is required
      expect(tracks).toHaveLength(0);
    });

    test('should always use URLResolver.resolve for URL resolution', async () => {
      const mockResolve = jest.fn()
        .mockResolvedValueOnce('resolved-url-1')
        .mockResolvedValueOnce('resolved-url-2');
      
      const mockUrlResolver = {
        resolve: mockResolve
      };
      
      const service = new AudioPlaybackService(undefined, mockUrlResolver as any);
      
      const tracks = await (service as any).reconstructTracksFromSnapshot(mockSnapshot);
      
      // Verify URLResolver.resolve was called for each affirmation
      expect(mockResolve).toHaveBeenCalledTimes(2);
      expect(mockResolve).toHaveBeenCalledWith(mockPlaylist, 'affirmation-0', 'serenity');
      expect(mockResolve).toHaveBeenCalledWith(mockPlaylist, 'affirmation-1', 'serenity');
      
      // Verify resolved URLs are used in tracks
      expect(tracks).toHaveLength(2);
      expect(tracks[0].url).toBe('resolved-url-1');
      expect(tracks[1].url).toBe('resolved-url-2');
    });

    test('should handle missing affirmations gracefully', async () => {
      const snapshotWithMissingAffirmation = {
        ...mockSnapshot,
        affirmationIds: ['affirmation-0', 'missing-affirmation', 'affirmation-1']
      };
      
      const service = new AudioPlaybackService(undefined, urlResolverWithCDN);
      const tracks = await (service as any).reconstructTracksFromSnapshot(snapshotWithMissingAffirmation);
      
      // Should skip missing affirmation and continue with valid ones
      expect(tracks).toHaveLength(2);
      expect(tracks[0].id).toBe('affirmation-0');
      expect(tracks[1].id).toBe('affirmation-1');
    });

    test('should handle URLResolver errors gracefully', async () => {
      // Set up CDN to fail for specific track
      mockCDNClient.setAvailableTracks([]);
      
      const service = new AudioPlaybackService(undefined, urlResolverWithCDN);
      const tracks = await (service as any).reconstructTracksFromSnapshot(mockSnapshot);
      
      // Should fall back to bundled assets when CDN fails
      expect(tracks).toHaveLength(2);
      expect(tracks[0].url).toBe('mock-bundled-serenity-0'); // CDN failed, used bundled fallback
      expect(tracks[1].url).toBe('https://cdn.example.com/serenity-1.mp3'); // HTTPS URL used as-is
    });

    test('should handle empty playlist gracefully', async () => {
      (useAudioStore.getState as jest.Mock).mockReturnValue({
        currentVoiceId: 'serenity',
        playlist: null
      });
      
      const service = new AudioPlaybackService(undefined, urlResolverWithCDN);
      const tracks = await (service as any).reconstructTracksFromSnapshot(mockSnapshot);
      
      expect(tracks).toEqual([]);
    });

    test('should handle voice switching correctly', async () => {
      // Change voice to titan
      (useAudioStore.getState as jest.Mock).mockReturnValue({
        currentVoiceId: 'titan',
        playlist: mockPlaylist
      });
      
      const snapshotWithTitanTrack = {
        ...mockSnapshot,
        affirmationIds: ['affirmation-0']
      };
      
      const service = new AudioPlaybackService(undefined, urlResolverWithCDN);
      const tracks = await (service as any).reconstructTracksFromSnapshot(snapshotWithTitanTrack);
      
      expect(tracks).toHaveLength(1);
      expect(tracks[0].url).toBe('cdn-resolved-titan-affirmation-0');
    });
  });

  describe('async/sync compatibility', () => {
    test('should handle async URLResolver results', async () => {
      const service = new AudioPlaybackService(undefined, urlResolverWithCDN);
      
      const tracks = await (service as any).reconstructTracksFromSnapshot(mockSnapshot);
      
      // Should properly await async URL resolution
      expect(tracks[0].url).toBe('cdn-resolved-serenity-affirmation-0');
    });

    test('should handle sync URLResolver results', async () => {
      const service = new AudioPlaybackService(undefined, urlResolver);
      
      const tracks = await (service as any).reconstructTracksFromSnapshot(mockSnapshot);
      
      // Should handle sync resolution correctly
      expect(tracks[0].url).toBe('mock-bundled-serenity-0');
    });

    test('should handle mixed sync/async results', async () => {
      const service = new AudioPlaybackService(undefined, urlResolverWithCDN);
      
      const tracks = await (service as any).reconstructTracksFromSnapshot(mockSnapshot);
      
      // First track async (TTS via CDN), second track sync (HTTPS URL)
      expect(tracks[0].url).toBe('cdn-resolved-serenity-affirmation-0');
      expect(tracks[1].url).toBe('https://cdn.example.com/serenity-1.mp3');
    });
  });

  describe('performance considerations', () => {
    test('should not block on URLResolver for non-TTS URLs', async () => {
      const httpsOnlyPlaylist = {
        ...mockPlaylist,
        cdnUrls: {
          serenity: {
            'affirmation-0': 'https://cdn.example.com/track1.mp3',
            'affirmation-1': 'https://cdn.example.com/track2.mp3'
          }
        }
      };
      
      (useAudioStore.getState as jest.Mock).mockReturnValue({
        currentVoiceId: 'serenity',
        playlist: httpsOnlyPlaylist
      });
      
      const service = new AudioPlaybackService(undefined, urlResolverWithCDN);
      
      const startTime = Date.now();
      const tracks = await (service as any).reconstructTracksFromSnapshot(mockSnapshot);
      const duration = Date.now() - startTime;
      
      // Should be very fast since no async resolution needed
      expect(duration).toBeLessThan(50);
      expect(tracks[0].url).toBe('https://cdn.example.com/track1.mp3');
      expect(tracks[1].url).toBe('https://cdn.example.com/track2.mp3');
    });
  });

  describe('error logging and debugging', () => {
    test('should log URL resolution process', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const service = new AudioPlaybackService(undefined, urlResolverWithCDN);
      await (service as any).reconstructTracksFromSnapshot(mockSnapshot);
      
      // Should log URL resolution steps
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[URL-RESOLVER]')
      );
      
      consoleSpy.mockRestore();
    });

    test('should handle and log URL resolution errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Force URL resolution to fail
      const failingUrlResolver = {
        resolve: jest.fn().mockRejectedValue(new Error('Resolution failed'))
      };
      
      const service = new AudioPlaybackService(undefined, failingUrlResolver as any);
      const tracks = await (service as any).reconstructTracksFromSnapshot(mockSnapshot);
      
      // Should log errors but continue processing
      expect(tracks).toHaveLength(0); // No tracks since resolution failed
      
      consoleErrorSpy.mockRestore();
    });
  });
});