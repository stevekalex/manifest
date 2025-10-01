import { useMemo } from 'react';
import { getAudioCoordinator } from '../services/audioCoordinator';
import { CDNFactory } from '../services/cdn/CDNFactory';
import { useAudioStore } from '../store/audioStore';
import { useRecentlyPlayedTracking } from './useRecentlyPlayedTracking';
import { useAuth } from './useAuth';
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
  const { user } = useAuth();
  
  // Use memoized coordinator with shared CDNFactory
  const coordinator = useMemo(() => getAudioCoordinator(getSharedCDNFactory()), []);
  
  // Recently played tracking (enabled in all environments)
  const { trackPlaylistPlay } = useRecentlyPlayedTracking({
    userId: user?.id || 'anonymous', // Use authenticated user ID or fallback for anonymous users
    enabled: true // Always enabled for recently played functionality
  });
  
  console.log(`🎵 [AUDIO SYSTEM] Hook initialized with tracking enabled for user ${user?.id || 'anonymous'}`);
  
  return {
    // All store state
    ...storeState,
    
    // Action methods that component expects
    playPlaylist: async (playlist: Playlist, voiceId: VoiceId) => {
      console.log('🎵 [AUDIO SYSTEM] playPlaylist called:', { playlistId: playlist.id, voiceId });
      
      // Check if this is genuinely a new play session
      const currentPlaylistId = storeState.playlist?.id;
      const isNewPlaySession = !currentPlaylistId || currentPlaylistId !== playlist.id;
      
      console.log('🎵 [AUDIO SYSTEM] Play session analysis:', { 
        currentPlaylistId, 
        newPlaylistId: playlist.id,
        isNewPlaySession 
      });
      
      // Only track if this is a new play session (different playlist or no current playlist)
      if (isNewPlaySession) {
        console.log('🎵 [AUDIO SYSTEM] NEW play session detected - triggering recently played tracking...');
        trackPlaylistPlay(playlist.id);
      } else {
        console.log('🎵 [AUDIO SYSTEM] RESUME existing session - skipping recently played tracking');
      }
      
      // Continue with existing audio logic
      console.log('🎵 [AUDIO SYSTEM] Starting audio coordinator playbook...');
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
      console.log('🔄 [AUDIO SYSTEM] switchPlaylist called:', { playlistId: newPlaylist.id, voiceId });
      
      // Switching to a different playlist is always a new play session
      console.log('🔄 [AUDIO SYSTEM] PLAYLIST SWITCH - triggering recently played tracking...');
      trackPlaylistPlay(newPlaylist.id);
      
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