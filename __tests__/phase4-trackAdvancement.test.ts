import { AudioPlaybackService } from '../services/audioPlaybackService';

// Mock React Native Track Player
const mockTrackPlayer = {
  addEventListener: jest.fn(),
  getQueue: jest.fn(),
  getCurrentTrack: jest.fn(),
  getProgress: jest.fn(),
  getPlaybackState: jest.fn(),
  getActiveTrack: jest.fn(),
  play: jest.fn(),
  pause: jest.fn(),
  seekTo: jest.fn(),
  stop: jest.fn(),
  reset: jest.fn(),
};

jest.mock('react-native-track-player', () => ({
  __esModule: true,
  default: mockTrackPlayer,
  TrackPlayer: mockTrackPlayer,
  TrackPlayerEvent: {
    PlaybackTrackChanged: 'playback-track-changed',
    PlaybackError: 'playback-error',
  },
  State: {
    Playing: 'playing',
    Paused: 'paused',
    Buffering: 'buffering',
    None: 'none',
  }
}));

// Mock React Native and other dependencies
jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

jest.mock('../store/audioStore', () => ({
  useAudioStore: {
    getState: () => ({ globalDelayMs: 3000 }),
  },
}));

describe('Phase 4: Track Advancement Optimization', () => {
  let audioService: AudioPlaybackService;
  let trackAdvancedCallback: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    audioService = new AudioPlaybackService();
    trackAdvancedCallback = jest.fn();
    audioService.onTrackAdvanced = trackAdvancedCallback;
  });

  afterEach(() => {
    audioService.cleanup();
  });

  describe('Smart Debouncing', () => {
    test('should process track change immediately when index changes', () => {
      let trackChangedHandler: (event: any) => void;
      
      mockTrackPlayer.addEventListener.mockImplementation((event: string, handler: any) => {
        if (event === 'playback-track-changed') {
          trackChangedHandler = handler;
        }
      });

      // Create a fresh service to trigger addEventListener
      const service = new AudioPlaybackService();
      service.onTrackAdvanced = trackAdvancedCallback;

      // Simulate track advancement from index 0 to 1
      if (trackChangedHandler) {
        trackChangedHandler({ nextTrack: 1, track: null });
      }
      
      expect(trackAdvancedCallback).toHaveBeenCalledWith(1);
      expect(trackAdvancedCallback).toHaveBeenCalledTimes(1);
      service.cleanup();
    });

    test('should debounce duplicate events for same track index', () => {
      let trackChangedHandler: (event: any) => void;
      
      mockTrackPlayer.addEventListener.mockImplementation((event: string, handler: any) => {
        if (event === 'playback-track-changed') {
          trackChangedHandler = handler;
        }
      });

      const service = new AudioPlaybackService();
      service.onTrackAdvanced = trackAdvancedCallback;

      // First call to track 1 - should process
      if (trackChangedHandler) {
        trackChangedHandler({ nextTrack: 1, track: null });
      }
      expect(trackAdvancedCallback).toHaveBeenCalledTimes(1);

      // Immediate duplicate call to track 1 - should be debounced
      if (trackChangedHandler) {
        trackChangedHandler({ nextTrack: 1, track: null });
      }
      expect(trackAdvancedCallback).toHaveBeenCalledTimes(1);
      
      // Different track - should process immediately
      if (trackChangedHandler) {
        trackChangedHandler({ nextTrack: 2, track: null });
      }
      expect(trackAdvancedCallback).toHaveBeenCalledTimes(2);
      service.cleanup();
    });

    test('should allow duplicate events after debounce period', (done) => {
      let trackChangedHandler: (event: any) => void;
      
      mockTrackPlayer.addEventListener.mockImplementation((event: string, handler: any) => {
        if (event === 'playback-track-changed') {
          trackChangedHandler = handler;
        }
      });

      const service = new AudioPlaybackService();
      service.onTrackAdvanced = trackAdvancedCallback;

      // First call to track 1
      if (trackChangedHandler) {
        trackChangedHandler({ nextTrack: 1, track: null });
      }
      expect(trackAdvancedCallback).toHaveBeenCalledTimes(1);

      // Wait for debounce period (50ms + buffer)
      setTimeout(() => {
        // Second call to same track after debounce - should process
        if (trackChangedHandler) {
          trackChangedHandler({ nextTrack: 1, track: null });
        }
        expect(trackAdvancedCallback).toHaveBeenCalledTimes(2);
        service.cleanup();
        done();
      }, 60);
    });
  });

  describe('Seamless Resume', () => {
    beforeEach(() => {
      // Reset mocks before each resume test
      mockTrackPlayer.getProgress.mockReset();
      mockTrackPlayer.getCurrentTrack.mockReset();
      mockTrackPlayer.getPlaybackState.mockReset();
      mockTrackPlayer.getActiveTrack.mockReset();
      mockTrackPlayer.seekTo.mockReset();
      mockTrackPlayer.play.mockReset();
    });

    test('should skip seek when position is already correct', async () => {
      // Mock current state matches paused state exactly
      mockTrackPlayer.getProgress.mockResolvedValue({ position: 10.5, duration: 60 });
      mockTrackPlayer.getCurrentTrack.mockResolvedValue(2);
      mockTrackPlayer.getPlaybackState.mockResolvedValue({ state: 'paused' });
      mockTrackPlayer.getActiveTrack.mockResolvedValue({ id: 'track-2', title: 'Track 2' });

      const pausedState = {
        trackIndex: 2,
        positionMs: 10500, // 10.5 seconds
        timestamp: Date.now()
      };

      await audioService.resumeAffirmations(pausedState);

      // Should play without seeking
      expect(mockTrackPlayer.seekTo).not.toHaveBeenCalled();
      expect(mockTrackPlayer.play).toHaveBeenCalledTimes(1);
    });

    test('should seek when position differs significantly', async () => {
      // Mock current position different from paused state
      mockTrackPlayer.getProgress.mockResolvedValue({ position: 5.0, duration: 60 });
      mockTrackPlayer.getCurrentTrack.mockResolvedValue(2);
      mockTrackPlayer.getPlaybackState.mockResolvedValue({ state: 'paused' });
      mockTrackPlayer.getActiveTrack.mockResolvedValue({ id: 'track-2', title: 'Track 2' });

      const pausedState = {
        trackIndex: 2,
        positionMs: 10500, // 10.5 seconds (5.5s difference > 0.1s threshold)
        timestamp: Date.now()
      };

      await audioService.resumeAffirmations(pausedState);

      // Should seek to correct position then play
      expect(mockTrackPlayer.seekTo).toHaveBeenCalledWith(10.5);
      expect(mockTrackPlayer.play).toHaveBeenCalledTimes(1);
    });

    test('should handle resume errors gracefully', async () => {
      // Mock getProgress to throw error
      mockTrackPlayer.getProgress.mockRejectedValue(new Error('Player not ready'));
      mockTrackPlayer.play.mockResolvedValue(undefined);

      const pausedState = {
        trackIndex: 2,
        positionMs: 10500,
        timestamp: Date.now()
      };

      // Should not throw and fallback to simple play
      await expect(audioService.resumeAffirmations(pausedState)).resolves.not.toThrow();
      expect(mockTrackPlayer.play).toHaveBeenCalled();
    });
  });

  describe('Queue Management State Safety', () => {
    test('should expose checkAndExpandQueue method', () => {
      expect(typeof audioService.checkAndExpandQueue).toBe('function');
    });

    test('should handle queue expansion errors gracefully', async () => {
      // Mock queue expansion failure
      mockTrackPlayer.getQueue.mockRejectedValue(new Error('Queue unavailable'));
      mockTrackPlayer.getCurrentTrack.mockRejectedValue(new Error('No track'));

      const result = await audioService.checkAndExpandQueue();
      expect(result).toBe(false); // Should return false on error
    });
  });

  describe('Event Suppression Integration', () => {
    test('should respect event suppression flags', () => {
      let trackChangedHandler: (event: any) => void;
      
      mockTrackPlayer.addEventListener.mockImplementation((event: string, handler: any) => {
        if (event === 'playback-track-changed') {
          trackChangedHandler = handler;
        }
      });

      const service = new AudioPlaybackService();
      service.onTrackAdvanced = trackAdvancedCallback;
      
      // Enable event suppression
      service.shouldSuppressEvents = () => true;

      if (trackChangedHandler) {
        trackChangedHandler({ nextTrack: 1, track: null });
      }
      
      // Should not call callback when suppressed
      expect(trackAdvancedCallback).not.toHaveBeenCalled();
      service.cleanup();
    });

    test('should process events when suppression disabled', () => {
      let trackChangedHandler: (event: any) => void;
      
      mockTrackPlayer.addEventListener.mockImplementation((event: string, handler: any) => {
        if (event === 'playback-track-changed') {
          trackChangedHandler = handler;
        }
      });

      const service = new AudioPlaybackService();
      service.onTrackAdvanced = trackAdvancedCallback;
      
      // Disable event suppression
      service.shouldSuppressEvents = () => false;

      if (trackChangedHandler) {
        trackChangedHandler({ nextTrack: 1, track: null });
      }
      
      // Should call callback when not suppressed
      expect(trackAdvancedCallback).toHaveBeenCalledWith(1);
      service.cleanup();
    });
  });

  describe('Edge Cases', () => {
    test('should handle null track index gracefully', () => {
      let trackChangedHandler: (event: any) => void;
      
      mockTrackPlayer.addEventListener.mockImplementation((event: string, handler: any) => {
        if (event === 'playback-track-changed') {
          trackChangedHandler = handler;
        }
      });

      const service = new AudioPlaybackService();
      service.onTrackAdvanced = trackAdvancedCallback;

      if (trackChangedHandler) {
        trackChangedHandler({ nextTrack: null, track: null });
      }
      
      // Should not call callback for null track
      expect(trackAdvancedCallback).not.toHaveBeenCalled();
      service.cleanup();
    });

    test('should handle missing callback gracefully', () => {
      let trackChangedHandler: (event: any) => void;
      
      mockTrackPlayer.addEventListener.mockImplementation((event: string, handler: any) => {
        if (event === 'playback-track-changed') {
          trackChangedHandler = handler;
        }
      });

      const service = new AudioPlaybackService();
      // Don't set callback

      // Should not throw error
      expect(() => {
        if (trackChangedHandler) {
          trackChangedHandler({ nextTrack: 1, track: null });
        }
      }).not.toThrow();
      service.cleanup();
    });

    test('should resume without paused state', async () => {
      mockTrackPlayer.getPlaybackState.mockResolvedValue({ state: 'paused' });
      mockTrackPlayer.getActiveTrack.mockResolvedValue({ id: 'track-1', title: 'Track 1' });

      // Should not throw and just call play
      await expect(audioService.resumeAffirmations()).resolves.not.toThrow();
      expect(mockTrackPlayer.play).toHaveBeenCalledTimes(1);
      expect(mockTrackPlayer.seekTo).not.toHaveBeenCalled();
    });
  });
});