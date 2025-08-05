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
});