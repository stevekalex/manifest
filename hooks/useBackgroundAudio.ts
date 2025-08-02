import { useEffect, useRef, useState, useCallback } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';

export const useBackgroundAudio = () => {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(0.3);
  const originalVolumeRef = useRef<number>(0.3);
  const isDuckedRef = useRef<boolean>(false);

  const loadBackgroundMusic = useCallback(async () => {
    try {
      console.log('Loading background music...');
      const { sound } = await Audio.Sound.createAsync(
        require('../ethereal-ambient-music-55115.mp3'),
        { 
          shouldPlay: false,
          isLooping: true,
          volume: volume
        },
        onPlaybackStatusUpdate
      );
      
      soundRef.current = sound;
      setIsLoaded(true);
      setError(null);
      console.log('Background music loaded successfully');
    } catch (err) {
      console.error('Error loading background music:', err);
      setError('Failed to load background music');
      setIsLoaded(false);
    }
  }, [volume]);

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
      
      await loadBackgroundMusic();
    } catch (err) {
      console.error('Audio setup error:', err);
      setError('Failed to setup audio');
    }
  }, [loadBackgroundMusic]);

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
    if (soundRef.current && isLoaded && !isPlaying) {
      try {
        console.log('Starting background music...');
        await soundRef.current.playAsync();
        console.log('Background music started');
      } catch (err) {
        console.error('Play error:', err);
        setError('Failed to play music');
      }
    } else {
      console.log('Cannot start: soundRef.current:', !!soundRef.current, 'isLoaded:', isLoaded, 'isPlaying:', isPlaying);
    }
  }, [isLoaded, isPlaying]);

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
    if (soundRef.current && isLoaded) {
      try {
        await soundRef.current.setVolumeAsync(newVolume);
        setVolumeState(newVolume);
        if (!isDuckedRef.current) {
          originalVolumeRef.current = newVolume;
        }
      } catch (err) {
        console.error('Set volume error:', err);
      }
    }
  }, [isLoaded]);

  const duckVolume = useCallback(async () => {
    if (!isDuckedRef.current && soundRef.current && isLoaded) {
      try {
        originalVolumeRef.current = volume;
        const duckedVolume = volume * 0.2;
        await soundRef.current.setVolumeAsync(duckedVolume);
        isDuckedRef.current = true;
      } catch (err) {
        console.error('Duck volume error:', err);
      }
    }
  }, [volume, isLoaded]);

  const restoreVolume = useCallback(async () => {
    if (isDuckedRef.current && soundRef.current && isLoaded) {
      try {
        await soundRef.current.setVolumeAsync(originalVolumeRef.current);
        isDuckedRef.current = false;
      } catch (err) {
        console.error('Restore volume error:', err);
      }
    }
  }, [isLoaded]);

  return {
    start,
    pause,
    stop,
    setVolume,
    duckVolume,
    restoreVolume,
    isLoaded,
    isPlaying,
    volume,
    error
  };
};