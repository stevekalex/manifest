/**
 * Tests for AudioCoordinator CDN Queue Expansion Prefetch functionality
 * Tests Phase 3.2: Prefetch during queue expansion
 */

import { AudioCoordinator } from '../services/audioCoordinator';
import { CDNFactory } from '../services/cdn/CDNFactory';
import type { Playlist, VoiceId } from '../types/audio';
import type { ICDNClient } from '../services/cdn/types';
import { AudioPlaybackService } from '../services/audioPlaybackService';

// Mock React Native Track Player
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
  getQueue: jest.fn().mockResolvedValue([
    { id: 'affirmation-0', title: 'Track 1' },
    { id: 'affirmation-1', title: 'Track 2' },
    { id: 'affirmation-2', title: 'Track 3' },
    { id: 'affirmation-3', title: 'Track 4' },
    { id: 'affirmation-4', title: 'Track 5' }
  ]),
  getCurrentTrack: jest.fn().mockResolvedValue(2), // Currently at track index 2
  State: {
    None: 'none',
    Stopped: 'stopped', 
    Playing: 'playing',
    Paused: 'paused'
  },
  Event: {
    PlaybackQueueEnded: 'playback-queue-ended',
    PlaybackTrackChanged: 'playback-track-changed',
    RemotePlay: 'remote-play',
    RemotePause: 'remote-pause', 
    RemoteNext: 'remote-next',
    RemotePrevious: 'remote-previous',
    PlaybackState: 'playback-state',
    PlaybackProgressUpdated: 'playback-progress-updated',
    PlaybackError: 'playback-error'
  },
  RepeatMode: {
    Off: 'off',
    Queue: 'queue'
  },
  Capability: {
    Play: 'play',
    Pause: 'pause',
    Stop: 'stop',
    SkipToNext: 'skipToNext',
    SkipToPrevious: 'skipToPrevious'
  },
  IOSCategoryMode: {
    Default: 'default',
    SpokenAudio: 'spokenAudio'
  },
  IOSCategoryOptions: {
    MixWithOthers: 'mixWithOthers'
  },
  AndroidAudioContentType: {
    Music: 'music',
    Speech: 'speech'
  }
}));

// Mock bundled assets
jest.mock('../services/bundledAssets', () => ({
  BundledAssets: jest.fn().mockImplementation(() => ({
    getAsset: jest.fn().mockReturnValue('mock-asset-path'),
    hasAsset: jest.fn().mockReturnValue(true),
    getAllAssets: jest.fn().mockReturnValue({}),
    addAsset: jest.fn(),
    setFallbackVoice: jest.fn()
  }))
}));

