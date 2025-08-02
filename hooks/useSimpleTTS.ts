import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import * as Speech from 'expo-speech';

export const useSimpleTTS = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const timeoutRef = useRef<NodeJS.Timeout>();
  const isPlayingRef = useRef(false);

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
      Speech.speak(text, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.5,
        volume: 1.0,
        onDone: () => resolve(),
        onStopped: () => resolve(),
        onError: () => resolve()
      });
    });
  }, []);

  const playNext = useCallback(async (index: number) => {
    if (!isPlayingRef.current || index >= affirmations.length) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      return;
    }

    setCurrentIndex(index);
    
    // Play the affirmation
    await playAffirmation(affirmations[index]);

    // If still playing, wait 5 seconds then play next
    if (isPlayingRef.current) {
      timeoutRef.current = setTimeout(() => {
        if (isPlayingRef.current) {
          playNext(index + 1);
        }
      }, 5000) as any;
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
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    Speech.stop();
  }, []);

  const stopPlaying = useCallback(() => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    Speech.stop();
    setCurrentIndex(0);
  }, []);

  const getCurrentAffirmation = useCallback(() => {
    return affirmations[currentIndex] || affirmations[0];
  }, [currentIndex, affirmations]);

  // Auto-start when component mounts
  useEffect(() => {
    startPlaying();
    
    // Cleanup when component unmounts
    return () => {
      isPlayingRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      Speech.stop();
    };
  }, [startPlaying]);

  return {
    isPlaying,
    currentIndex,
    startPlaying,
    pausePlaying,
    stopPlaying,
    getCurrentAffirmation,
    totalAffirmations: affirmations.length
  };
};