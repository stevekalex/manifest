import { audioMachine } from '../services/audioMachine';
import { createActor } from 'xstate';
import type { VoiceId } from '../types/audio';

describe('AudioSystem State Machine', () => {
  let actor: ReturnType<typeof audioMachine.createActor>;

  beforeEach(() => {
    actor = createActor(audioMachine);
    actor.start();
  });

  afterEach(() => {
    actor.stop();
  });

  test('should start in idle state', () => {
    expect(actor.getSnapshot().value).toBe('idle');
    expect(actor.getSnapshot().context.currentVoiceId).toBe('serenity');
    expect(actor.getSnapshot().context.currentTrackIndex).toBe(0);
    expect(actor.getSnapshot().context.modalOpen).toBe(false);
  });

  test('should transition from idle to playing on START_PLAYBOOK', () => {
    const mockPlaylist = {
      id: 'test',
      title: 'Test',
      backgroundTrackUrl: 'test.mp3',
      affirmations: [
        { id: 'test-1', text: 'Test affirmation', index: 0 }
      ]
    };

    actor.send({
      type: 'START_PLAYBACK',
      playlist: mockPlaylist,
      voiceId: 'titan' as VoiceId,
    });

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toEqual({
      playing: {
        background: 'active',
        affirmations: 'active',
      }
    });
    expect(snapshot.context.currentVoiceId).toBe('titan');
    expect(snapshot.context.playlist).toEqual(mockPlaylist);
  });

  test('should pause affirmations when opening voice modal', () => {
    // First start playing
    const mockPlaylist = {
      id: 'test',
      title: 'Test',
      backgroundTrackUrl: 'test.mp3',
      affirmations: [
        { id: 'test-1', text: 'Test affirmation', index: 0 }
      ]
    };

    actor.send({
      type: 'START_PLAYBACK',
      playlist: mockPlaylist,
      voiceId: 'serenity' as VoiceId,
    });

    // Then open modal
    actor.send({ type: 'OPEN_VOICE_MODAL' });

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toEqual({
      playing: {
        background: 'active',
        affirmations: 'paused',
      }
    });
    expect(snapshot.context.modalOpen).toBe(true);
  });

  test('should resume affirmations when closing voice modal', () => {
    // Setup: start playing and open modal
    const mockPlaylist = {
      id: 'test',
      title: 'Test',
      backgroundTrackUrl: 'test.mp3',
      affirmations: [
        { id: 'test-1', text: 'Test affirmation', index: 0 }
      ]
    };

    actor.send({
      type: 'START_PLAYBACK',
      playlist: mockPlaylist,
      voiceId: 'serenity' as VoiceId,
    });
    actor.send({ type: 'OPEN_VOICE_MODAL' });

    // Test: close modal
    actor.send({ type: 'CLOSE_VOICE_MODAL' });

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toEqual({
      playing: {
        background: 'active',
        affirmations: 'active',
      }
    });
    expect(snapshot.context.modalOpen).toBe(false);
  });

  test('should change voice while modal is open', () => {
    // Setup
    const mockPlaylist = {
      id: 'test',
      title: 'Test',
      backgroundTrackUrl: 'test.mp3',
      affirmations: [
        { id: 'test-1', text: 'Test affirmation', index: 0 }
      ]
    };

    actor.send({
      type: 'START_PLAYBACK',
      playlist: mockPlaylist,
      voiceId: 'serenity' as VoiceId,
    });
    actor.send({ type: 'OPEN_VOICE_MODAL' });

    // Test: change voice
    actor.send({
      type: 'SET_VOICE',
      voiceId: 'whisper' as VoiceId,
    });

    const snapshot = actor.getSnapshot();
    expect(snapshot.context.currentVoiceId).toBe('whisper');
  });

  test('should increment track index on NEXT_TRACK', () => {
    // Setup
    const mockPlaylist = {
      id: 'test',
      title: 'Test',
      backgroundTrackUrl: 'test.mp3',
      affirmations: [
        { id: 'test-1', text: 'Test 1', index: 0 },
        { id: 'test-2', text: 'Test 2', index: 1 },
        { id: 'test-3', text: 'Test 3', index: 2 },
      ]
    };

    actor.send({
      type: 'START_PLAYBACK',
      playlist: mockPlaylist,
      voiceId: 'serenity' as VoiceId,
    });

    // Test: next track
    actor.send({ type: 'NEXT_TRACK' });

    const snapshot = actor.getSnapshot();
    expect(snapshot.context.currentTrackIndex).toBe(1);
  });

  test('should return to idle on STOP_PLAYBACK', () => {
    // Setup
    const mockPlaylist = {
      id: 'test',
      title: 'Test',
      backgroundTrackUrl: 'test.mp3',
      affirmations: [
        { id: 'test-1', text: 'Test affirmation', index: 0 }
      ]
    };

    actor.send({
      type: 'START_PLAYBACK',
      playlist: mockPlaylist,
      voiceId: 'serenity' as VoiceId,
    });

    // Test: stop
    actor.send({ type: 'STOP_PLAYBACK' });

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('idle');
    expect(snapshot.context.currentTrackIndex).toBe(0);
    expect(snapshot.context.modalOpen).toBe(false);
  });

  // DISCOVERY TESTS: Playlist Switching Behavior
  describe('Playlist Switching Discovery', () => {
    const createTestPlaylist = (id: string, name: string) => ({
      id,
      name,
      title: name,
      backgroundTrackUrl: `${id}-background.mp3`,
      affirmations: [
        { id: `${id}-1`, text: `${name} affirmation 1`, order: 0 },
        { id: `${id}-2`, text: `${name} affirmation 2`, order: 1 },
      ]
    });

    test('should ignore START_PLAYBACK when already playing (different playlist)', () => {
      const playlist1 = createTestPlaylist('playlist-1', 'Test Playlist 1');
      const playlist2 = createTestPlaylist('playlist-2', 'Test Playlist 2');
      
      // Start first playlist and wait for preparing to complete
      actor.send({ type: 'START_PLAYBACK', playlist: playlist1, voiceId: 'serenity' as VoiceId });
      let snapshot1 = actor.getSnapshot();
      
      // Should be in preparing state initially
      expect(snapshot1.value).toBe('preparing');
      expect(snapshot1.context.playlist?.id).toBe('playlist-1');
      
      // Try to start different playlist while preparing - should be ignored
      actor.send({ type: 'START_PLAYBACK', playlist: playlist2, voiceId: 'charlotte' as VoiceId });
      const snapshot2 = actor.getSnapshot();
      
      // Document current behavior: START_PLAYBACK is ignored when not idle
      console.log('START_PLAYBACK during preparing result:', {
        state: snapshot2.value,
        playlistId: snapshot2.context.playlist?.id,
        voiceId: snapshot2.context.currentVoiceId
      });
      
      // Should still have first playlist, second is ignored
      expect(snapshot2.context.playlist?.id).toBe('playlist-1');
      expect(snapshot2.context.currentVoiceId).toBe('serenity');
    });

    test('should handle STOP_PLAYBACK from any state to idle', async () => {
      const playlist1 = createTestPlaylist('playlist-1', 'Test Playlist 1');
      
      // Start playlist (will be in preparing state)
      actor.send({ type: 'START_PLAYBACK', playlist: playlist1, voiceId: 'serenity' as VoiceId });
      expect(actor.getSnapshot().value).toBe('preparing');
      
      // Stop from preparing state
      actor.send({ type: 'STOP_PLAYBACK' });
      const stopSnapshot = actor.getSnapshot();
      
      // Should immediately go to idle
      expect(stopSnapshot.value).toBe('idle');
      expect(stopSnapshot.context.playlist).toBeUndefined();
      expect(stopSnapshot.context.currentTrackIndex).toBe(0);
    });

    test('should support clean playlist switching via STOP then START sequence', () => {
      const playlist1 = createTestPlaylist('playlist-1', 'Test Playlist 1');
      const playlist2 = createTestPlaylist('playlist-2', 'Test Playlist 2');
      
      // Start first playlist
      actor.send({ type: 'START_PLAYBACK', playlist: playlist1, voiceId: 'serenity' as VoiceId });
      expect(actor.getSnapshot().context.playlist?.id).toBe('playlist-1');
      
      // Stop to idle
      actor.send({ type: 'STOP_PLAYBACK' });
      const stopSnapshot = actor.getSnapshot();
      expect(stopSnapshot.value).toBe('idle');
      expect(stopSnapshot.context.playlist).toBeUndefined();
      
      // Start different playlist - should work
      actor.send({ type: 'START_PLAYBACK', playlist: playlist2, voiceId: 'charlotte' as VoiceId });
      const startSnapshot = actor.getSnapshot();
      
      // Should be preparing new playlist
      expect(startSnapshot.value).toBe('preparing');
      expect(startSnapshot.context.playlist?.id).toBe('playlist-2');
      expect(startSnapshot.context.currentVoiceId).toBe('charlotte');
      expect(startSnapshot.context.currentTrackIndex).toBe(0);
    });

    test('should preserve user preferences but reset playback state', () => {
      const playlist1 = createTestPlaylist('playlist-1', 'Test Playlist 1');
      
      // Set custom preferences
      actor.send({ type: 'UPDATE_DELAY', delayMs: 5000 });
      actor.send({ type: 'START_PLAYBACK', playlist: playlist1, voiceId: 'whisper' as VoiceId });
      
      const beforeStop = actor.getSnapshot();
      expect(beforeStop.context.globalDelayMs).toBe(5000);
      expect(beforeStop.context.currentVoiceId).toBe('whisper');
      expect(beforeStop.context.currentTrackIndex).toBe(0); // No NEXT_TRACK in preparing
      
      // Stop and check what gets reset vs preserved
      actor.send({ type: 'STOP_PLAYBACK' });
      const afterStop = actor.getSnapshot();
      
      // Document what gets reset vs preserved
      console.log('State after STOP_PLAYBACK:', {
        state: afterStop.value,
        globalDelayMs: afterStop.context.globalDelayMs,
        currentTrackIndex: afterStop.context.currentTrackIndex,
        currentVoiceId: afterStop.context.currentVoiceId,
        playlist: afterStop.context.playlist?.id || 'undefined'
      });
      
      expect(afterStop.value).toBe('idle');
      expect(afterStop.context.currentTrackIndex).toBe(0); // Reset
      expect(afterStop.context.playlist).toBeUndefined(); // Reset
      // User preferences should be preserved:
      expect(afterStop.context.globalDelayMs).toBe(5000); // Preserved
      expect(afterStop.context.currentVoiceId).toBe('whisper'); // Preserved
    });

    test('should support subscription-based playlist switching pattern', async () => {
      const playlist1 = createTestPlaylist('playlist-1', 'Test Playlist 1');
      const playlist2 = createTestPlaylist('playlist-2', 'Test Playlist 2');
      
      // Start first playlist
      actor.send({ type: 'START_PLAYBACK', playlist: playlist1, voiceId: 'serenity' as VoiceId });
      expect(actor.getSnapshot().context.playlist?.id).toBe('playlist-1');
      
      // Simulate the switchPlaylist logic using subscription pattern
      const switchComplete = new Promise<void>((resolve) => {
        const subscription = actor.subscribe((state) => {
          if (state.value === 'idle' && state.context.playlist === undefined) {
            subscription.unsubscribe();
            // Start new playlist
            actor.send({ type: 'START_PLAYBACK', playlist: playlist2, voiceId: 'charlotte' as VoiceId });
            resolve();
          }
        });
        
        // Trigger the switch
        actor.send({ type: 'STOP_PLAYBACK' });
      });
      
      await switchComplete;
      
      // Verify the switch worked
      const finalSnapshot = actor.getSnapshot();
      expect(finalSnapshot.value).toBe('preparing');
      expect(finalSnapshot.context.playlist?.id).toBe('playlist-2');
      expect(finalSnapshot.context.currentVoiceId).toBe('charlotte');
      expect(finalSnapshot.context.currentTrackIndex).toBe(0);
    });
  });
});