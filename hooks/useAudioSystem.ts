import { useEffect, useCallback } from 'react';
import { 
  useAudioActions,
  usePlayerState,
  useCurrentVoice,
  useCurrentTrackIndex,
  useModalOpen,
  useIsPlaying,
  useAudioError,
} from '../store/audioStore';
import type { VoiceId, Playlist } from '../types/audio';

/**
 * Main hook for interacting with the audio system
 * Provides a clean API that matches the existing hooks pattern
 */
export const useAudioSystem = () => {
  const actions = useAudioActions();
  const playerState = usePlayerState();
  const currentVoiceId = useCurrentVoice();
  const currentTrackIndex = useCurrentTrackIndex();
  const modalOpen = useModalOpen();
  const isPlaying = useIsPlaying();
  const error = useAudioError();

  // Initialize audio system on mount
  useEffect(() => {
    actions.initializeAudioSystem();

    // Cleanup on unmount
    return () => {
      actions.destroyAudioSystem();
    };
  }, [actions]);

  // Wrapped actions with error handling
  const playPlaylist = useCallback(async (playlist: Playlist, voiceId: VoiceId) => {
    try {
      await actions.playPlaylist(playlist, voiceId);
    } catch (error) {
      console.error('Failed to play playlist:', error);
    }
  }, [actions]);

  const pause = useCallback(async () => {
    try {
      await actions.pause();
    } catch (error) {
      console.error('Failed to pause:', error);
    }
  }, [actions]);

  const resume = useCallback(async () => {
    try {
      await actions.resume();
    } catch (error) {
      console.error('Failed to resume:', error);
    }
  }, [actions]);

  const stop = useCallback(async () => {
    try {
      await actions.stop();
    } catch (error) {
      console.error('Failed to stop:', error);
    }
  }, [actions]);

  const setVoice = useCallback(async (voiceId: VoiceId) => {
    try {
      await actions.setVoice(voiceId);
    } catch (error) {
      console.error('Failed to set voice:', error);
    }
  }, [actions]);

  const previewVoice = useCallback(async (voiceId: VoiceId, affirmationIndex?: number) => {
    try {
      await actions.previewVoice(voiceId, affirmationIndex);
    } catch (error) {
      console.error('Failed to preview voice:', error);
    }
  }, [actions]);

  // Modal controls
  const openVoiceModal = useCallback(() => {
    actions.openVoiceModal();
  }, [actions]);

  const closeVoiceModal = useCallback(() => {
    actions.closeVoiceModal();
  }, [actions]);

  // Combined play/pause action for UI convenience
  const togglePlayback = useCallback(async () => {
    if (isPlaying) {
      await pause();
    } else if (playerState === 'idle') {
      // Can't resume from idle - need a playlist
      console.warn('Cannot start playback without a playlist');
    } else {
      await resume();
    }
  }, [isPlaying, playerState, pause, resume]);

  return {
    // State
    playerState,
    currentVoiceId,
    currentTrackIndex,
    modalOpen,
    isPlaying,
    error,
    
    // Actions
    playPlaylist,
    pause,
    resume,
    stop,
    togglePlayback,
    
    // Voice management
    setVoice,
    previewVoice,
    openVoiceModal,
    closeVoiceModal,
  };
};

/**
 * Hook for components that only need to read audio state
 */
export const useAudioState = () => {
  const playerState = usePlayerState();
  const currentVoiceId = useCurrentVoice();
  const currentTrackIndex = useCurrentTrackIndex();
  const modalOpen = useModalOpen();
  const isPlaying = useIsPlaying();
  const error = useAudioError();

  return {
    playerState,
    currentVoiceId,
    currentTrackIndex,
    modalOpen,
    isPlaying,
    error,
  };
};

/**
 * Hook for components that only need to control playback
 */
export const useAudioControls = () => {
  const actions = useAudioActions();

  const playPlaylist = useCallback(async (playlist: Playlist, voiceId: VoiceId) => {
    try {
      await actions.playPlaylist(playlist, voiceId);
    } catch (error) {
      console.error('Failed to play playlist:', error);
    }
  }, [actions]);

  const pause = useCallback(async () => {
    try {
      await actions.pause();
    } catch (error) {
      console.error('Failed to pause:', error);
    }
  }, [actions]);

  const resume = useCallback(async () => {
    try {
      await actions.resume();
    } catch (error) {
      console.error('Failed to resume:', error);
    }
  }, [actions]);

  const stop = useCallback(async () => {
    try {
      await actions.stop();
    } catch (error) {
      console.error('Failed to stop:', error);
    }
  }, [actions]);

  return {
    playPlaylist,
    pause,
    resume,
    stop,
  };
};

/**
 * Hook for voice-related functionality
 */
export const useVoiceControls = () => {
  const actions = useAudioActions();
  const currentVoiceId = useCurrentVoice();
  const modalOpen = useModalOpen();

  const setVoice = useCallback(async (voiceId: VoiceId) => {
    try {
      await actions.setVoice(voiceId);
    } catch (error) {
      console.error('Failed to set voice:', error);
    }
  }, [actions]);

  const previewVoice = useCallback(async (voiceId: VoiceId, affirmationIndex?: number) => {
    try {
      await actions.previewVoice(voiceId, affirmationIndex);
    } catch (error) {
      console.error('Failed to preview voice:', error);
    }
  }, [actions]);

  const openVoiceModal = useCallback(() => {
    actions.openVoiceModal();
  }, [actions]);

  const closeVoiceModal = useCallback(() => {
    actions.closeVoiceModal();
  }, [actions]);

  return {
    currentVoiceId,
    modalOpen,
    setVoice,
    previewVoice,
    openVoiceModal,
    closeVoiceModal,
  };
};