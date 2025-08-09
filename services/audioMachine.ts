import { createMachine, assign } from 'xstate';
import type { ActorRefFrom } from 'xstate';
import { Playlist, VoiceId, PausedState } from '../types/audio'

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
  | { type: 'PREVIEW_VOICE'; voiceId: VoiceId; affirmationIndex?: number }
  | { type: 'UPDATE_DELAY'; delayMs: number }
  | { type: 'PAUSE_FOR_INTERRUPTION' }
  | { type: 'RESUME_FROM_INTERRUPTION' }
  | { type: 'PLAYER_ERROR'; playerType: 'background' | 'affirmations'; error: Error }
  | { type: 'RETRY' }
  | { type: 'SKIP' }
  | { type: 'NEXT_TRACK' };

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
    currentVoiceId: 'serenity',
    currentTrackIndex: 0,
    modalOpen: false,
    globalDelayMs: 3000,
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
          target: 'playing',
          actions: assign(({ event }) => {
            if (event?.type !== 'START_PLAYBACK') return {};
            return {
              playlist: event.playlist,
              currentVoiceId: event.voiceId,
              currentTrackIndex: 0,
            };
          }),
        }
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
    },
    
    playing: {
      on: {
        OPEN_VOICE_MODAL: 'pausingForModal',
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
              return { globalDelayMs: event.delayMs };
            }),
            'updateUpcomingTracks'
          ],
        },
        NEXT_TRACK: {
          actions: assign(({ context }) => ({ currentTrackIndex: context.currentTrackIndex + 1 }))
        },
        STOP_PLAYBACK: 'idle',
        RESUME_PLAYBACK: undefined,
      },
    },
    paused: {
      on: {
        RESUME_PLAYBACK: {
          target: 'playing',
          actions: 'resumeAllPlayers',
        },
        STOP_PLAYBACK: 'idle',
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
      exit: assign(() => ({ modalOpen: false })),
      on: {
        PREVIEW_VOICE: 'voiceSelecting.previewing',
        CANCEL_VOICE_MODAL: {
          target: 'playing',
          actions: 'resumeFromPausedState',
        },
        CONFIRM_VOICE: 'voiceSwitching',
        SET_VOICE: 'voiceSwitching',
      },
      initial: 'idle',
      states: {
        idle: {},
        previewing: {
          invoke: {
            id: 'playPreview',
            src: 'playPreviewService',
            onDone: 'idle',
            onError: {
              target: 'idle',
              actions: 'logPreviewError',
            },
          },
        },
      },
    },
    
    voiceSwitching: {
      invoke: {
        id: 'switchVoice',
        src: 'voiceSwitchTransaction',
        onDone: {
          target: 'playing',
          actions: assign(({ event }) => ({
            currentVoiceId: (event as any).data.voiceId as VoiceId,
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
  playPreviewService: any;
}, actions: Record<string, any>) {
  return (audioMachine as any).provide({
    actors: {
      bootstrapPlaylist: services.bootstrapPlaylist,
      voiceSwitchTransaction: services.voiceSwitchTransaction,
      pauseAndSnapshot: services.pauseAndSnapshot,
      playPreviewService: services.playPreviewService,
    },
    actions,
  });
}

export type AudioMachineActor = ActorRefFrom<typeof audioMachine>;