// Mock audio store
jest.mock('../store/audioStore', () => ({
  useAudioStore: {
    getState: jest.fn(() => ({
      currentVoiceId: 'serenity',
      playlist: null,
      modalOpen: false,
      pausedState: undefined,
      globalDelayMs: 3000,
      isPlaying: false,
      currentTrackIndex: 0,
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

// Mock delay timer manager
jest.mock('../services/delayTimerManager', () => ({
  getDelayTimerManager: jest.fn(() => ({
    createManagedTimer: jest.fn(),
    cleanup: jest.fn()
  }))
}));

// Mock React Native modules
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    currentState: 'active'
  }
}));

describe('AudioCoordinator Queue Expansion Prefetch', () => {
  let coordinator: AudioCoordinator;
  let mockCDNClient: ICDNClient;
  let mockCDNFactory: CDNFactory;
  let mockPlaylist: Playlist;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock CDN client with prefetch functionality
    mockCDNClient = {
      loadManifest: jest.fn().mockResolvedValue({
        version: '1.0.0',
        updatedAt: '2025-01-15T12:00:00Z',
        voices: []
      }),
      getPlayableUrl: jest.fn().mockResolvedValue('cached-file-path'),
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

    // Create test playlist with enough affirmations for expansion prefetching
    mockPlaylist = {
      id: 'test-playlist',
      name: 'Test Playlist',
      description: 'Test playlist for expansion prefetch testing',
      backgroundTrackUrl: 'test-background.mp3',
      defaultVoiceId: 'serenity',
      voices: [
        { id: 'serenity', name: 'Serenity' },
        { id: 'titan', name: 'Titan' }
      ],
      affirmations: Array.from({ length: 25 }, (_, i) => ({
        id: `affirmation-${i}`,
        text: `Test affirmation ${i}`
      })),
      cdnUrls: {
        serenity: Object.fromEntries(
          Array.from({ length: 25 }, (_, i) => [`affirmation-${i}`, `tts://serenity/affirmation-${i}`])
        )
      }
    };

    // Mock store to return our test playlist
    const mockUseAudioStore = require('../store/audioStore').useAudioStore;
    mockUseAudioStore.getState.mockReturnValue({
      currentVoiceId: 'serenity',
      playlist: mockPlaylist,
      modalOpen: false,
      pausedState: undefined,
      globalDelayMs: 3000,
      isPlaying: true,
      currentTrackIndex: 2,
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
    });

    coordinator = new AudioCoordinator(mockCDNFactory);
  });

  afterEach(async () => {
    if (coordinator) {
      await coordinator.cleanup();
    }
  });

  describe('queue expansion prefetch functionality', () => {
    test('should trigger expansion prefetch after successful queue expansion', async () => {
      // Mock audio system's checkAndExpandQueue to return true (expansion occurred)
      const audioSystem = coordinator.getAudioSystem();
      jest.spyOn(audioSystem, 'checkAndExpandQueue').mockResolvedValue(true);

      // Set up the internal state needed for expansion prefetch
      (audioSystem as any).allTracks = mockPlaylist.affirmations.map(a => ({ id: a.id }));
      (audioSystem as any).currentWindowStart = 0;
      (audioSystem as any).getAudioSystem = jest.fn().mockReturnValue({
        getQueue: jest.fn().mockResolvedValue([
          { id: 'affirmation-0' },
          { id: 'affirmation-1' },
          { id: 'affirmation-2' },
          { id: 'affirmation-3' },
          { id: 'affirmation-4' }
        ])
      });

      // Clear any prefetch calls from bootstrap
      jest.clearAllMocks();

      // Access the private handleQueueExpansion method using any cast
      const handleQueueExpansion = (coordinator as any).handleQueueExpansion;
      
      // Call the expansion handler
      await handleQueueExpansion.call(coordinator);

      // Wait for async prefetch to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify expansion prefetch was triggered
      expect(mockCDNClient.prefetch).toHaveBeenCalled();
      
      // Should prefetch 3 tracks starting from estimated position (reduced for testing)
      const prefetchCall = (mockCDNClient.prefetch as jest.Mock).mock.calls[0];
      expect(prefetchCall[0]).toHaveLength(3);
    });

    test('should generate correct expansion prefetch track IDs', async () => {
      // Mock audio system internals for queue status
      const audioSystem = coordinator.getAudioSystem();
      (audioSystem as any).allTracks = mockPlaylist.affirmations.map(a => ({ id: a.id }));
      (audioSystem as any).currentWindowStart = 0;
      (audioSystem as any).getAudioSystem = jest.fn().mockReturnValue({
        getQueue: jest.fn().mockResolvedValue([
          { id: 'affirmation-0' },
          { id: 'affirmation-1' },
          { id: 'affirmation-2' },
          { id: 'affirmation-3' },
          { id: 'affirmation-4' }
        ])
      });
      jest.spyOn(audioSystem, 'checkAndExpandQueue').mockResolvedValue(true);

      // Clear any prefetch calls from bootstrap
      jest.clearAllMocks();

      // Access the private method
      const handleQueueExpansion = (coordinator as any).handleQueueExpansion;
      await handleQueueExpansion.call(coordinator);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify correct track IDs were generated
      expect(mockCDNClient.prefetch).toHaveBeenCalledWith(
        expect.arrayContaining([
          'serenity:affirmation-5', // Starting from end of current queue (5 tracks)
          'serenity:affirmation-6',
          'serenity:affirmation-7'
          // Should prefetch 3 tracks total (indices 5-7) - TESTING VALUES
        ])
      );
    });

    test('should not trigger prefetch if queue expansion fails', async () => {
      // Mock audio system's checkAndExpandQueue to return false (no expansion)
      const audioSystem = coordinator.getAudioSystem();
      jest.spyOn(audioSystem, 'checkAndExpandQueue').mockResolvedValue(false);

      const handleQueueExpansion = (coordinator as any).handleQueueExpansion;
      await handleQueueExpansion.call(coordinator);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify no prefetch was triggered
      expect(mockCDNClient.prefetch).not.toHaveBeenCalled();
    });

    test('should handle prefetch errors gracefully without blocking expansion', async () => {
      // Make prefetch fail
      (mockCDNClient.prefetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const audioSystem = coordinator.getAudioSystem();
      (audioSystem as any).allTracks = mockPlaylist.affirmations.map(a => ({ id: a.id }));
      (audioSystem as any).currentWindowStart = 0;
      (audioSystem as any).getAudioSystem = jest.fn().mockReturnValue({
        getQueue: jest.fn().mockResolvedValue([{ id: 'affirmation-0' }])
      });
      jest.spyOn(audioSystem, 'checkAndExpandQueue').mockResolvedValue(true);

      // Clear previous calls
      jest.clearAllMocks();
      // Re-apply the rejection after clearing mocks
      (mockCDNClient.prefetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const handleQueueExpansion = (coordinator as any).handleQueueExpansion;
      
      // Should not throw error even when prefetch fails
      await expect(handleQueueExpansion.call(coordinator)).resolves.not.toThrow();
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify prefetch was attempted
      expect(mockCDNClient.prefetch).toHaveBeenCalled();
    });

    test('should work without CDN factory available', async () => {
      // Create coordinator without CDN factory
      const coordinatorNoCDN = new AudioCoordinator();
      
      const audioSystem = coordinatorNoCDN.getAudioSystem();
      jest.spyOn(audioSystem, 'checkAndExpandQueue').mockResolvedValue(true);

      const handleQueueExpansion = (coordinatorNoCDN as any).handleQueueExpansion;
      
      // Should not throw error when no CDN available
      await expect(handleQueueExpansion.call(coordinatorNoCDN)).resolves.not.toThrow();

      await coordinatorNoCDN.cleanup();
    });

    test('should handle queue status determination failure', async () => {
      const audioSystem = coordinator.getAudioSystem();
      jest.spyOn(audioSystem, 'checkAndExpandQueue').mockResolvedValue(true);
      
      // Set up failing queue status by making allTracks empty
      (audioSystem as any).allTracks = [];

      // Clear previous calls
      jest.clearAllMocks();

      const handleQueueExpansion = (coordinator as any).handleQueueExpansion;
      await handleQueueExpansion.call(coordinator);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not crash and should not call prefetch
      expect(mockCDNClient.prefetch).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentQueueStatus helper', () => {
    test('should return correct estimated next track index', async () => {
      const audioSystem = coordinator.getAudioSystem();
      
      // Mock audio system internals
      (audioSystem as any).allTracks = mockPlaylist.affirmations.map(a => ({ id: a.id }));
      (audioSystem as any).currentWindowStart = 0;
      (audioSystem as any).getAudioSystem = jest.fn().mockReturnValue({
        getQueue: jest.fn().mockResolvedValue([
          { id: 'affirmation-0' },
          { id: 'affirmation-1' },
          { id: 'affirmation-2' }
        ])
      });

      const getCurrentQueueStatus = (coordinator as any).getCurrentQueueStatus;
      const result = await getCurrentQueueStatus.call(coordinator);

      expect(result).toEqual({
        estimatedNextTrackIndex: 3 // currentWindowStart (0) + queue length (3)
      });
    });

    test('should return null when no tracks available', async () => {
      const audioSystem = coordinator.getAudioSystem();
      (audioSystem as any).allTracks = [];

      const getCurrentQueueStatus = (coordinator as any).getCurrentQueueStatus;
      const result = await getCurrentQueueStatus.call(coordinator);

      expect(result).toBeNull();
    });
  });

  describe('generateExpansionPrefetchTrackIds helper', () => {
    test('should generate correct track IDs for expansion range', () => {
      const generateExpansionPrefetchTrackIds = (coordinator as any).generateExpansionPrefetchTrackIds;
      
      const trackIds = generateExpansionPrefetchTrackIds.call(
        coordinator,
        mockPlaylist,
        'serenity' as VoiceId,
        10 // Start from index 10
      );

      expect(trackIds).toEqual([
        'serenity:affirmation-10',
        'serenity:affirmation-11',
        'serenity:affirmation-12'
      ]);
    });

    test('should handle end of playlist gracefully', () => {
      const generateExpansionPrefetchTrackIds = (coordinator as any).generateExpansionPrefetchTrackIds;
      
      const trackIds = generateExpansionPrefetchTrackIds.call(
        coordinator,
        mockPlaylist,
        'serenity' as VoiceId,
        20 // Start from near end of playlist (25 total tracks)
      );

      // Should only return available tracks (20-24, which is 5 tracks)
      expect(trackIds).toHaveLength(5);
      expect(trackIds).toEqual([
        'serenity:affirmation-20',
        'serenity:affirmation-21',
        'serenity:affirmation-22',
        'serenity:affirmation-23',
        'serenity:affirmation-24'
      ]);
    });

    test('should return empty array when start index exceeds playlist length', () => {
      const generateExpansionPrefetchTrackIds = (coordinator as any).generateExpansionPrefetchTrackIds;
      
      const trackIds = generateExpansionPrefetchTrackIds.call(
        coordinator,
        mockPlaylist,
        'serenity' as VoiceId,
        30 // Beyond playlist length
      );

      expect(trackIds).toEqual([]);
    });
  });
});