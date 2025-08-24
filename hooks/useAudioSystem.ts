import { getAudioCoordinator } from '../services/audioCoordinator';
import { CDNFactory } from '../services/cdn/CDNFactory';
import { useAudioStore } from '../store/audioStore';
import type { Playlist, VoiceId } from '../types/audio';

export const useAudioSystem = () => {
  const storeState = useAudioStore();
  
  const coordinator = getAudioCoordinator(new CDNFactory());
  
  return {
    // All store state
    ...storeState,
    
    // Action methods that component expects
    playPlaylist: async (playlist: Playlist, voiceId: VoiceId) => {
      await coordinator.startPlayback(playlist, voiceId);
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
    
    stopAll: async () => {
      await coordinator.stop();
    },
    
    // Voice functionality for modals (background functionality, no UI controls in main player)
    openVoiceModal: () => {
      coordinator.openVoiceModal();
    },
    
    closeVoiceModal: () => {
      coordinator.closeVoiceModal();
    },
    
    setVoice: async (voiceId: VoiceId) => {
      await coordinator.confirmVoiceSelection(voiceId);
    },
    
    skipDelay: () => {
      coordinator.skipDelay();
    },
    
    updateDelay: (delayMs: number) => {
      coordinator.updateDelay(delayMs);
    },
    
    setBackgroundVolume: async (volume: number) => {
      console.log('🎵 useAudioSystem.setBackgroundVolume called with:', volume);
      await coordinator.setBackgroundVolume(volume);
      console.log('✅ useAudioSystem.setBackgroundVolume completed');
    },
    
    setAffirmationVolume: async (volume: number) => {
      console.log('🎤 useAudioSystem.setAffirmationVolume called with:', volume);
      await coordinator.setAffirmationVolume(volume);
      console.log('✅ useAudioSystem.setAffirmationVolume completed');
    },
    
    switchBackgroundTrack: async (soundId: string) => {
      console.log('🔄 useAudioSystem.switchBackgroundTrack called with:', soundId);
      await coordinator.switchBackgroundTrack(soundId);
      console.log('✅ useAudioSystem.switchBackgroundTrack completed');
    },
  };
};