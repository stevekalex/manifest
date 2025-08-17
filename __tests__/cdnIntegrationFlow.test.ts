/**
 * Integration tests for the complete CDN flow
 * Tests the full journey from playlist selection through CDN prefetching to queue management
 */

import { AudioCoordinator } from '../services/audioCoordinator';
import { CDNFactory } from '../services/cdn/CDNFactory';
import { URLResolver } from '../services/urlResolver';
import { BundledAssets } from '../services/bundledAssets';
import { AudioPlaybackService } from '../services/audioPlaybackService';
import type { Playlist, VoiceId, Track } from '../types/audio';
import type { ICDNClient } from '../services/cdn/types';
import TrackPlayer from 'react-native-track-player';

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
  pause: jest.fn().mockResolvedValue(undefined),
  getQueue: jest.fn().mockResolvedValue([]),
  getCurrentTrack: jest.fn().mockResolvedValue(0),
  getProgress: jest.fn().mockResolvedValue({ position: 0, duration: 0 }),
  getPlaybackState: jest.fn().mockResolvedValue({ state: 'none' }),
  skip: jest.fn().mockResolvedValue(undefined),
  seekTo: jest.fn().mockResolvedValue(undefined),
  setVolume: jest.fn().mockResolvedValue(undefined),
  getActiveTrack: jest.fn().mockResolvedValue(null),
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
    getAsset: jest.fn().mockReturnValue('mock-bundled-asset-path'),
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

// Mock AudioPlaybackService
jest.mock('../services/audioPlaybackService', () => ({
  AudioPlaybackService: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    playBackground: jest.fn().mockResolvedValue(undefined),
    setupAffirmationsQueueWindowed: jest.fn().mockResolvedValue(undefined),
    playAffirmations: jest.fn().mockResolvedValue(undefined),
    pauseAffirmations: jest.fn().mockResolvedValue({ trackIndex: 0, positionMs: 0, timestamp: Date.now() }),
    resumeAffirmations: jest.fn().mockResolvedValue(undefined),
    setAffirmationVolume: jest.fn().mockResolvedValue(undefined),
    setBackgroundVolume: jest.fn().mockResolvedValue(undefined),
    addTracksToQueue: jest.fn().mockResolvedValue(undefined),
    checkAndExpandQueue: jest.fn().mockResolvedValue(false),
    updateUpcomingTracks: jest.fn().mockResolvedValue(undefined),
    pauseAll: jest.fn().mockResolvedValue(undefined),
    resumeAll: jest.fn().mockResolvedValue(undefined),
    pauseBackground: jest.fn().mockResolvedValue(undefined),
    resumeBackground: jest.fn().mockResolvedValue(undefined),
    switchBackground: jest.fn().mockResolvedValue(undefined),
    captureSnapshot: jest.fn().mockResolvedValue({
      affirmationIds: [],
      currentIndex: 0,
      positionMs: 0,
      wasPlaying: false,
      headHash: '',
      timestamp: Date.now(),
      voiceId: 'serenity',
      playlistId: 'test'
    }),
    restoreFromSnapshot: jest.fn().mockResolvedValue(true),
    cleanup: jest.fn().mockResolvedValue(undefined),
    onTrackAdvanced: undefined,
    shouldSuppressEvents: undefined,
    getAudioSystem: jest.fn().mockReturnValue({
      getQueue: jest.fn().mockResolvedValue([])
    })
  }))
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

