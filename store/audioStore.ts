import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { AudioSystem } from '../services/AudioSystem';
import type { 
  AudioSystemState, 
  VoiceId, 
  Playlist 
} from '../types/audio';

interface AudioStore extends AudioSystemState {
  // Audio system instance
  audioSystem: AudioSystem | null;
  
  // Actions
  initializeAudioSystem: () => void;
  playPlaylist: (playlist: Playlist, voiceId: VoiceId) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  openVoiceModal: () => void;
  closeVoiceModal: () => void;
  setVoice: (voiceId: VoiceId) => Promise<void>;
  previewVoice: (voiceId: VoiceId, affirmationIndex?: number) => Promise<void>;
  
  // Cleanup
  destroyAudioSystem: () => Promise<void>;
}

export const useAudioStore = create<AudioStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    audioSystem: null,
    playerState: 'idle',
    currentVoiceId: 'serenity',
    currentTrackIndex: 0,
    modalOpen: false,
    isPlaying: false,
    backgroundPlaying: false,
    affirmationsPlaying: false,
    error: undefined,

    // Initialize audio system
    initializeAudioSystem: () => {
      const { audioSystem } = get();
      if (audioSystem) return; // Already initialized

      const newAudioSystem = new AudioSystem();
      
      // Subscribe to audio system state changes
      const unsubscribe = newAudioSystem.subscribe((state: AudioSystemState) => {
        set((prevState) => ({
          ...prevState,
          ...state,
        }));
      });

      // Store unsubscribe function for cleanup
      (newAudioSystem as any)._storeUnsubscribe = unsubscribe;

      set({ audioSystem: newAudioSystem });
    },

    // Playback actions
    playPlaylist: async (playlist: Playlist, voiceId: VoiceId) => {
      const { audioSystem } = get();
      if (!audioSystem) {
        throw new Error('Audio system not initialized');
      }
      
      try {
        await audioSystem.playPlaylist(playlist, voiceId);
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Playback failed' });
        throw error;
      }
    },

    pause: async () => {
      const { audioSystem } = get();
      if (!audioSystem) return;
      
      try {
        await audioSystem.pause();
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Pause failed' });
        throw error;
      }
    },

    resume: async () => {
      const { audioSystem } = get();
      if (!audioSystem) return;
      
      try {
        await audioSystem.resume();
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Resume failed' });
        throw error;
      }
    },

    stop: async () => {
      const { audioSystem } = get();
      if (!audioSystem) return;
      
      try {
        await audioSystem.stop();
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Stop failed' });
        throw error;
      }
    },

    // Voice modal actions
    openVoiceModal: () => {
      const { audioSystem } = get();
      if (!audioSystem) return;
      
      audioSystem.openVoiceModal();
    },

    closeVoiceModal: () => {
      const { audioSystem } = get();
      if (!audioSystem) return;
      
      audioSystem.closeVoiceModal();
    },

    setVoice: async (voiceId: VoiceId) => {
      const { audioSystem } = get();
      if (!audioSystem) return;
      
      try {
        await audioSystem.setVoice(voiceId);
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Voice change failed' });
        throw error;
      }
    },

    previewVoice: async (voiceId: VoiceId, affirmationIndex?: number) => {
      const { audioSystem } = get();
      if (!audioSystem) return;
      
      try {
        await audioSystem.previewVoice(voiceId, affirmationIndex);
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Voice preview failed' });
        throw error;
      }
    },

    // Cleanup
    destroyAudioSystem: async () => {
      const { audioSystem } = get();
      if (!audioSystem) return;

      try {
        // Call stored unsubscribe function if it exists
        const unsubscribe = (audioSystem as any)._storeUnsubscribe;
        if (unsubscribe) {
          unsubscribe();
        }

        await audioSystem.destroy();
        set({ 
          audioSystem: null,
          playerState: 'idle',
          isPlaying: false,
          backgroundPlaying: false,
          affirmationsPlaying: false,
          error: undefined,
        });
      } catch (error) {
        console.error('Error destroying audio system:', error);
      }
    },
  }))
);

// Selector hooks for performance
export const usePlayerState = () => useAudioStore((state) => state.playerState);
export const useCurrentVoice = () => useAudioStore((state) => state.currentVoiceId);
export const useCurrentTrackIndex = () => useAudioStore((state) => state.currentTrackIndex);
export const useModalOpen = () => useAudioStore((state) => state.modalOpen);
export const useIsPlaying = () => useAudioStore((state) => state.isPlaying);
export const useAudioError = () => useAudioStore((state) => state.error);

// Action selectors
export const useAudioActions = () => useAudioStore((state) => ({
  initializeAudioSystem: state.initializeAudioSystem,
  playPlaylist: state.playPlaylist,
  pause: state.pause,
  resume: state.resume,
  stop: state.stop,
  openVoiceModal: state.openVoiceModal,
  closeVoiceModal: state.closeVoiceModal,
  setVoice: state.setVoice,
  previewVoice: state.previewVoice,
  destroyAudioSystem: state.destroyAudioSystem,
}));