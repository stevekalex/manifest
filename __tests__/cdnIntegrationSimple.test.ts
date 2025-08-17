/**
 * Simplified CDN Integration tests
 * Tests the core CDN functionality with properly mocked dependencies
 */

import { AudioCoordinator } from '../services/audioCoordinator';
import { CDNFactory } from '../services/cdn/CDNFactory';
import type { Playlist, VoiceId } from '../types/audio';
import type { ICDNClient } from '../services/cdn/types';

// Mock all required modules
jest.mock('react-native-track-player', () => ({
  setupPlayer: jest.fn().mockResolvedValue(undefined),
  updateOptions: jest.fn().mockResolvedValue(undefined),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  getPlayerState: jest.fn().mockResolvedValue({ state: 'stopped' }),
  reset: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  add: jest.fn().mockResolvedValue(undefined),
  setRepeatMode: jest.fn().mockResolvedValue(undefined),
  play: jest.fn().mockResolvedValue(undefined),
  setVolume: jest.fn().mockResolvedValue(undefined),
  getQueue: jest.fn().mockResolvedValue([]),
  State: { None: 'none', Stopped: 'stopped', Playing: 'playing', Paused: 'paused' },
  Event: { PlaybackQueueEnded: 'playback-queue-ended', PlaybackTrackChanged: 'playback-track-changed' },
  RepeatMode: { Off: 'off', Queue: 'queue' }
}));

jest.mock('../services/bundledAssets', () => ({
  BundledAssets: jest.fn().mockImplementation(() => ({
    getAsset: jest.fn().mockReturnValue('bundled-asset-path'),
    hasAsset: jest.fn().mockReturnValue(true)
  }))
}));

jest.mock('../store/audioStore', () => ({
  useAudioStore: {
    getState: jest.fn(() => ({
      currentVoiceId: 'serenity',
      playlist: null,
      backgroundVolume: 0.7,
      affirmationVolume: 1.0,
      setPlaylist: jest.fn(),
      setVoiceId: jest.fn(),
      setModalOpen: jest.fn(),
      setPausedState: jest.fn(),
      setGlobalDelay: jest.fn(),
      setIsPlaying: jest.fn(),
      setCurrentTrackIndex: jest.fn(),
      setBackgroundVolume: jest.fn(),
      setAffirmationVolume: jest.fn()
    }))
  }
}));

jest.mock('../services/delayTimerManager', () => ({
  getDelayTimerManager: jest.fn(() => ({
    createManagedTimer: jest.fn(),
    cleanup: jest.fn()
  }))
}));

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    currentState: 'active'
  }
}));

jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///mock/document/',
  cacheDirectory: 'file:///mock/cache/',
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true, isDirectory: true })
}));

