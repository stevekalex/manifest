import { useEffect, useRef, useState, useCallback } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { usePlayerStore } from '../store/playerStore';

export const useAudioPlayer = () => {
  const soundRef = useRef<Audio.Sound | null>(null);
  const { backgroundMusicVolume } = usePlayerStore();
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const originalVolumeRef = useRef<number>(backgroundMusicVolume);
  const isDuckedRef = useRef<boolean>(false);

  //TODO - Add a audio focus management strategy for handling phone calls/notifications
  //TODO - Include a fallback for devices that might not support certain TTS voices
  useEffect(() => {
    setupAudio();
    return cleanup;
  }, []);

  const setupAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false
      });
      
    //   await loadBackgroundMusic();
    } catch (err) {
      console.error('Audio setup error:', err);
      setError('Failed to setup audio');
    }
  };

  const cleanup = async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
    }
  };

  const loadBackgroundMusic = async () => {
    try {
      //TODO - Change this
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav' },
        { 
          shouldPlay: false,
          isLooping: true,
          volume: backgroundMusicVolume
        },
        onPlaybackStatusUpdate
      );
      
      soundRef.current = sound;
      setIsLoaded(true);
      setError(null);
    } catch (err) {
      console.error('Error loading background music:', err);
      setError('Failed to load background music');
      setIsLoaded(false);
    }
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.error('Playback error:', status.error);
        setError(`Playback error: ${status.error}`);
      }
    }
  };

  const playBackgroundMusic = async () => {
    if (soundRef.current && isLoaded) {
      try {
        await soundRef.current.playAsync();
      } catch (err) {
        console.error('Play error:', err);
        setError('Failed to play music');
      }
    }
  };

  const pauseBackgroundMusic = async () => {
    if (soundRef.current && isLoaded) {
      try {
        await soundRef.current.pauseAsync();
      } catch (err) {
        console.error('Pause error:', err);
      }
    }
  };

  const setVolume = async (volume: number) => {
    if (soundRef.current && isLoaded) {
      try {
        await soundRef.current.setVolumeAsync(volume);
      } catch (err) {
        console.error('Set volume error:', err);
      }
    }
  };

  const duckVolume = useCallback(async () => {
    if (!isDuckedRef.current && soundRef.current && isLoaded) {
      try {
        originalVolumeRef.current = backgroundMusicVolume;
        const duckedVolume = backgroundMusicVolume * 0.2;
        await soundRef.current.setVolumeAsync(duckedVolume);
        isDuckedRef.current = true;
      } catch (err) {
        console.error('Duck volume error:', err);
      }
    }
  }, [backgroundMusicVolume, isLoaded]);

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

  return {
    playBackgroundMusic,
    pauseBackgroundMusic,
    setVolume,
    duckVolume,
    restoreVolume,
    isLoaded,
    error
  };
};