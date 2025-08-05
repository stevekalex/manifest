import { createMachine, assign } from 'xstate';
import type { 
  AudioSystemContext, 
  AudioSystemEvents, 
  VoiceId, 
  Playlist 
} from '../types/audio';

export const audioMachine = createMachine({
  id: 'audio',
  types: {} as {
    context: AudioSystemContext;
    events: AudioSystemEvents;
  },
  initial: 'idle',
  context: {
    currentVoiceId: 'serenity' as VoiceId,
    currentTrackIndex: 0,
    modalOpen: false,
    errorCounts: {},
    playlist: undefined,
  },
  states: {
    idle: {
      on: {
        START_PLAYBACK: {
          target: 'playing',
          actions: assign({
            playlist: ({ event }) => event.playlist,
            currentVoiceId: ({ event }) => event.voiceId,
            currentTrackIndex: 0,
            errorCounts: {},
          }),
        },
      },
    },
    playing: {
      type: 'parallel',
      states: {
        background: {
          initial: 'active',
          states: {
            active: {
              on: {
                PLAYER_ERROR: [
                  {
                    guard: ({ event }) => event.playerType === 'background',
                    target: 'error',
                  },
                ],
              },
            },
            error: {
              entry: assign({
                errorCounts: ({ context, event }) => {
                  if (event.type === 'PLAYER_ERROR' && event.playerType === 'background') {
                    const key = 'background_error_count';
                    return {
                      ...context.errorCounts,
                      [key]: (context.errorCounts[key] || 0) + 1,
                    };
                  }
                  return context.errorCounts;
                },
              }),
              on: {
                RETRY: {
                  target: 'active',
                  guard: ({ context }) => (context.errorCounts.background_error_count || 0) <= 3,
                },
              },
            },
          },
        },
        affirmations: {
          initial: 'active',
          states: {
            active: {
              on: {
                OPEN_VOICE_MODAL: 'paused',
                PAUSE_PLAYBACK: 'paused',
                NEXT_TRACK: {
                  actions: assign({
                    currentTrackIndex: ({ context }) => {
                      const maxIndex = context.playlist?.affirmations.length || 0;
                      return Math.min(context.currentTrackIndex + 1, maxIndex - 1);
                    },
                  }),
                },
                PREV_TRACK: {
                  actions: assign({
                    currentTrackIndex: ({ context }) => Math.max(context.currentTrackIndex - 1, 0),
                  }),
                },
                PLAYER_ERROR: [
                  {
                    guard: ({ event }) => event.playerType === 'affirmations',
                    target: 'error',
                  },
                ],
              },
            },
            paused: {
              entry: assign({
                modalOpen: ({ event }) => event.type === 'OPEN_VOICE_MODAL' ? true : false,
              }),
              on: {
                CLOSE_VOICE_MODAL: {
                  target: 'active',
                  actions: assign({
                    modalOpen: false,
                  }),
                },
                RESUME_PLAYBACK: 'active',
                SET_VOICE: {
                  actions: assign({
                    currentVoiceId: ({ event }) => event.voiceId,
                  }),
                },
              },
            },
            error: {
              entry: assign({
                errorCounts: ({ context, event }) => {
                  if (event.type === 'PLAYER_ERROR' && event.playerType === 'affirmations') {
                    const key = 'affirmations_error_count';
                    return {
                      ...context.errorCounts,
                      [key]: (context.errorCounts[key] || 0) + 1,
                    };
                  }
                  return context.errorCounts;
                },
              }),
              on: {
                RETRY: {
                  target: 'active',
                  guard: ({ context }) => (context.errorCounts.affirmations_error_count || 0) <= 3,
                },
                SKIP: {
                  target: 'active',
                  actions: assign({
                    currentTrackIndex: ({ context }) => {
                      const maxIndex = context.playlist?.affirmations.length || 0;
                      return Math.min(context.currentTrackIndex + 1, maxIndex - 1);
                    },
                  }),
                },
              },
            },
          },
        },
      },
      on: {
        STOP_PLAYBACK: {
          target: 'idle',
          actions: assign({
            currentTrackIndex: 0,
            modalOpen: false,
            errorCounts: {},
          }),
        },
      },
    },
    error_recovery: {
      on: {
        RETRY: {
          target: 'playing',
          guard: ({ context }) => {
            const totalErrors = Object.values(context.errorCounts).reduce((sum, count) => sum + count, 0);
            return totalErrors <= 5; // Global error limit
          },
        },
        SKIP: {
          target: 'playing',
          actions: assign({
            currentTrackIndex: ({ context }) => {
              const maxIndex = context.playlist?.affirmations.length || 0;
              return Math.min(context.currentTrackIndex + 1, maxIndex - 1);
            },
          }),
        },
        STOP_PLAYBACK: {
          target: 'idle',
          actions: assign({
            currentTrackIndex: 0,
            modalOpen: false,
            errorCounts: {},
          }),
        },
      },
    },
  },
});

export type AudioMachineActor = ReturnType<typeof audioMachine.createActor>;