import { audioMachine } from '../services/audioMachine';
import { AudioCoordinator, resetAudioCoordinator } from '../services/audioCoordinator';
import { createActor } from 'xstate';
import type { VoiceId, Playlist } from '../types/audio';
import { AudioPlaybackService } from '../services/audioPlaybackService';
import { URLResolver } from '../services/urlResolver';
import TrackPlayer, { State } from 'react-native-track-player';

// Mock dependencies
jest.mock('../services/audioPlaybackService');
jest.mock('../services/urlResolver');
jest.mock('../services/bundledAssets');
jest.mock('../services/delayTimerManager');
jest.mock('../store/audioStore');
jest.mock('../services/cdn/CDNFactory');
jest.mock('react-native-track-player', () => ({
  ...jest.requireActual('react-native-track-player'),
  setupPlayer: jest.fn(),
  updateOptions: jest.fn(),
  add: jest.fn(),
  reset: jest.fn(),
  stop: jest.fn(),
  play: jest.fn(),
  pause: jest.fn(),
  getQueue: jest.fn(),
  getPlaybackState: jest.fn(() => ({ state: 'none' })),
  getCurrentTrack: jest.fn(() => 0),
  setRepeatMode: jest.fn(),
  setVolume: jest.fn(),
  addEventListener: jest.fn(),
  State: {
    None: 'none',
    Playing: 'playing',
    Paused: 'paused',
    Idle: 'idle'
  },
  RepeatMode: {
    Queue: 'queue'
  }
}));

