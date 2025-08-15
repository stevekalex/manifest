import { AudioCoordinator, getAudioCoordinator } from '../services/audioCoordinator';
import { BundledAssets } from '../services/bundledAssets';
import { URLResolver } from '../services/urlResolver';
import type { Playlist } from '../types/audio';

// Mock dependencies
jest.mock('../services/audioPlaybackService');
jest.mock('../services/bundledAssets');
jest.mock('../services/urlResolver');
jest.mock('../store/audioStore');

// Mock audio files
jest.mock('../ethereal-ambient-music-55115.mp3', () => 12345, { virtual: true });
jest.mock('../lst-atmospheric-ambient-310691.mp3', () => 23456, { virtual: true });

describe('AudioCoordinator Consolidated', () => {
  let coordinator: AudioCoordinator;
  let mockPlaylist: Playlist;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create fresh coordinator instance for each test
    coordinator = new AudioCoordinator();
    
    // Create a mock playlist
    mockPlaylist = {
      id: 'test-playlist',
      name: 'Test Playlist',
      description: 'Test playlist for consolidated coordinator',
      backgroundTrackUrl: 'test-background.mp3',
      defaultVoiceId: 'serenity',
      voices: [
        { id: 'serenity', name: 'Serenity', gender: 'female', locale: 'en-US', sampleUrl: 'tts://preview/serenity' },
      ],
      affirmations: [
        { id: 'affirmation-0', text: 'I am worthy of abundance', order: 0, durationMs: 5000 },
        { id: 'affirmation-1', text: 'Success flows to me naturally', order: 1, durationMs: 5000 },
      ],
      cdnUrls: {
        serenity: {
          'affirmation-0': 12345, // Mock require() number
          'affirmation-1': 'https://cdn.example.com/serenity-1.mp3',
        },
      }
    };
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with direct dependencies', () => {
      expect(coordinator).toBeDefined();
      expect(coordinator.getAudioSystem()).toBeDefined();
    });

    test('should create singleton instance', () => {
      const instance1 = getAudioCoordinator();
      const instance2 = getAudioCoordinator();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Background Track Resolution', () => {
    test('should resolve background tracks through URLResolver', async () => {
      // Mock URLResolver to return a specific track
      const mockResolveBackgroundTrack = jest.fn().mockReturnValue(12345);
      (coordinator as any).urlResolver.resolveBackgroundTrack = mockResolveBackgroundTrack;
      
      // Mock audioSystem.switchBackground
      const mockSwitchBackground = jest.fn().mockResolvedValue(undefined);
      coordinator.getAudioSystem().switchBackground = mockSwitchBackground;
      
      // Mock store state
      const mockUseAudioStore = require('../store/audioStore').useAudioStore;
      mockUseAudioStore.getState.mockReturnValue({
        playlist: mockPlaylist
      });

      await coordinator.switchBackgroundTrack('ethereal');

      expect(mockResolveBackgroundTrack).toHaveBeenCalledWith('ethereal', mockPlaylist);
      expect(mockSwitchBackground).toHaveBeenCalledWith(12345);
    });

    test('should handle background track resolution errors', async () => {
      // Mock URLResolver to throw an error
      const mockResolveBackgroundTrack = jest.fn().mockImplementation(() => {
        throw new Error('Background track not found: unknown-track');
      });
      (coordinator as any).urlResolver.resolveBackgroundTrack = mockResolveBackgroundTrack;
      
      // Mock store state
      const mockUseAudioStore = require('../store/audioStore').useAudioStore;
      mockUseAudioStore.getState.mockReturnValue({
        playlist: mockPlaylist
      });

      await expect(coordinator.switchBackgroundTrack('unknown-track')).rejects.toThrow('Background track not found: unknown-track');
    });
  });

  describe('Private Business Logic', () => {
    test('should have consolidated URL resolution logic', () => {
      // Test that the private methods exist and are properly typed
      const privateCoordinator = coordinator as any;
      
      expect(typeof privateCoordinator.resolveAffirmationUrls).toBe('function');
      expect(typeof privateCoordinator.buildTracksWithResolvedUrls).toBe('function');
      expect(typeof privateCoordinator.bootstrapPlaylist).toBe('function');
      expect(typeof privateCoordinator.voiceSwitchTransaction).toBe('function');
    });

    test('should resolve affirmation URLs correctly', () => {
      const privateCoordinator = coordinator as any;
      
      // Mock URLResolver.resolve
      const mockResolve = jest.fn()
        .mockReturnValueOnce(12345) // First affirmation
        .mockReturnValueOnce('https://cdn.example.com/serenity-1.mp3'); // Second affirmation
      
      // Mock URLResolver.isPlayable
      const mockIsPlayable = jest.fn().mockReturnValue(true);
      
      privateCoordinator.urlResolver.resolve = mockResolve;
      privateCoordinator.urlResolver.isPlayable = mockIsPlayable;

      const affirmations = [
        { id: 'affirmation-0' },
        { id: 'affirmation-1' }
      ];

      const resolvedUrls = privateCoordinator.resolveAffirmationUrls(
        affirmations,
        mockPlaylist,
        'serenity',
        'TEST'
      );

      expect(resolvedUrls).toHaveLength(2);
      expect(resolvedUrls[0]).toBe(12345);
      expect(resolvedUrls[1]).toBe('https://cdn.example.com/serenity-1.mp3');
      expect(mockResolve).toHaveBeenCalledTimes(2);
      expect(mockIsPlayable).toHaveBeenCalledTimes(2);
    });

    test('should build tracks with resolved URLs', () => {
      const privateCoordinator = coordinator as any;
      
      // Mock URLResolver.isPlayable
      const mockIsPlayable = jest.fn().mockReturnValue(true);
      privateCoordinator.urlResolver.isPlayable = mockIsPlayable;

      const affirmations = [
        { id: 'affirmation-0', text: 'I am worthy' },
        { id: 'affirmation-1', text: 'Success flows' }
      ];
      const resolvedUrls = [12345, 'https://cdn.example.com/serenity-1.mp3'];

      const tracks = privateCoordinator.buildTracksWithResolvedUrls(
        affirmations,
        resolvedUrls
      );

      expect(tracks).toHaveLength(2);
      expect(tracks[0]).toEqual({
        id: 'affirmation-0',
        url: 12345,
        title: 'I am worthy',
        artist: 'Manifestation App'
      });
      expect(tracks[1]).toEqual({
        id: 'affirmation-1',
        url: 'https://cdn.example.com/serenity-1.mp3',
        title: 'Success flows',
        artist: 'Manifestation App'
      });
    });
  });

  describe('Volume Control', () => {
    test('should set background volume through audio system', async () => {
      const mockSetBackgroundVolume = jest.fn().mockResolvedValue(undefined);
      coordinator.getAudioSystem().setBackgroundVolume = mockSetBackgroundVolume;
      
      // Mock store
      const mockUseAudioStore = require('../store/audioStore').useAudioStore;
      const mockSetVolume = jest.fn();
      mockUseAudioStore.getState.mockReturnValue({
        setBackgroundVolume: mockSetVolume
      });

      await coordinator.setBackgroundVolume(0.5);

      expect(mockSetBackgroundVolume).toHaveBeenCalledWith(0.5);
      expect(mockSetVolume).toHaveBeenCalledWith(0.5);
    });

    test('should set affirmation volume through audio system', async () => {
      const mockSetAffirmationVolume = jest.fn().mockResolvedValue(undefined);
      coordinator.getAudioSystem().setAffirmationVolume = mockSetAffirmationVolume;
      
      // Mock store
      const mockUseAudioStore = require('../store/audioStore').useAudioStore;
      const mockSetVolume = jest.fn();
      mockUseAudioStore.getState.mockReturnValue({
        setAffirmationVolume: mockSetVolume
      });

      await coordinator.setAffirmationVolume(0.8);

      expect(mockSetAffirmationVolume).toHaveBeenCalledWith(0.8);
      expect(mockSetVolume).toHaveBeenCalledWith(0.8);
    });
  });

  describe('Public API Preservation', () => {
    test('should maintain all expected public methods', () => {
      // Verify all public methods exist and are functions
      expect(typeof coordinator.selectPlaylist).toBe('function');
      expect(typeof coordinator.openVoiceModal).toBe('function');
      expect(typeof coordinator.closeVoiceModal).toBe('function');
      expect(typeof coordinator.confirmVoiceSelection).toBe('function');
      expect(typeof coordinator.updateDelay).toBe('function');
      expect(typeof coordinator.skipDelay).toBe('function');
      expect(typeof coordinator.pause).toBe('function');
      expect(typeof coordinator.resume).toBe('function');
      expect(typeof coordinator.stop).toBe('function');
      expect(typeof coordinator.setBackgroundVolume).toBe('function');
      expect(typeof coordinator.setAffirmationVolume).toBe('function');
      expect(typeof coordinator.switchBackgroundTrack).toBe('function');
      expect(typeof coordinator.getCurrentState).toBe('function');
      expect(typeof coordinator.getAudioSystem).toBe('function');
      expect(typeof coordinator.handlePhoneCallInterruption).toBe('function');
      expect(typeof coordinator.handlePhoneCallEnd).toBe('function');
      expect(typeof coordinator.cleanup).toBe('function');
    });
  });
});