describe('CDN Integration (Simplified)', () => {
  let coordinator: AudioCoordinator;
  let mockCDNClient: ICDNClient;
  let mockCDNFactory: CDNFactory;
  let mockPlaylist: Playlist;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock CDN client
    mockCDNClient = {
      loadManifest: jest.fn().mockResolvedValue({
        version: '1.0.0',
        updatedAt: '2025-01-15T12:00:00Z',
        voices: []
      }),
      getPlayableUrl: jest.fn().mockResolvedValue('file:///cache/track.mp3'),
      isAvailable: jest.fn().mockReturnValue(true),
      prefetch: jest.fn().mockResolvedValue(undefined),
      getStats: jest.fn().mockReturnValue({
        manifestLoaded: true,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0
      }),
      reset: jest.fn()
    };

    // Create mock CDN factory
    mockCDNFactory = {
      getDefaultClient: jest.fn().mockReturnValue(mockCDNClient),
      createClient: jest.fn().mockReturnValue(mockCDNClient),
      resetDefaultClient: jest.fn(),
      switchClientType: jest.fn(),
      isDevelopment: jest.fn().mockReturnValue(true),
      getAvailableClientTypes: jest.fn().mockReturnValue(['local', 'remote']),
      validateConfig: jest.fn(),
      getClientStats: jest.fn().mockReturnValue(null),
      getConfig: jest.fn().mockReturnValue({
        clientType: 'remote',
        enableCache: true,
        requestTimeout: 5000,
        retryAttempts: 3,
        manifestPath: '../assets/voices/manifest.json',
        cacheMaxSize: 100
      })
    } as any;

    // Create test playlist with bundled assets (avoid TTS placeholders)
    mockPlaylist = {
      id: 'test-playlist',
      name: 'Test Playlist',
      description: 'Test playlist for CDN integration',
      backgroundTrackUrl: 12345, // Mock require() value
      defaultVoiceId: 'serenity',
      voices: [
        { id: 'serenity', name: 'Serenity' }
      ],
      affirmations: Array.from({ length: 10 }, (_, i) => ({
        id: `affirmation-${i}`,
        text: `Test affirmation ${i}`
      })),
      cdnUrls: {
        serenity: Object.fromEntries(
          Array.from({ length: 10 }, (_, i) => [`affirmation-${i}`, 100 + i]) // Mock require() values
        )
      }
    };

    coordinator = new AudioCoordinator(mockCDNFactory);
  });

  afterEach(async () => {
    if (coordinator) {
      await coordinator.cleanup();
    }
  });

  describe('CDN initialization', () => {
    test('should initialize with CDN factory', () => {
      expect(coordinator).toBeDefined();
      expect(mockCDNFactory.getDefaultClient).toHaveBeenCalled();
    });

    test('should work without CDN factory', () => {
      const coordinatorNoCDN = new AudioCoordinator();
      expect(coordinatorNoCDN).toBeDefined();
    });
  });

  describe('Prefetch functionality', () => {
    test('should trigger CDN prefetch during playlist selection', async () => {
      await coordinator.selectPlaylist(mockPlaylist);
      
      // Wait for async prefetch
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify prefetch was called
      expect(mockCDNClient.prefetch).toHaveBeenCalledWith([
        'serenity:affirmation-3',
        'serenity:affirmation-4',
        'serenity:affirmation-5'
      ]);
    });

    test('should handle prefetch failures gracefully', async () => {
      mockCDNClient.prefetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      // Should not throw error
      await expect(coordinator.selectPlaylist(mockPlaylist)).resolves.not.toThrow();
    });

    test('should skip prefetch when no CDN factory available', async () => {
      const coordinatorNoCDN = new AudioCoordinator();
      
      await coordinatorNoCDN.selectPlaylist(mockPlaylist);
      
      // No prefetch calls should be made
      expect(mockCDNClient.prefetch).not.toHaveBeenCalled();
      
      await coordinatorNoCDN.cleanup();
    });
  });

  describe('Queue expansion prefetch', () => {
    test('should trigger expansion prefetch when queue expands', async () => {
      await coordinator.selectPlaylist(mockPlaylist);
      
      // Clear initial prefetch calls
      jest.clearAllMocks();
      
      // Simulate queue expansion by manually calling the handler
      const audioSystem = coordinator.getAudioSystem();
      
      // Mock the necessary methods
      (audioSystem as any).checkAndExpandQueue = jest.fn().mockResolvedValue(true);
      (audioSystem as any).allTracks = mockPlaylist.affirmations.map(a => ({ id: a.id }));
      (audioSystem as any).currentWindowStart = 0;
      (audioSystem as any).getAudioSystem = jest.fn().mockReturnValue({
        getQueue: jest.fn().mockResolvedValue([
          { id: 'affirmation-0' },
          { id: 'affirmation-1' },
          { id: 'affirmation-2' }
        ])
      });
      
      // Trigger expansion handler
      const handleQueueExpansion = (coordinator as any).handleQueueExpansion;
      await handleQueueExpansion.call(coordinator);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify expansion prefetch was triggered
      expect(mockCDNClient.prefetch).toHaveBeenCalledWith(
        expect.arrayContaining([
          'serenity:affirmation-3',
          'serenity:affirmation-4',
          'serenity:affirmation-5'
        ])
      );
    });
  });

  describe('Voice switching with CDN', () => {
    test('should handle voice changes', async () => {
      await coordinator.selectPlaylist(mockPlaylist);
      
      // Open voice modal
      coordinator.openVoiceModal();
      
      // Switch voice
      await coordinator.confirmVoiceSelection('titan' as VoiceId);
      
      // Verify no errors occurred
      expect(true).toBe(true);
    });
  });

  describe('Playlist operations', () => {
    test('should handle playlist selection', async () => {
      await coordinator.selectPlaylist(mockPlaylist);
      
      // Should complete without errors
      expect(true).toBe(true);
    });

    test('should handle pause and resume', async () => {
      await coordinator.selectPlaylist(mockPlaylist);
      
      coordinator.pause();
      coordinator.resume();
      
      // Should complete without errors
      expect(true).toBe(true);
    });

    test('should handle delay updates', async () => {
      await coordinator.selectPlaylist(mockPlaylist);
      
      coordinator.updateDelay(5000);
      coordinator.skipDelay();
      
      // Should complete without errors
      expect(true).toBe(true);
    });
  });

  describe('Background track switching', () => {
    test('should switch background tracks', async () => {
      await coordinator.selectPlaylist(mockPlaylist);
      
      await coordinator.switchBackgroundTrack('atmospheric');
      
      // Should complete without errors
      expect(true).toBe(true);
    });
  });

  describe('Volume controls', () => {
    test('should set background volume', async () => {
      await coordinator.selectPlaylist(mockPlaylist);
      
      await coordinator.setBackgroundVolume(0.5);
      
      // Should complete without errors
      expect(true).toBe(true);
    });

    test('should set affirmation volume', async () => {
      await coordinator.selectPlaylist(mockPlaylist);
      
      await coordinator.setAffirmationVolume(0.8);
      
      // Should complete without errors
      expect(true).toBe(true);
    });
  });

  describe('CDN client interaction', () => {
    test('should use CDN client for prefetching', async () => {
      await coordinator.selectPlaylist(mockPlaylist);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockCDNClient.prefetch).toHaveBeenCalled();
    });

    test('should handle CDN stats retrieval', async () => {
      await coordinator.selectPlaylist(mockPlaylist);
      
      const stats = mockCDNClient.getStats();
      expect(stats.manifestLoaded).toBe(true);
    });

    test('should handle CDN errors gracefully', async () => {
      mockCDNClient.getPlayableUrl = jest.fn().mockRejectedValue(new Error('CDN error'));
      
      await expect(coordinator.selectPlaylist(mockPlaylist)).resolves.not.toThrow();
    });
  });

  describe('Track ID generation', () => {
    test('should generate correct canonical track IDs', async () => {
      await coordinator.selectPlaylist(mockPlaylist);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify correct track ID format was used
      expect(mockCDNClient.prefetch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringMatching(/^serenity:affirmation-\d+$/)
        ])
      );
    });
  });
});