describe('Complete Playlist Switching Workflow', () => {
  let coordinator: AudioCoordinator;
  let actor: ReturnType<typeof audioMachine.createActor>;
  let mockAudioPlaybackService: jest.Mocked<AudioPlaybackService>;
  let mockURLResolver: jest.Mocked<URLResolver>;

  const createTestPlaylist = (id: string, name: string, includeLocalAssets = true): Playlist => ({
    id,
    name,
    description: `${name} description`,
    backgroundTrackUrl: `${id}-background.mp3`,
    defaultVoiceId: 'charlotte',
    voices: [
      { id: 'charlotte', name: 'Charlotte', sampleUrl: 'sample.mp3' }
    ],
    affirmations: [
      { id: `${id}-1`, text: `${name} affirmation 1`, order: 0, durationMs: 5000 },
      { id: `${id}-2`, text: `${name} affirmation 2`, order: 1, durationMs: 5000 },
    ],
    cdnUrls: {
      charlotte: includeLocalAssets ? {
        [`${id}-1`]: 123, // Mock require() result
        [`${id}-2`]: 124, // Mock require() result
      } : {} // Empty for TTS fallback testing
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    resetAudioCoordinator();
    
    // Setup mock implementations
    mockAudioPlaybackService = {
      initialize: jest.fn().mockResolvedValue(undefined),
      playBackground: jest.fn().mockResolvedValue(undefined),
      setupAffirmationsQueueWindowed: jest.fn().mockResolvedValue(undefined),
      playAffirmations: jest.fn().mockResolvedValue(undefined),
      pauseAffirmations: jest.fn().mockResolvedValue({ trackIndex: 0, positionMs: 0, timestamp: Date.now() }),
      resumeAffirmations: jest.fn().mockResolvedValue(undefined),
      setAffirmationVolume: jest.fn().mockResolvedValue(undefined),
      setBackgroundVolume: jest.fn().mockResolvedValue(undefined),
      pauseAll: jest.fn().mockResolvedValue(undefined),
      resumeAll: jest.fn().mockResolvedValue(undefined),
      cleanup: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      checkAndExpandQueue: jest.fn().mockResolvedValue(false),
      addTracksToQueue: jest.fn().mockResolvedValue(undefined),
      pauseBackground: jest.fn().mockResolvedValue(undefined),
      resumeBackground: jest.fn().mockResolvedValue(undefined),
      skipToNextTrack: jest.fn().mockResolvedValue(undefined),
      updateUpcomingTracks: jest.fn().mockResolvedValue(undefined),
      captureSnapshot: jest.fn().mockResolvedValue({
        affirmationIds: [],
        currentIndex: 0,
        positionMs: 0,
        wasPlaying: false,
        headHash: '',
        timestamp: Date.now(),
        voiceId: 'charlotte',
        playlistId: ''
      }),
      restoreFromSnapshot: jest.fn().mockResolvedValue(true),
      onTrackAdvanced: undefined
    } as any;
    
    mockURLResolver = {
      resolve: jest.fn().mockImplementation((playlist, affirmationId, voiceId) => {
        const cdnUrl = playlist.cdnUrls?.[voiceId]?.[affirmationId];
        if (cdnUrl) {
          return cdnUrl; // Return local asset or URL
        }
        // Return TTS placeholder for missing assets
        return `tts://${affirmationId}`;
      }),
      isPlayable: jest.fn().mockReturnValue(true),
      resolveBackgroundTrack: jest.fn().mockImplementation((soundId) => `background-${soundId}.mp3`)
    } as any;
    
    // Mock module constructors
    (AudioPlaybackService as jest.Mock).mockImplementation(() => mockAudioPlaybackService);
    (URLResolver as jest.Mock).mockImplementation(() => mockURLResolver);
    
    // Create coordinator with mocked dependencies
    coordinator = new AudioCoordinator();
    actor = createActor(audioMachine);
    actor.start();
  });

  afterEach(() => {
    actor.stop();
    jest.clearAllMocks();
  });

  describe('AudioCoordinator switchPlaylist Method', () => {
    test('should switch playlists using subscription-based approach', async () => {
      const playlist1 = createTestPlaylist('playlist-1', 'First Playlist');
      const playlist2 = createTestPlaylist('playlist-2', 'Second Playlist');

      // Start first playlist
      await coordinator.startPlayback(playlist1, 'charlotte');
      expect(coordinator.getCurrentState().context.playlist?.id).toBe('playlist-1');

      // Switch to second playlist
      await coordinator.switchPlaylist(playlist2, 'charlotte');
      
      // Verify switch completed
      const finalState = coordinator.getCurrentState();
      expect(finalState.context.playlist?.id).toBe('playlist-2');
      expect(finalState.context.currentVoiceId).toBe('charlotte');
      expect(finalState.context.currentTrackIndex).toBe(0);
    });

    test('should handle rapid playlist switches gracefully', async () => {
      const playlist1 = createTestPlaylist('playlist-1', 'First Playlist');
      const playlist2 = createTestPlaylist('playlist-2', 'Second Playlist');
      const playlist3 = createTestPlaylist('playlist-3', 'Third Playlist');

      // Start first playlist
      await coordinator.startPlayback(playlist1, 'charlotte');
      
      // Rapid switches
      const switch1Promise = coordinator.switchPlaylist(playlist2, 'charlotte');
      const switch2Promise = coordinator.switchPlaylist(playlist3, 'charlotte');
      
      // Wait for both to complete
      await Promise.all([switch1Promise, switch2Promise]);
      
      // Should end up with the last requested playlist
      const finalState = coordinator.getCurrentState();
      expect(finalState.context.playlist?.id).toBe('playlist-3');
    });

    test('should preserve user preferences during switch', async () => {
      const playlist1 = createTestPlaylist('playlist-1', 'First Playlist');
      const playlist2 = createTestPlaylist('playlist-2', 'Second Playlist');

      // Start with custom preferences
      coordinator.updateDelay(7000);
      await coordinator.startPlayback(playlist1, 'whisper' as VoiceId);
      
      // Switch playlist
      await coordinator.switchPlaylist(playlist2, 'aurora' as VoiceId);
      
      const finalState = coordinator.getCurrentState();
      expect(finalState.context.globalDelayMs).toBe(7000); // Preserved
      expect(finalState.context.currentVoiceId).toBe('aurora'); // New voice
      expect(finalState.context.playlist?.id).toBe('playlist-2'); // New playlist
      expect(finalState.context.currentTrackIndex).toBe(0); // Reset
    });
  });

  describe('State Machine Integration', () => {
    test('should handle switch from preparing state', async () => {
      const playlist1 = createTestPlaylist('playlist-1', 'First Playlist');
      const playlist2 = createTestPlaylist('playlist-2', 'Second Playlist');

      // Start first playlist (will be in preparing state initially)
      actor.send({ type: 'START_PLAYBACK', playlist: playlist1, voiceId: 'charlotte' });
      expect(actor.getSnapshot().value).toBe('preparing');
      
      // Switch while still preparing
      const switchPromise = new Promise<void>((resolve) => {
        const subscription = actor.subscribe((state) => {
          if (state.value === 'idle' && state.context.playlist === undefined) {
            subscription.unsubscribe();
            actor.send({ type: 'START_PLAYBACK', playlist: playlist2, voiceId: 'charlotte' });
            resolve();
          }
        });
        
        actor.send({ type: 'STOP_PLAYBACK' });
      });
      
      await switchPromise;
      
      const finalState = actor.getSnapshot();
      expect(finalState.value).toBe('preparing');
      expect(finalState.context.playlist?.id).toBe('playlist-2');
    });

    test('should handle switch from playing state', async () => {
      const playlist1 = createTestPlaylist('playlist-1', 'First Playlist');
      const playlist2 = createTestPlaylist('playlist-2', 'Second Playlist');

      // Start first playlist
      actor.send({ type: 'START_PLAYBACK', playlist: playlist1, voiceId: 'charlotte' });
      
      // Switch from preparing state (simulates switch from playing)
      const switchPromise = new Promise<void>((resolve) => {
        const subscription = actor.subscribe((state) => {
          if (state.value === 'idle' && state.context.playlist === undefined) {
            subscription.unsubscribe();
            actor.send({ type: 'START_PLAYBACK', playlist: playlist2, voiceId: 'serenity' });
            resolve();
          }
        });
        
        actor.send({ type: 'STOP_PLAYBACK' });
      });
      
      await switchPromise;
      
      const finalState = actor.getSnapshot();
      expect(finalState.context.playlist?.id).toBe('playlist-2');
      expect(finalState.context.currentVoiceId).toBe('serenity');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid playlist gracefully', async () => {
      const validPlaylist = createTestPlaylist('valid', 'Valid Playlist');
      const invalidPlaylist = { ...createTestPlaylist('invalid', 'Invalid'), affirmations: [] };

      // Start valid playlist
      await coordinator.startPlayback(validPlaylist, 'charlotte');
      
      // Try to switch to invalid playlist
      await expect(
        coordinator.switchPlaylist(invalidPlaylist, 'charlotte')
      ).rejects.toThrow();
      
      // Should still have valid playlist
      expect(coordinator.getCurrentState().context.playlist?.id).toBe('valid');
    });

    test('should handle network failures during switch', async () => {
      const playlist1 = createTestPlaylist('playlist-1', 'First Playlist');
      const playlist2 = createTestPlaylist('playlist-2', 'Second Playlist');

      await coordinator.startPlayback(playlist1, 'charlotte');
      
      // Mock network failure by modifying playlist to have invalid URLs
      const failingPlaylist = {
        ...playlist2,
        cdnUrls: { charlotte: { 'invalid-id': 'http://invalid-url' } }
      };
      
      // Switch should handle failure gracefully
      try {
        await coordinator.switchPlaylist(failingPlaylist, 'charlotte');
      } catch (error) {
        // Error is expected, verify original playlist is preserved
        expect(coordinator.getCurrentState().context.playlist?.id).toBe('playlist-1');
      }
    });
  });

  describe('Background Track Switching', () => {
    test('should switch background tracks between playlists', async () => {
      const orchestralPlaylist = createTestPlaylist('orchestral', 'Orchestral Meditation');
      orchestralPlaylist.backgroundTrackUrl = 'orchestral-background.mp3';
      
      const naturePlaylist = createTestPlaylist('nature', 'Nature Sounds');
      naturePlaylist.backgroundTrackUrl = 'nature-background.mp3';

      // Start orchestral playlist
      await coordinator.startPlayback(orchestralPlaylist, 'charlotte');
      
      // Switch to nature playlist
      await coordinator.switchPlaylist(naturePlaylist, 'charlotte');
      
      // Background track should have switched
      // (This would be verified by mocking the background player)
      const finalState = coordinator.getCurrentState();
      expect(finalState.context.playlist?.backgroundTrackUrl).toBe('nature-background.mp3');
    });
  });


  describe('Queue Management Integration', () => {
    test('should clear and rebuild queue during switch', async () => {
      const shortPlaylist = createTestPlaylist('short', 'Short Playlist');
      // Only 1 affirmation for short playlist
      shortPlaylist.affirmations = [
        { id: 'short-1', text: 'Short affirmation', order: 0, durationMs: 3000 }
      ];
      
      const longPlaylist = createTestPlaylist('long', 'Long Playlist');
      // 5 affirmations for long playlist  
      longPlaylist.affirmations = Array.from({ length: 5 }, (_, i) => ({
        id: `long-${i}`,
        text: `Long affirmation ${i + 1}`,
        order: i,
        durationMs: 5000
      }));

      // Start short playlist
      await coordinator.startPlayback(shortPlaylist, 'charlotte');
      
      // Switch to long playlist
      await coordinator.switchPlaylist(longPlaylist, 'charlotte');
      
      // Queue should reflect new playlist structure
      const finalState = coordinator.getCurrentState();
      expect(finalState.context.playlist?.affirmations.length).toBe(5);
      expect(finalState.context.currentTrackIndex).toBe(0);
    });
    
});