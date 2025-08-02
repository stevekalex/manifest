import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import * as Speech from 'expo-speech';

export const useSimpleTTS = (onSpeechStart?: () => void, onSpeechEnd?: () => void) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingDelay, setRemainingDelay] = useState(0);
  
  const timeoutRef = useRef<NodeJS.Timeout>();
  const countdownRef = useRef<NodeJS.Timeout>();
  const isPlayingRef = useRef(false);
  const isInterruptedRef = useRef(false);
  
  // Voice settings refs (prevent re-renders)
  const selectedVoiceRef = useRef<string>('serenity');
  const voiceVolumeRef = useRef<number>(1.0);
  const affirmationDelayRef = useRef<number>(5000); // 5 seconds default

  const affirmations = useMemo(() => [
    "I allow myself to be who I am meant to be",
    "I am worthy of all the abundance the universe has to offer",
    "Success flows to me effortlessly and naturally",
    "I attract positive opportunities into my life",
    "I am confident in my ability to achieve my dreams",
    "Money comes to me easily and frequently",
    "I am grateful for all the blessings in my life",
    "I radiate positive energy and attract positive people",
    "My mind is focused on success and prosperity",
    "Every day, I am becoming more successful"
  ], []);

  const playAffirmation = useCallback(async (text: string): Promise<void> => {
    return new Promise((resolve) => {
      onSpeechStart?.();
      
      // Apply voice settings from refs with different voice styles
      const getVoiceConfig = (voiceId: string) => {
        switch (voiceId) {
          case 'serenity': // Calm, soothing female voice
            return { pitch: 1.1, rate: 0.4 };
          case 'titan': // Strong, confident male voice
            return { pitch: 0.7, rate: 0.5 };
          case 'whisper': // Gentle, soft female voice
            return { pitch: 1.2, rate: 0.3 };
          case 'sage': // Wise, steady male voice
            return { pitch: 0.8, rate: 0.4 };
          case 'aurora': // Bright, energetic female voice (Premium)
            return { pitch: 1.4, rate: 0.6 };
          case 'thunder': // Deep, powerful male voice (Premium)
            return { pitch: 0.5, rate: 0.4 };
          case 'crystal': // Clear, precise female voice (Premium)
            return { pitch: 1.3, rate: 0.5 };
          case 'mystic': // Mysterious, deep male voice (Premium)
            return { pitch: 0.6, rate: 0.3 };
          case 'harmony': // Warm, melodic female voice (Premium)
            return { pitch: 1.2, rate: 0.5 };
          case 'echo': // Resonant, echoing male voice (Premium)
            return { pitch: 0.7, rate: 0.3 };
          // Legacy support for old voice IDs
          case 'annie':
            return { pitch: 1.3, rate: 0.6 };
          case 'max':
            return { pitch: 0.8, rate: 0.5 };
          case 'zen':
            return { pitch: 0.6, rate: 0.4 };
          default:
            return { pitch: 1.0, rate: 0.5 };
        }
      };
      
      const voiceConfig = getVoiceConfig(selectedVoiceRef.current);
      const voiceSettings = {
        language: 'en-US',
        pitch: voiceConfig.pitch,
        rate: voiceConfig.rate,
        volume: voiceVolumeRef.current,
        onDone: () => {
          onSpeechEnd?.();
          resolve();
        },
        onStopped: () => {
          onSpeechEnd?.();
          // If this was an interruption, don't resolve - let the restart handle it
          if (!isInterruptedRef.current) {
            resolve();
          }
        },
        onError: () => {
          onSpeechEnd?.();
          resolve();
        }
      };
      
      Speech.speak(text, voiceSettings);
    });
  }, [onSpeechStart, onSpeechEnd]);

  const playNext = useCallback(async (index: number) => {
    if (!isPlayingRef.current || index >= affirmations.length) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      return;
    }

    setCurrentIndex(index);
    
    // Play the affirmation
    await playAffirmation(affirmations[index]);

    // If still playing, wait for configured delay then play next
    if (isPlayingRef.current) {
      const delayMs = affirmationDelayRef.current;
      setRemainingDelay(Math.ceil(delayMs / 1000));
      
      // Start countdown
      let remainingSeconds = Math.ceil(delayMs / 1000);
      const startCountdown = () => {
        if (remainingSeconds > 0 && isPlayingRef.current) {
          setRemainingDelay(remainingSeconds);
          remainingSeconds--;
          countdownRef.current = setTimeout(startCountdown, 1000) as any;
        } else {
          setRemainingDelay(0);
        }
      };
      startCountdown();
      
      timeoutRef.current = setTimeout(() => {
        if (isPlayingRef.current) {
          setRemainingDelay(0);
          playNext(index + 1);
        }
      }, delayMs) as any;
    }
  }, [affirmations, playAffirmation]);

  const startPlaying = useCallback(() => {
    if (isPlayingRef.current) return;
    
    setIsPlaying(true);
    isPlayingRef.current = true;
    playNext(currentIndex);
  }, [currentIndex, playNext]);

  const pausePlaying = useCallback(() => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    isInterruptedRef.current = false; // Clear any interruption state
    setRemainingDelay(0);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (countdownRef.current) {
      clearTimeout(countdownRef.current);
    }
    
    Speech.stop();
    // Don't increment currentIndex when pausing - keep it at current affirmation
  }, []);

  const stopPlaying = useCallback(() => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    isInterruptedRef.current = false; // Clear any interruption state
    setRemainingDelay(0);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (countdownRef.current) {
      clearTimeout(countdownRef.current);
    }
    
    Speech.stop();
    setCurrentIndex(0);
  }, []);

  const getCurrentAffirmation = useCallback(() => {
    return affirmations[currentIndex] || affirmations[0];
  }, [currentIndex, affirmations]);

  // Voice settings management functions
  const setVoiceSettings = useCallback((voice: string, volume: number, delay: number) => {
    const oldVolume = voiceVolumeRef.current;
    const oldVoice = selectedVoiceRef.current;
    const volumeChanged = Math.abs(oldVolume - volume) > 0.01; // Small threshold to avoid float precision issues
    const voiceChanged = oldVoice !== voice;
    
    selectedVoiceRef.current = voice;
    voiceVolumeRef.current = Math.max(0, Math.min(1, volume)); // Clamp 0-1
    affirmationDelayRef.current = Math.max(0, Math.min(15000, delay)); // Clamp 0-15s
    
    // If volume or voice changed during active speech, interrupt and restart immediately
    if ((volumeChanged || voiceChanged) && isPlayingRef.current) {
      console.log('🔊 Voice settings changed during speech, interrupting for immediate effect');
      isInterruptedRef.current = true;
      Speech.stop();
      
      // Restart current affirmation immediately with new settings
      setTimeout(() => {
        if (isPlayingRef.current && isInterruptedRef.current) {
          isInterruptedRef.current = false;
          console.log('🔄 Restarting current affirmation with new voice settings');
          playAffirmation(affirmations[currentIndex]);
        }
      }, 50);
    }
    
    console.log('🎤 Voice settings updated:', { voice, volume, delay, wasRestarted: (volumeChanged || voiceChanged) && isPlayingRef.current });
  }, [affirmations, currentIndex, playAffirmation]);

  const getVoiceSettings = useCallback(() => ({
    voice: selectedVoiceRef.current,
    volume: voiceVolumeRef.current,
    delay: affirmationDelayRef.current
  }), []);

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      isPlayingRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
      }
      Speech.stop();
    };
  }, []);

  return {
    isPlaying,
    currentIndex,
    startPlaying,
    pausePlaying,
    stopPlaying,
    getCurrentAffirmation,
    totalAffirmations: affirmations.length,
    // Voice settings API
    setVoiceSettings,
    getVoiceSettings,
    remainingDelay,
    get selectedVoice() { return selectedVoiceRef.current; },
    get voiceVolume() { return voiceVolumeRef.current; },
    get affirmationDelay() { return affirmationDelayRef.current; }
  };
};