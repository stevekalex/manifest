import { AudioPlaybackService } from '../services/audioPlaybackService';
import type { Track } from 'react-native-track-player';

// Mock TrackPlayer with all required methods and constants
jest.mock('react-native-track-player', () => ({
  setupPlayer: jest.fn(() => Promise.resolve()),
  updateOptions: jest.fn(() => Promise.resolve()),
  addEventListener: jest.fn(() => jest.fn()),
  removeEventListener: jest.fn(),
  reset: jest.fn(() => Promise.resolve()),
  add: jest.fn(() => Promise.resolve()),
  remove: jest.fn(() => Promise.resolve()),
  play: jest.fn(() => Promise.resolve()),
  pause: jest.fn(() => Promise.resolve()),
  stop: jest.fn(() => Promise.resolve()),
  setRepeatMode: jest.fn(() => Promise.resolve()),
  getQueue: jest.fn(() => Promise.resolve([])),
  getCurrentTrack: jest.fn(() => Promise.resolve(0)),
  getActiveTrack: jest.fn(() => Promise.resolve(null)),
  getPlaybackState: jest.fn(() => Promise.resolve({ state: 'idle' })),
  getProgress: jest.fn(() => Promise.resolve({ position: 0, duration: 0 })),
  RepeatMode: { Queue: 'queue' },
  State: { None: 'none', Playing: 'playing', Paused: 'paused' },
  Event: {
    PlaybackTrackChanged: 'playback-track-changed',
    PlaybackQueueEnded: 'playback-queue-ended',
    RemotePlay: 'remote-play',
    RemotePause: 'remote-pause',
    RemoteNext: 'remote-next',
    RemotePrevious: 'remote-previous',
  },
  Capability: {
    Play: 'play',
    Pause: 'pause',
    SkipToNext: 'skip-to-next',
    SkipToPrevious: 'skip-to-previous',
  },
  IOSCategoryMode: { SpokenAudio: 'spoken-audio' },
  IOSCategoryOptions: { MixWithOthers: 'mix-with-others' },
  AndroidAudioContentType: { Speech: 'speech' },
}));

jest.mock('../services/backgroundPlayer');
jest.mock('../store/audioStore');

