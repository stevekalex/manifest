import { useMemo } from 'react';
import { getAudioCoordinator } from '../services/audioCoordinator';
import { CDNFactory } from '../services/cdn/CDNFactory';
import { useAudioStore } from '../store/audioStore';
import { useRecentlyPlayedTracking } from './useRecentlyPlayedTracking';
import type { Playlist, VoiceId } from '../types/audio';
import { audioLog } from '../utils/logger';

// Singleton CDNFactory - shared across all components
let sharedCDNFactory: CDNFactory | null = null;

const getSharedCDNFactory = (): CDNFactory => {
  if (!sharedCDNFactory) {
    sharedCDNFactory = new CDNFactory();
  }
  return sharedCDNFactory;
};

/**
 * Reset shared CDNFactory instance (primarily for testing or config changes)
 */
export const resetSharedCDNFactory = (): void => {
  sharedCDNFactory = null;
};

/**
 * Get the current shared CDNFactory instance (for configuration changes)
 */
export const getSharedCDNFactoryInstance = (): CDNFactory | null => {
  return sharedCDNFactory;
};

export const useAudioSystem = () => {
  const storeState = useAudioStore();
  
  // Use memoized coordinator with shared CDNFactory
  const coordinator = useMemo(() => getAudioCoordinator(getSharedCDNFactory()), []);
  
  // Recently played tracking (dev only)
  const { trackPlaylistPlay } = useRecentlyPlayedTracking({
    userId: 'test-user-123', // TODO: Get from auth system
    enabled: __DEV__ // Only in development for now
  });
  
  return {
    // All store state
    ...storeState,
    
    // Action methods that component expects
    playPlaylist: async (playlist: Playlist, voiceId: VoiceId) => {
      // Track the playlist play (non-blocking)
      trackPlaylistPlay(playlist.id);
      
      // Continue with existing audio logic
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
    
    stopAll: () => {
      coordinator.stop();
    },
    
    switchPlaylist: async (newPlaylist: Playlist, voiceId: VoiceId) => {
      await coordinator.switchPlaylist(newPlaylist, voiceId);
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
      audioLog('[AUDIO-SYSTEM] Setting background volume:', volume);
      await coordinator.setBackgroundVolume(volume);
      audioLog('[AUDIO-SYSTEM] Background volume set successfully');
    },
    
    setAffirmationVolume: async (volume: number) => {
      audioLog('[AUDIO-SYSTEM] Setting affirmation volume:', volume);
      await coordinator.setAffirmationVolume(volume);
      audioLog('[AUDIO-SYSTEM] Affirmation volume set successfully');
    },
    
    switchBackgroundTrack: async (soundId: string) => {
      audioLog('[AUDIO-SYSTEM] Switching background track:', soundId);
      await coordinator.switchBackgroundTrack(soundId);
      audioLog('[AUDIO-SYSTEM] Background track switched successfully');
    },
  };
};