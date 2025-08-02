import { useRef, useCallback } from 'react';

// Global volume manager to prevent component re-renders
class VolumeManager {
  private volume: number = 0.3;
  private listeners: Set<(volume: number) => void> = new Set();

  getVolume(): number {
    return this.volume;
  }

  setVolume(newVolume: number): void {
    this.volume = newVolume;
    this.listeners.forEach(listener => listener(newVolume));
  }

  subscribe(listener: (volume: number) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

const globalVolumeManager = new VolumeManager();

export const useVolumeManager = () => {
  const setVolumeRef = useRef<((volume: number) => Promise<void>) | null>(null);

  const getVolume = useCallback(() => {
    return globalVolumeManager.getVolume();
  }, []);

  const setVolume = useCallback(async (newVolume: number) => {
    console.log('🎛️ Volume manager setting volume to:', newVolume);
    globalVolumeManager.setVolume(newVolume);
    
    // Call the actual audio setVolume function if available
    if (setVolumeRef.current) {
      await setVolumeRef.current(newVolume);
    }
  }, []);

  const registerVolumeControl = useCallback((volumeControlFn: (volume: number) => Promise<void>) => {
    setVolumeRef.current = volumeControlFn;
    console.log('🔗 Volume control registered');
  }, []);

  const subscribeToVolumeChanges = useCallback((listener: (volume: number) => void) => {
    return globalVolumeManager.subscribe(listener);
  }, []);

  return {
    getVolume,
    setVolume,
    registerVolumeControl,
    subscribeToVolumeChanges
  };
};