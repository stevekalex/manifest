import { useEffect, useRef, useState, useCallback } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';

type SoundId = 'ethereal' | 'atmospheric' | 'amazonian' | 'blue-beings';

const SOUND_FILES: Record<SoundId, any> = {
  'ethereal': require('../ethereal-ambient-music-55115.mp3'),
  'atmospheric': require('../assets/audio/background/atmospheric.mp3'),
  'amazonian': require('../ethereal-ambient-music-55115.mp3'), // Placeholder - same file for now
  'blue-beings': require('../ethereal-ambient-music-55115.mp3'), // Placeholder - same file for now
};

export const useBackgroundAudio = (selectedSoundId: SoundId = 'ethereal') => {
  console.log('🔧 useBackgroundAudio hook called with selectedSoundId:', selectedSoundId);
  
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const volumeRef = useRef<number>(0.3); // Use ref to prevent re-renders
  const [currentSoundId, setCurrentSoundId] = useState<SoundId>(selectedSoundId);
  const originalVolumeRef = useRef<number>(0.3);
  const isDuckedRef = useRef<boolean>(false);

  const loadBackgroundMusic = useCallback(async (soundId: SoundId) => {
    try {
      // Unload previous sound if it exists
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        setIsLoaded(false);
      }

      console.log(`Loading background music: ${soundId}...`);
      const soundFile = SOUND_FILES[soundId];
      const { sound } = await Audio.Sound.createAsync(
        soundFile,
        { 
          shouldPlay: false,
          isLooping: true,
          volume: volumeRef.current
        },
        onPlaybackStatusUpdate
      );
      
      soundRef.current = sound;
      setCurrentSoundId(soundId);
      setIsLoaded(true);
      setError(null);
      console.log(`Background music loaded successfully: ${soundId}`);
    } catch (err) {
      console.error('Error loading background music:', err);
      setError('Failed to load background music');
      setIsLoaded(false);
    }
  }, []); // Remove volume dependency since we use volumeRef now

  const setupAudio = useCallback(async () => {
    try {
      console.log('Setting up audio...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      console.log('Audio mode set successfully');
      
      await loadBackgroundMusic(currentSoundId);
    } catch (err) {
      console.error('Audio setup error:', err);
      setError('Failed to setup audio');
    }
  }, [loadBackgroundMusic, currentSoundId]);

  const cleanup = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch (err) {
        console.error('Cleanup error:', err);
      }
    }
  }, []);

  useEffect(() => {
    setupAudio();
    return () => {
      cleanup();
    };
  }, [setupAudio, cleanup]);

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.error('Playback error:', status.error);
        setError(`Playback error: ${status.error}`);
      }
    } else {
      setIsPlaying(status.isPlaying);
    }
  };

  const start = useCallback(async () => {
    console.log('Attempting to start background music, isLoaded:', isLoaded, 'isPlaying:', isPlaying);
    if (soundRef.current && !isPlaying) {
      try {
        // Always check actual sound status, not just state
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          console.log('Starting background music...');
          await soundRef.current.playAsync();
          console.log('Background music started');
        } else {
          console.log('❌ Sound not loaded, cannot start');
          setError('Sound not loaded');
        }
      } catch (err) {
        console.error('Play error:', err);
        setError('Failed to play music');
      }
    } else {
      console.log('Cannot start: soundRef.current:', !!soundRef.current, 'isLoaded:', isLoaded, 'isPlaying:', isPlaying);
    }
  }, [isPlaying]); // Remove isLoaded dependency since we check directly

  const pause = useCallback(async () => {
    console.log('Attempting to pause background music');
    if (soundRef.current && isLoaded && isPlaying) {
      try {
        await soundRef.current.pauseAsync();
        console.log('Background music paused');
      } catch (err) {
        console.error('Pause error:', err);
      }
    }
  }, [isLoaded, isPlaying]);

  const stop = useCallback(async () => {
    console.log('Attempting to stop background music');
    if (soundRef.current && isLoaded) {
      try {
        await soundRef.current.stopAsync();
        console.log('Background music stopped');
      } catch (err) {
        console.error('Stop error:', err);
      }
    }
  }, [isLoaded]);

  const setVolume = useCallback(async (newVolume: number) => {
    console.log('🔊 setVolume called with:', newVolume);
    volumeRef.current = newVolume; // Update ref immediately
    
    if (soundRef.current && isLoaded) {
      try {
        await soundRef.current.setVolumeAsync(newVolume);
        if (!isDuckedRef.current) {
          originalVolumeRef.current = newVolume;
        }
        console.log('✅ Volume set successfully to:', newVolume);
      } catch (err) {
        console.error('Set volume error:', err);
      }
    } else {
      // Store volume even if sound not loaded yet
      originalVolumeRef.current = newVolume;
      console.log('📦 Volume stored for when sound loads:', newVolume);
    }
  }, [isLoaded]);

  const duckVolume = useCallback(async () => {
    if (!isDuckedRef.current && soundRef.current && isLoaded) {
      try {
        originalVolumeRef.current = volumeRef.current;
        const duckedVolume = volumeRef.current * 0.2;
        await soundRef.current.setVolumeAsync(duckedVolume);
        isDuckedRef.current = true;
      } catch (err) {
        console.error('Duck volume error:', err);
      }
    }
  }, [isLoaded]);

  const restoreVolume = useCallback(async () => {
    if (isDuckedRef.current && soundRef.current && isLoaded) {
      try {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          await soundRef.current.setVolumeAsync(originalVolumeRef.current);
          isDuckedRef.current = false;
        }
      } catch (err) {
        if (err instanceof Error && err.message?.includes('sound is not loaded')) {
          isDuckedRef.current = false;
        } else {
          console.error('Restore volume error:', err);
        }
      }
    }
  }, [isLoaded]);

  const changeSoundRef = useRef<(newSoundId: SoundId) => Promise<void>>(async () => {});
  
  changeSoundRef.current = async (newSoundId: SoundId) => {
    // Early return if trying to switch to the same sound
    if (newSoundId === currentSoundId) {
      console.log('🚫 Ignoring switch to same sound:', newSoundId);
      return;
    }
    
    console.log('🔄 changeSound called:', { newSoundId, currentSoundId, isPlaying });
    const wasPlaying = isPlaying;
    const currentVolume = volumeRef.current;
    
    if (isPlaying) {
      console.log('⏸️ Pausing current sound for switch');
      await pause();
    }
    
    console.log('📂 Loading new sound:', newSoundId);
    await loadBackgroundMusic(newSoundId);
    
    // Wait for the NEW sound to be loaded by checking soundRef status directly
    let attempts = 0;
    while (attempts < 20) { // Increased attempts for safety
      if (soundRef.current) {
        try {
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded) {
            console.log('✅ New sound confirmed loaded');
            break;
          }
        } catch (err) {
          console.log('⚠️ Error checking sound status:', err);
        }
      }
      console.log('⏳ Waiting for new sound to load... attempt', attempts + 1);
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (attempts >= 20) {
      console.error('❌ Sound failed to load after 20 attempts');
      return;
    }
    
    // Restore volume after loading new sound
    if (soundRef.current && currentVolume !== 0.3) {
      console.log('🔊 Restoring volume to:', currentVolume);
      await soundRef.current.setVolumeAsync(currentVolume);
    }
    
    if (wasPlaying && soundRef.current) {
      console.log('▶️ Resuming playback with new sound');
      
      // Simple retry logic - 3 attempts with 200ms delay
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded) {
            await soundRef.current.playAsync();
            console.log('✅ New sound started successfully');
            break;
          } else {
            throw new Error('Sound status not loaded');
          }
        } catch (err) {
          const isNotLoadedError = err instanceof Error && 
            (err.message.includes('sound is not loaded') || err.message.includes('Sound status not loaded'));
          
          if (isNotLoadedError && attempt < 3) {
            console.log(`⏳ Retry ${attempt}/3 for sound restart in 200ms`);
            await new Promise(resolve => setTimeout(resolve, 200));
          } else {
            console.error('❌ Failed to start new sound after retries:', err);
            break;
          }
        }
      }
    }
  };

  const changeSound = useCallback(async (newSoundId: SoundId) => {
    return changeSoundRef.current?.(newSoundId);
  }, []);

  // Note: Removed automatic sound change useEffect since we're managing changes manually via changeSound function

  // Getter function for current volume
  const getVolume = useCallback(() => volumeRef.current, []);

  return {
    start,
    pause,
    stop,
    setVolume,
    duckVolume,
    restoreVolume,
    changeSound,
    isLoaded,
    isPlaying,
    getVolume,
    get volume() { return volumeRef.current; }, // Compatibility getter
    currentSoundId,
    error
  };
};