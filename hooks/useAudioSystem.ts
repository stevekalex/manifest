import { getAudioCoordinator } from '../services/audioCoordinator';
import { useAudioStore } from '../store/audioStore';
import type { Playlist, VoiceId } from '../types/audio';

export const useAudioSystem = () => {
  const storeState = useAudioStore();
  
  const coordinator = getAudioCoordinator();
  
  return {
    // All store state
    ...storeState,
    
    // Action methods that component expects
    playPlaylist: async (playlist: Playlist, voiceId: VoiceId) => {
      storeState.setPlaylist(playlist);
      await coordinator.selectPlaylist(playlist);
    },
    
    togglePlayback: () => {
      if (storeState.isPlaying) {
        coordinator.pause();
      } else {
        coordinator.resume();
      }
    },
    
    stop: () => {
      coordinator.stop();
    },
    
    openVoiceModal: () => {
      coordinator.openVoiceModal();
    },
    
    closeVoiceModal: () => {
      coordinator.closeVoiceModal();
    },
    
    previewVoice: (voiceId: VoiceId) => {
      coordinator.previewVoice(voiceId);
    },
    
    setVoice: async (voiceId: VoiceId) => {
      await coordinator.confirmVoiceSelection(voiceId);
    },
  };
};