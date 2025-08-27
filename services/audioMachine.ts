import { createMachine, assign } from 'xstate';
import type { ActorRefFrom } from 'xstate';
import { Playlist, VoiceId, PausedState } from '../types/audio';
import { AUDIO_CONFIG } from '../config/audio';

// Machine types
interface AudioContext {
  currentVoiceId: VoiceId;
  currentTrackIndex: number;
  modalOpen: boolean;
  globalDelayMs: number;
  playlist?: Playlist;
  pausedState?: PausedState;
  error?: unknown;
  errorCounts: Record<string, number>;
}

// External events sent to the machine
// Note: Includes events used by this file and by AudioSystem/tests
// so consumers can send them without TS errors.
 type AudioEvent =
  | { type: 'SELECT_PLAYLIST'; playlist: Playlist }
  | { type: 'START_PLAYBACK'; playlist: Playlist; voiceId: VoiceId }
  | { type: 'STOP_PLAYBACK' }
  | { type: 'PAUSE_PLAYBACK' }
  | { type: 'RESUME_PLAYBACK' }
  | { type: 'OPEN_VOICE_MODAL' }
  | { type: 'CLOSE_VOICE_MODAL' }
  | { type: 'CANCEL_VOICE_MODAL' }
  | { type: 'CONFIRM_VOICE'; voiceId: VoiceId }
  | { type: 'SET_VOICE'; voiceId: VoiceId }
  | { type: 'UPDATE_DELAY'; delayMs: number }
  | { type: 'PAUSE_FOR_INTERRUPTION' }
  | { type: 'RESUME_FROM_INTERRUPTION' }
  | { type: 'PLAYER_ERROR'; playerType: 'background' | 'affirmations'; error: Error }
  | { type: 'RETRY' }
  | { type: 'SKIP' }
  | { type: 'NEXT_TRACK' }
  | { type: 'TRACK_ADVANCED'; trackIndex: number }
  // DOUBEL CHECK NEXT_TRACK vs TRACK_ADVANCED
  | { type: 'SKIP_DELAY' };

// High-level flow
//
// - idle → preparing → playing
//
// - While playing:
//   - Open voice modal → pausingForModal → voiceSelecting
//     - Preview voice (transient)
//     - Confirm/Set voice → voiceSwitching → playing
//     - Cancel/Close → playing (resume)
//   - Interruption → interrupted → resume → playing
//   - Update delay/next track → stay in playing (update context)
//   - Stop → idle
// - Error anywhere → error → select playlist → preparing

// - **Context tracked**: `playlist`, `currentVoiceId`, `currentTrackIndex`, `modalOpen`, `globalDelayMs`, `pausedState`, `error`.