describe('CDN Integration Flow', () => {
  let coordinator: AudioCoordinator;
  let mockCDNClient: ICDNClient;
  let mockCDNFactory: CDNFactory;
  let mockPlaylist: Playlist;
  let trackPlayerMock: any;
  let mockAudioService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    trackPlayerMock = TrackPlayer as jest.Mocked<typeof TrackPlayer>;

    // Create mock CDN client
    mockCDNClient = {
      loadManifest: jest.fn().mockResolvedValue({
        version: '1.0.0',
        updatedAt: '2025-01-15T12:00:00Z',
        voices: []
      }),
      getPlayableUrl: jest.fn().mockImplementation((trackId) => {
        // Return different URLs based on track ID to simulate CDN behavior
        return Promise.resolve(`file:///mock/cache/${trackId}.mp3`);
      }),
      isAvailable: jest.fn().mockImplementation((trackId) => {
        // Simulate some tracks being available in cache
        const cachedTracks = [
          'serenity:affirmation-3',
          'serenity:affirmation-4',
          'serenity:affirmation-5',
          'serenity:affirmation-6',
          'serenity:affirmation-7',
          'serenity:affirmation-8'
        ];
        return cachedTracks.includes(trackId);
      }),
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

    // Create test playlist
    mockPlaylist = {
      id: 'test-playlist',
      name: 'Test Playlist',
      description: 'Test playlist for integration testing',
      backgroundTrackUrl: 'test-background.mp3',
      defaultVoiceId: 'serenity',
      voices: [
        { id: 'serenity', name: 'Serenity' },
        { id: 'titan', name: 'Titan' }
      ],
      affirmations: Array.from({ length: 15 }, (_, i) => ({
        id: `affirmation-${i}`,
        text: `Test affirmation ${i}`
      })),
      cdnUrls: {
        serenity: Object.fromEntries(
          Array.from({ length: 15 }, (_, i) => [`affirmation-${i}`, `tts://serenity/affirmation-${i}`])
        )
      }
    };

    coordinator = new AudioCoordinator(mockCDNFactory);
    
    // Get the mocked audio service instance
    const AudioPlaybackService = require('../services/audioPlaybackService').AudioPlaybackService;
    mockAudioService = AudioPlaybackService.mock.results[0]?.value;
  });

  afterEach(async () => {
    if (coordinator) {
      await coordinator.cleanup();
    }
  });

  describe('End-to-end CDN flow', () => {
    test('should complete full flow: playlist selection → CDN prefetch → queue addition', async () => {
      // Setup initial queue mock
      let mockQueue: Track[] = [];
      trackPlayerMock.getQueue.mockImplementation(() => Promise.resolve(mockQueue));
      trackPlayerMock.add.mockImplementation((tracks) => {
        mockQueue = [...mockQueue, ...tracks];
        return Promise.resolve();
      });

      // Select playlist - this should trigger the entire flow
      await coordinator.selectPlaylist(mockPlaylist);

      // Wait for initial bootstrap
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify initial setup through audio service
      expect(mockAudioService.initialize).toHaveBeenCalled();
      expect(mockAudioService.playBackground).toHaveBeenCalled();
      expect(mockAudioService.setupAffirmationsQueueWindowed).toHaveBeenCalled();
      expect(mockAudioService.playAffirmations).toHaveBeenCalled();

      // Verify initial queue setup with 3 tracks
      const setupCall = mockAudioService.setupAffirmationsQueueWindowed.mock.calls[0];
      expect(setupCall[0]).toHaveLength(3);
      expect(setupCall[0][0]).toMatchObject({ id: 'affirmation-0' });
      expect(setupCall[0][1]).toMatchObject({ id: 'affirmation-1' });
      expect(setupCall[0][2]).toMatchObject({ id: 'affirmation-2' });

      // Verify CDN prefetch was triggered for tracks 3-5
      expect(mockCDNClient.prefetch).toHaveBeenCalledWith([
        'serenity:affirmation-3',
        'serenity:affirmation-4',
        'serenity:affirmation-5'
      ]);

      // Wait for prefetched tracks to be added to queue (2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2100));

      // Verify prefetched tracks were added to queue
      expect(mockAudioService.addTracksToQueue).toHaveBeenCalled();
      const addTracksCall = mockAudioService.addTracksToQueue.mock.calls[0];
      if (addTracksCall) {
        expect(addTracksCall[0]).toHaveLength(3);
        expect(addTracksCall[0][0]).toMatchObject({ 
          id: 'affirmation-3',
          url: 'file:///mock/cache/serenity:affirmation-3.mp3'
        });
        expect(addTracksCall[0][1]).toMatchObject({ 
          id: 'affirmation-4',
          url: 'file:///mock/cache/serenity:affirmation-4.mp3'
        });
        expect(addTracksCall[0][2]).toMatchObject({ 
          id: 'affirmation-5',
          url: 'file:///mock/cache/serenity:affirmation-5.mp3'
        });
      }
    });

    test('should handle queue expansion with CDN prefetch', async () => {
      // Setup coordinator with tracks already loaded
      await coordinator.selectPlaylist(mockPlaylist);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Clear previous mock calls
      jest.clearAllMocks();

      // Simulate queue expansion by manually triggering it
      const audioSystem = coordinator.getAudioSystem();
      
      // Mock the queue state for expansion
      (audioSystem as any).allTracks = mockPlaylist.affirmations.map(a => ({ id: a.id }));
      (audioSystem as any).currentWindowStart = 0;
      (audioSystem as any).queueConfig = { 
        enableDynamicLoading: true,
        preloadThreshold: 1,
        expansionSize: 2,
        maxWindowSize: 8
      };

      // Mock checkAndExpandQueue to return true
      mockAudioService.checkAndExpandQueue.mockResolvedValueOnce(true);

      // Trigger queue expansion check
      const expanded = await audioSystem.checkAndExpandQueue();
      expect(expanded).toBe(true);

      // Wait for expansion prefetch
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify expansion prefetch was triggered for next tracks
      expect(mockCDNClient.prefetch).toHaveBeenCalledWith(
        expect.arrayContaining([
          'serenity:affirmation-5',
          'serenity:affirmation-6',
          'serenity:affirmation-7'
        ])
      );
    });

    test('should handle CDN failures gracefully', async () => {
      // Make CDN operations fail
      mockCDNClient.prefetch = jest.fn().mockRejectedValue(new Error('Network error'));
      mockCDNClient.isAvailable = jest.fn().mockReturnValue(false);

      // Select playlist - should still work despite CDN failures
      await coordinator.selectPlaylist(mockPlaylist);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify basic playback still works
      expect(mockAudioService.playAffirmations).toHaveBeenCalled();
      
      // Initial queue should use bundled assets as fallback
      const setupCall = mockAudioService.setupAffirmationsQueueWindowed.mock.calls[0];
      expect(setupCall[0][0]).toMatchObject({ 
        id: 'affirmation-0',
        url: 'mock-bundled-asset-path' // Fallback to bundled
      });
    });

    test('should coordinate URLResolver with CDN client', async () => {
      // Create separate instances to test integration
      const bundledAssets = new BundledAssets();
      const urlResolver = new URLResolver(bundledAssets, mockCDNClient);
      const audioService = new AudioPlaybackService(undefined, urlResolver);

      // Test URL resolution with CDN
      const resolvedUrl = await urlResolver.resolve(
        mockPlaylist,
        'affirmation-3',
        'serenity' as VoiceId
      );

      // Should use CDN URL since it's available
      expect(resolvedUrl).toBe('file:///mock/cache/serenity:affirmation-3.mp3');
      expect(mockCDNClient.isAvailable).toHaveBeenCalledWith('serenity:affirmation-3');
      expect(mockCDNClient.getPlayableUrl).toHaveBeenCalledWith('serenity:affirmation-3');

      await audioService.cleanup();
    });

    test('should handle voice switching with CDN', async () => {
      // Select initial playlist
      await coordinator.selectPlaylist(mockPlaylist);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Clear mocks
      jest.clearAllMocks();

      // Mock pause state
      trackPlayerMock.getProgress.mockResolvedValue({ position: 5, duration: 30 });
      trackPlayerMock.getCurrentTrack.mockResolvedValue(2);

      // Open voice modal and switch voice
      coordinator.openVoiceModal();
      await coordinator.confirmVoiceSelection('titan' as VoiceId);

      // Wait for voice switch
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify voice switch operations
      expect(mockAudioService.pauseAffirmations).toHaveBeenCalled();
      expect(mockAudioService.updateUpcomingTracks).toHaveBeenCalled();
      expect(mockAudioService.resumeAffirmations).toHaveBeenCalled();
    });

    test('should maintain queue continuity across operations', async () => {
      // Track queue operations through audio service
      const queuedTracks: Track[] = [];
      
      mockAudioService.setupAffirmationsQueueWindowed.mockImplementation((tracks) => {
        queuedTracks.push(...tracks);
        return Promise.resolve();
      });
      
      mockAudioService.addTracksToQueue.mockImplementation((tracks) => {
        queuedTracks.push(...tracks);
        return Promise.resolve();
      });

      // Select playlist
      await coordinator.selectPlaylist(mockPlaylist);
      
      // Wait for all async operations (initial + prefetch addition)
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Final queue should have initial 3 + prefetched 3 = 6 tracks
      expect(queuedTracks.length).toBe(6);
      expect(queuedTracks.map(t => t.id)).toEqual([
        'affirmation-0',
        'affirmation-1',
        'affirmation-2',
        'affirmation-3',
        'affirmation-4',
        'affirmation-5'
      ]);

      // Verify all tracks have valid URLs
      queuedTracks.forEach(track => {
        expect(track.url).toBeTruthy();
        expect(typeof track.url).toBe('string');
      });
    });
  });

  describe('Performance and timing', () => {
    test('should complete initial playback quickly without waiting for prefetch', async () => {
      const startTime = Date.now();
      
      // Make prefetch slow
      mockCDNClient.prefetch = jest.fn(() => 
        new Promise(resolve => setTimeout(resolve, 5000))
      );

      await coordinator.selectPlaylist(mockPlaylist);
      
      // Initial playback should start quickly
      const playbackStartTime = Date.now() - startTime;
      expect(playbackStartTime).toBeLessThan(1000); // Should start within 1 second
      
      expect(mockAudioService.playAffirmations).toHaveBeenCalled();
    });

    test('should handle concurrent operations correctly', async () => {
      // Start multiple operations concurrently
      const operations = Promise.all([
        coordinator.selectPlaylist(mockPlaylist),
        new Promise(resolve => setTimeout(() => {
          coordinator.updateDelay(5000);
          resolve(undefined);
        }, 50)),
        new Promise(resolve => setTimeout(() => {
          coordinator.pause();
          resolve(undefined);
        }, 100))
      ]);

      await operations;
      
      // Verify no errors occurred
      expect(true).toBe(true); // If we get here, no errors were thrown
    });
  });
});