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
  backgroundVolume: number;
  affirmationVolume: number;
  
  // Actions
  setPlaylist: (playlist: Playlist) => void;
  setVoiceId: (voiceId: VoiceId) => void;
  setModalOpen: (open: boolean) => void;
  setPausedState: (state?: PausedState) => void;
  setGlobalDelay: (delayMs: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTrackIndex: (index: number) => void;
  setBackgroundVolume: (volume: number) => void;
  setAffirmationVolume: (volume: number) => void;
  
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
    backgroundVolume: 0.7, // Default background volume
    affirmationVolume: 1.0, // Default affirmation volume
    
    setPlaylist: (playlist) => set({ playlist }),
    setVoiceId: (voiceId) => set({ currentVoiceId: voiceId }),
    setModalOpen: (open) => set({ modalOpen: open }),
    setPausedState: (state) => set({ pausedState: state }),
    setGlobalDelay: (delayMs) => set({ globalDelayMs: delayMs }),
    setIsPlaying: (playing) => set({ isPlaying: playing }),
    setCurrentTrackIndex: (index) => set({ currentTrackIndex: index }),
    setBackgroundVolume: (volume) => set({ backgroundVolume: Math.max(0, Math.min(1, volume)) }),
    setAffirmationVolume: (volume) => set({ affirmationVolume: Math.max(0, Math.min(1, volume)) }),
    
    getCurrentAffirmation: () => {
      const { playlist, currentTrackIndex } = get();
      if (!playlist) return undefined;
      return playlist.affirmations[currentTrackIndex];
    },
  }))
);