describe('Phase 4: Queue Management', () => {
  let service: AudioPlaybackService;
  let mockTracks: Track[];

  beforeEach(() => {
    jest.clearAllMocks();
    
    service = new AudioPlaybackService();
    
    // Create mock tracks for testing
    mockTracks = [
      { id: 'track-0', url: 'test-url-0', title: 'Track 0', artist: 'Test Artist' },
      { id: 'track-1', url: 'test-url-1', title: 'Track 1', artist: 'Test Artist' },
      { id: 'track-2', url: 'test-url-2', title: 'Track 2', artist: 'Test Artist' },
      { id: 'track-3', url: 'test-url-3', title: 'Track 3', artist: 'Test Artist' },
      { id: 'track-4', url: 'test-url-4', title: 'Track 4', artist: 'Test Artist' },
    ];
  });

  describe('Current Queue Management Behavior', () => {
    test('should set up initial queue with all tracks', async () => {
      const TrackPlayer = require('react-native-track-player');
      TrackPlayer.getQueue.mockResolvedValue(mockTracks);
      
      await service.setupAffirmationsQueue(mockTracks);
      
      expect(TrackPlayer.reset).toHaveBeenCalledTimes(1);
      expect(TrackPlayer.add).toHaveBeenCalledWith(mockTracks);
      expect(TrackPlayer.setRepeatMode).toHaveBeenCalled();
    });

    test('should update upcoming tracks correctly', async () => {
      const TrackPlayer = require('react-native-track-player');
      TrackPlayer.getQueue.mockResolvedValue(mockTracks);
      TrackPlayer.getCurrentTrack.mockResolvedValue(1); // Currently on track 1
      
      const newTracks = [
        { id: 'new-track-2', url: 'new-url-2', title: 'New Track 2', artist: 'Test Artist' },
        { id: 'new-track-3', url: 'new-url-3', title: 'New Track 3', artist: 'Test Artist' },
      ];
      
      await service.updateUpcomingTracks(newTracks, 2);
      
      // Should remove tracks from index 2 onwards (3 tracks: indices 2, 3, 4)
      expect(TrackPlayer.remove).toHaveBeenCalledWith([2, 3, 4]);
      // Should add new tracks
      expect(TrackPlayer.add).toHaveBeenCalledWith(newTracks);
    });

    test('should not update tracks that have already played', async () => {
      const TrackPlayer = require('react-native-track-player');
      TrackPlayer.getCurrentTrack.mockResolvedValue(2); // Currently on track 2
      
      // Try to update from index 1 (before current track)
      await service.updateUpcomingTracks(mockTracks.slice(1), 1);
      
      // Should not perform any updates
      expect(TrackPlayer.remove).not.toHaveBeenCalled();
      expect(TrackPlayer.add).not.toHaveBeenCalled();
    });
  });

  describe('Queue State Validation', () => {
    test('should verify queue integrity after setup', async () => {
      const TrackPlayer = require('react-native-track-player');
      TrackPlayer.getQueue.mockResolvedValue(mockTracks);
      
      await service.setupAffirmationsQueue(mockTracks);
      
      // Should verify final queue state
      expect(TrackPlayer.getQueue).toHaveBeenCalled();
    });

    test('should handle empty queue gracefully', async () => {
      const TrackPlayer = require('react-native-track-player');
      TrackPlayer.getQueue.mockResolvedValue([]);
      
      await service.setupAffirmationsQueue([]);
      
      expect(TrackPlayer.reset).toHaveBeenCalled();
      expect(TrackPlayer.add).toHaveBeenCalledWith([]);
    });
  });

  describe('Phase 4: Enhanced Queue Management', () => {
    test('should initialize with configurable queue settings', () => {
      const customConfig = {
        initialWindowSize: 5,
        enableDynamicLoading: true,
      };
      
      const customService = new AudioPlaybackService(customConfig);
      
      // Service should accept custom config
      expect(customService).toBeDefined();
    });

    test('should use legacy method when dynamic loading is disabled', async () => {
      const TrackPlayer = require('react-native-track-player');
      TrackPlayer.getQueue.mockResolvedValue(mockTracks);
      
      // Service with dynamic loading disabled (default)
      await service.setupAffirmationsQueueWindowed(mockTracks);
      
      // Should call standard setup
      expect(TrackPlayer.reset).toHaveBeenCalled();
      expect(TrackPlayer.add).toHaveBeenCalledWith(mockTracks);
    });

    test('should use legacy method when track count is small', async () => {
      const TrackPlayer = require('react-native-track-player');
      TrackPlayer.getQueue.mockResolvedValue(mockTracks.slice(0, 2));
      
      const customService = new AudioPlaybackService({ enableDynamicLoading: true });
      const smallTrackList = mockTracks.slice(0, 2); // Less than default window size
      
      await customService.setupAffirmationsQueueWindowed(smallTrackList);
      
      // Should use legacy method for small lists
      expect(TrackPlayer.add).toHaveBeenCalledWith(smallTrackList);
    });

    test('should setup windowed queue when dynamic loading is enabled', async () => {
      const TrackPlayer = require('react-native-track-player');
      TrackPlayer.getQueue.mockResolvedValue(mockTracks.slice(0, 3));
      
      const customService = new AudioPlaybackService({ 
        enableDynamicLoading: true,
        initialWindowSize: 3 
      });
      
      await customService.setupAffirmationsQueueWindowed(mockTracks);
      
      // Should only add initial window
      expect(TrackPlayer.add).toHaveBeenCalledWith(mockTracks.slice(0, 3));
    });

    test('should check and expand queue when needed', async () => {
      const TrackPlayer = require('react-native-track-player');
      
      // Mock current state: at track 2 of 3, so only 1 track remaining
      TrackPlayer.getQueue.mockResolvedValue(mockTracks.slice(0, 3));
      TrackPlayer.getCurrentTrack.mockResolvedValue(1); // At track index 1
      
      const customService = new AudioPlaybackService({ 
        enableDynamicLoading: true,
        preloadThreshold: 1,
        expansionSize: 2
      });
      
      // Setup with full track list
      await customService.setupAffirmationsQueueWindowed(mockTracks);
      
      // Check if expansion is needed (should be true since only 1 track remaining)
      const expanded = await customService.checkAndExpandQueue();
      
      expect(expanded).toBe(true);
      expect(TrackPlayer.add).toHaveBeenCalledTimes(2); // Initial setup + expansion
    });

    test('should not expand queue when not needed', async () => {
      const TrackPlayer = require('react-native-track-player');
      
      // Mock current state: at track 0 of 3, so 2 tracks remaining
      TrackPlayer.getQueue.mockResolvedValue(mockTracks.slice(0, 3));
      TrackPlayer.getCurrentTrack.mockResolvedValue(0); // At track index 0
      
      const customService = new AudioPlaybackService({ 
        enableDynamicLoading: true,
        preloadThreshold: 1,
        expansionSize: 2
      });
      
      // Setup with full track list
      await customService.setupAffirmationsQueueWindowed(mockTracks);
      
      // Check if expansion is needed (should be false since 2 tracks remaining > threshold)
      const expanded = await customService.checkAndExpandQueue();
      
      expect(expanded).toBe(false);
    });
  });

  describe('Queue Window Analysis', () => {
    test('should understand current queue window size', () => {
      // Test current QUEUE_WINDOW_SIZE constant
      const audioPlaybackServiceModule = require('../services/audioPlaybackService');
      
      // Read the source to understand current window size
      // This test documents current behavior before we change it
      expect(typeof audioPlaybackServiceModule.AudioPlaybackService).toBe('function');
    });
  });
});