export const audioMachine = createMachine({
  types: {} as {
    context: AudioContext;
    events: AudioEvent;
  },

  id: 'audio',
  initial: 'idle',
  context: {
    currentVoiceId: AUDIO_CONFIG.DEFAULT_VOICE,
    currentTrackIndex: 0,
    modalOpen: false,
    globalDelayMs: AUDIO_CONFIG.DEFAULT_DELAY_MS,
    errorCounts: {},
  },
  states: {
    idle: {
      on: {
        SELECT_PLAYLIST: {
          target: 'preparing',
          actions: assign(({ context, event }) => {
            if (event?.type !== 'SELECT_PLAYLIST') return {};
            return {
              playlist: event.playlist,
              currentVoiceId: event.playlist.defaultVoiceId ?? context.currentVoiceId,
            };
          }),
        },
        START_PLAYBACK: {
          target: 'preparing',
          actions: assign(({ event }) => {
            if (event?.type !== 'START_PLAYBACK') return {};
            return {
              playlist: event.playlist,
              currentVoiceId: event.voiceId,
              currentTrackIndex: 0,
            };
          }),
        },
        UPDATE_DELAY: {
          actions: assign(({ event }) => {
            if (event?.type !== 'UPDATE_DELAY') return {};
            return { globalDelayMs: event.delayMs };
          }),
        },
      },
    },
    
    preparing: {
      invoke: {
        id: 'bootstrapPlaylist',
        src: 'bootstrapPlaylist',
        input: ({ context }) => ({
          playlist: context.playlist,
          currentVoiceId: context.currentVoiceId,
          globalDelayMs: context.globalDelayMs,
        }),
        onDone: 'playing',
        onError: {
          target: 'error',
          actions: assign(({ event }) => ({ error: (event as any).data })),
        },
      },
      on: {
        STOP_PLAYBACK: {
          target: 'idle',
          actions: [
            'stopAllAudio',
            assign(() => ({
              playlist: undefined,
              currentTrackIndex: 0,
              pausedState: undefined,
            }))
          ]
        },
        UPDATE_DELAY: {
          actions: assign(({ event }) => {
            if (event?.type !== 'UPDATE_DELAY') return {};
            return { globalDelayMs: event.delayMs };
          }),
        },
      },
    },
    
    playing: {
      initial: 'playingTrack',
      states: {
        playingTrack: {
          on: {
            TRACK_ADVANCED: {
              target: 'waitingForNext',
              actions: assign(({ event }) => ({
                currentTrackIndex: (event as any).trackIndex // Use TrackPlayer index as source of truth
              }))
            },
            // Remote control actions - immediate response
            NEXT_TRACK: {
              actions: assign(({ context }) => ({ currentTrackIndex: context.currentTrackIndex + 1 }))
            }
          }
        },
        waitingForNext: {
          entry: [
            'pauseAffirmations',
            () => console.log('🔄 [STATE] Entering waitingForNext - delay timer will start')
          ],
          exit: [
            () => console.log('🔄 [STATE] Exiting waitingForNext - delay timer completed or cancelled')
          ], 
          invoke: {
            id: 'delayTimer',
            src: 'createDelay',
            input: ({ context }) => {
              console.log('⏱️ [DELAY-INPUT] Creating delay timer with input:', context.globalDelayMs, 'ms');
              return { delayMs: context.globalDelayMs };
            },
            onDone: [
              {
                target: '#audio.voiceSelecting',
                guard: ({ context }) => context.modalOpen,
                actions: 'resumeAffirmations' // Start next track even with modal open
              },
              {
                target: 'playingTrack',
                actions: 'resumeAffirmations'
              }
            ]
          },
          on: {
            // User actions cancel delay immediately
            SKIP_DELAY: {
              target: 'playingTrack',
              actions: 'resumeAffirmations'
            },
            NEXT_TRACK: {
              target: 'playingTrack', 
              actions: 'resumeAffirmations'
            },
            
            // Modal opens but delay continues - handled by parent state
            
            // Delay change restarts timer
            UPDATE_DELAY: {
              target: 'waitingForNext',
              actions: [
                assign(({ event }) => {
                  console.log('⏰ [DELAY-UPDATE] waitingForNext state UPDATE_DELAY handler triggered');
                  console.log('⏰ [DELAY-UPDATE] Changing delay from', (event as any).context?.globalDelayMs, 'to', (event as any).delayMs);
                  console.log('⏰ [DELAY-UPDATE] This will restart the delay timer immediately');
                  return { globalDelayMs: (event as any).delayMs };
                })
              ]
            },
            
            // Race condition protection
            TRACK_ADVANCED: {
              target: 'waitingForNext', // Restart delay for new track
              actions: assign(({ event }) => ({ currentTrackIndex: (event as any).trackIndex }))
            }
          }
        }
      },
      on: {
        OPEN_VOICE_MODAL: {
          actions: assign(() => ({ modalOpen: true }))
        },
        CLOSE_VOICE_MODAL: {
          actions: assign(() => ({ modalOpen: false }))
        },
        CANCEL_VOICE_MODAL: {
          actions: assign(() => ({ modalOpen: false }))
        },
        PAUSE_FOR_INTERRUPTION: {
          target: 'interrupted',
          actions: 'pauseAllPlayers',
        },
        PAUSE_PLAYBACK: {
          target: 'paused',
          actions: 'pauseAllPlayers',
        },
        UPDATE_DELAY: {
          actions: [
            assign(({ event }) => {
              if (event?.type !== 'UPDATE_DELAY') return {};
              console.log('⏰ [DELAY-UPDATE] Playing state UPDATE_DELAY handler triggered');
              console.log('⏰ [DELAY-UPDATE] Updating globalDelayMs to:', event.delayMs, 'ms');
              return { globalDelayMs: event.delayMs };
            }),
            'updateUpcomingTracks'
          ],
        },
        STOP_PLAYBACK: {
          target: 'idle',
          actions: [
            'stopAllAudio',
            assign(() => ({
              playlist: undefined,
              currentTrackIndex: 0,
              pausedState: undefined,
            }))
          ]
        },
        RESUME_PLAYBACK: undefined,
      },
    },
    paused: {
      on: {
        RESUME_PLAYBACK: {
          target: 'playing',
          actions: 'resumeAllPlayers',
        },
        STOP_PLAYBACK: {
          target: 'idle',
          actions: [
            'stopAllAudio',
            assign(() => ({
              playlist: undefined,
              currentTrackIndex: 0,
              pausedState: undefined,
            }))
          ]
        },
        CLOSE_VOICE_MODAL: {
          actions: assign(() => ({ modalOpen: false }))
        },
        CANCEL_VOICE_MODAL: {
          actions: assign(() => ({ modalOpen: false }))
        },
      },
    },
    
    // New state to handle atomic pause + snapshot
    pausingForModal: {
      invoke: {
        id: 'pauseAndSnapshot',
        src: 'pauseAndSnapshot', // TODO: Examine exact invokation of this
        onDone: {
          target: 'voiceSelecting',
          actions: assign(({ event }) => ({ 
            pausedState: (event as any).data,
            modalOpen: true 
          })),
        },
        onError: 'playing', // Fallback if pause fails
      },
    },
    
    voiceSelecting: {
      exit: ['resumeBackground', assign(() => ({ modalOpen: false })), 'resumeAffirmations'],
      on: {
        CANCEL_VOICE_MODAL: {
          target: 'playing'
        },
        CONFIRM_VOICE: 'voiceSwitching',
        SET_VOICE: 'voiceSwitching',
        UPDATE_DELAY: {
          actions: assign(({ event }) => {
            if (event?.type !== 'UPDATE_DELAY') return {};
            console.log('⏰ [DELAY-UPDATE] voiceSelecting state UPDATE_DELAY handler - updating globalDelayMs to:', event.delayMs);
            return { globalDelayMs: event.delayMs };
          }),
        },
        TRACK_ADVANCED: {
          target: '#audio.playing.waitingForNext',
          actions: assign(({ event }) => {
            console.log('⏰ [TRACK-ADVANCE] voiceSelecting received TRACK_ADVANCED - transitioning to waitingForNext with delay');
            return { currentTrackIndex: (event as any).trackIndex };
          })
        },
      },
      initial: 'idle',
      states: {
        idle: {},
      },
    },
    
    voiceSwitching: {
      invoke: {
        id: 'switchVoice',
        src: 'voiceSwitchTransaction',
        onDone: {
          target: 'playing',
          actions: assign(({ context, event }) => ({
            currentVoiceId: (event as any).data.voiceId as VoiceId,
            currentTrackIndex: context.currentTrackIndex + 1,
            pausedState: undefined,
          })),
        },
        onError: {
          target: 'playing',
          actions: 'resumeFromPausedState', // Resume with old voice (TODO Double check this)
        },
      },
    },
    
    interrupted: {
      on: {
        RESUME_FROM_INTERRUPTION: {
          target: 'playing',
          actions: 'resumeAllPlayers',
        },
        CLOSE_VOICE_MODAL: {
          actions: assign(() => ({ modalOpen: false }))
        },
        CANCEL_VOICE_MODAL: {
          actions: assign(() => ({ modalOpen: false }))
        },
      },
    },
    
    error: {
      on: {
        SELECT_PLAYLIST: 'preparing',
      },
    },
  }
}, {
  // Machine implementations will be provided when creating the actor
});

// Factory to create a provided machine with concrete services/actions
export function createProvidedAudioMachine(services: {
  bootstrapPlaylist: any;
  voiceSwitchTransaction: any;
  pauseAndSnapshot: any;
}, actions: Record<string, any>) {
  return (audioMachine as any).provide({
    actors: {
      bootstrapPlaylist: services.bootstrapPlaylist,
      voiceSwitchTransaction: services.voiceSwitchTransaction,
      pauseAndSnapshot: services.pauseAndSnapshot,
    },
    actions,
  });
}

export type AudioMachineActor = ActorRefFrom<typeof audioMachine>;

