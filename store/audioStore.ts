import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Playlist, VoiceId, PausedState } from '../types/audio';
import { Affirmation } from '../types/audio';

interface AudioStore {
  // State
  playlist?: Playlist;
  currentVoiceId: VoiceId;
  modalOpen: boolean;
  pausedState?: PausedState;
  globalDelayMs: number;
  isPlaying: boolean;
  currentTrackIndex: number;
  
  // Actions
  setPlaylist: (playlist: Playlist) => void;
  setVoiceId: (voiceId: VoiceId) => void;
  setModalOpen: (open: boolean) => void;
  setPausedState: (state?: PausedState) => void;
  setGlobalDelay: (delayMs: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTrackIndex: (index: number) => void;
  
  // Computed
  getCurrentAffirmation: () => Affirmation | undefined;
}

export const useAudioStore = create<AudioStore>()(
  subscribeWithSelector((set, get) => ({
    currentVoiceId: 'default',
    modalOpen: false,
    globalDelayMs: 3000,
    isPlaying: false,
    currentTrackIndex: 0,
    
    setPlaylist: (playlist) => set({ playlist }),
    setVoiceId: (voiceId) => set({ currentVoiceId: voiceId }),
    setModalOpen: (open) => set({ modalOpen: open }),
    setPausedState: (state) => set({ pausedState: state }),
    setGlobalDelay: (delayMs) => set({ globalDelayMs: delayMs }),
    setIsPlaying: (playing) => set({ isPlaying: playing }),
    setCurrentTrackIndex: (index) => set({ currentTrackIndex: index }),
    
    getCurrentAffirmation: () => {
      const { playlist, currentTrackIndex } = get();
      if (!playlist) return undefined;
      return playlist.affirmations[currentTrackIndex];
    },
  }))
);