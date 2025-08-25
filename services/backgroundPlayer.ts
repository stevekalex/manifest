import { Audio, AVPlaybackStatus } from 'expo-av';

export class BackgroundPlayer {
  private background?: Audio.Sound;
  private backgroundVolume = 0.7;
  private isCleaningUp = false;
  private isDucked = false;
  private instanceId: string;
  
  constructor() {
    this.instanceId = Math.random().toString(36).substring(2, 9);
    console.log('🎵 BackgroundPlayer instance created with ID:', this.instanceId);
    this.setupAudioMode();
  }
  
  private async setupAudioMode() {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }
  
  async playBackground(localPath: string | number, volume: number = 0.7) {
    console.log(`🎵 BackgroundPlayer[${this.instanceId}].playBackground called:`, {
      localPath,
      volume,
      pathType: typeof localPath
    });
    
    try {
      await this.cleanupBackground();
      this.backgroundVolume = volume;
      const source: any = typeof localPath === 'string' ? { uri: localPath } : localPath;
      
      console.log(`🔊 BackgroundPlayer[${this.instanceId}]: Creating Audio.Sound with source:`, source);
      
      const { sound } = await Audio.Sound.createAsync(
        source,
        { 
          isLooping: true,
          volume,
          shouldPlay: true,
        },
        this.onBackgroundStatusUpdate.bind(this)
      );
      
      this.background = sound;
      console.log(`✅ BackgroundPlayer[${this.instanceId}]: Background audio loaded successfully!`);
      
      // Verify it's playing
      const status = await sound.getStatusAsync();
      console.log(`📊 BackgroundPlayer[${this.instanceId}]: Initial audio status:`, {
        isLoaded: status.isLoaded,
        isPlaying: status.isLoaded ? status.isPlaying : 'N/A',
        volume: status.isLoaded ? status.volume : 'N/A'
      });
      
    } catch (error) {
      console.error(`❌ BackgroundPlayer[${this.instanceId}]: Failed to play background:`, error);
      throw error;
    }
  }

  async pauseBackground() {
    if (this.background) {
      await this.background.pauseAsync();
    }
  }

  async resumeBackground() {
    if (this.background) {
      await this.background.playAsync();
    }
  }

  async setBackgroundVolume(volume: number) {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    console.log(`🎵 BackgroundPlayer[${this.instanceId}].setBackgroundVolume called:`, {
      originalVolume: volume,
      clampedVolume,
      hasBackground: !!this.background,
      isDucked: this.isDucked,
      currentBackgroundVolume: this.backgroundVolume
    });
    
    this.backgroundVolume = clampedVolume;
    
    if (this.background) {
      // Apply the appropriate volume based on current ducking state
      const actualVolume = this.isDucked ? this.backgroundVolume * 0.3 : this.backgroundVolume;
      console.log(`🔊 BackgroundPlayer[${this.instanceId}]: Setting actual volume to:`, actualVolume);
      
      try {
        await this.background.setVolumeAsync(actualVolume);
        console.log(`✅ BackgroundPlayer[${this.instanceId}]: Volume successfully set to:`, actualVolume);
        
        // Verify the volume was set correctly
        const status = await this.background.getStatusAsync();
        if (status.isLoaded) {
          console.log(`📊 BackgroundPlayer[${this.instanceId}]: Current audio status:`, {
            volume: status.volume,
            isLoaded: status.isLoaded,
            isPlaying: status.isPlaying
          });
        }
      } catch (error) {
        console.error(`❌ BackgroundPlayer[${this.instanceId}]: Error setting volume:`, error);
      }
    } else {
      console.warn(`⚠️ BackgroundPlayer[${this.instanceId}]: No background audio loaded to set volume on`);
    }
  }

  async switchBackground(localPath: string | number, volume?: number) {
    const startTime = Date.now();
    console.log(`🔄 BackgroundPlayer[${this.instanceId}].switchBackground called:`, {
      localPath,
      volume: volume || this.backgroundVolume,
      pathType: typeof localPath,
      currentlyHasBackground: !!this.background,
      timestamp: startTime
    });
    
    // Use current volume if not specified  
    const targetVolume = volume !== undefined ? volume : this.backgroundVolume;
    const actualVolume = this.isDucked ? targetVolume * 0.3 : targetVolume;
    
    try {
      const oldBackground = this.background;
      
      // CRITICAL: Stop old background COMPLETELY before starting new one
      if (oldBackground) {
        console.log(`🛑 BackgroundPlayer[${this.instanceId}]: Stopping old background completely`);
        try {
          // Clear callback to prevent interference
          oldBackground.setOnPlaybackStatusUpdate(null);
          // Stop and unload old background immediately
          await oldBackground.stopAsync();
          await oldBackground.unloadAsync();
        } catch (e) {
          console.log('🔧 BackgroundPlayer: Old background cleanup completed with minor issues (expected)');
        }
        // Clear reference immediately to prevent any lingering issues
        this.background = undefined;
      }
      
      // NOW create and start new sound (after old one is completely gone)
      console.log(`🎵 BackgroundPlayer[${this.instanceId}]: Creating new background track`);
      
      const source: any = typeof localPath === 'string' ? { uri: localPath } : localPath;
      const { sound: newSound } = await Audio.Sound.createAsync(
        source,
        { 
          isLooping: true,
          volume: actualVolume,
          shouldPlay: true,
        },
        this.onBackgroundStatusUpdate.bind(this)
      );
      
      // Set new background
      this.background = newSound;
      this.backgroundVolume = targetVolume;
      
      // Verify new sound is playing
      const status = await newSound.getStatusAsync();
      console.log(`📊 BackgroundPlayer[${this.instanceId}]: New background status:`, {
        isLoaded: status.isLoaded,
        isPlaying: status.isLoaded ? status.isPlaying : 'N/A',
        volume: status.isLoaded ? status.volume : 'N/A'
      });
      
      const endTime = Date.now();
      console.log(`✅ BackgroundPlayer[${this.instanceId}]: Background switched successfully in ${endTime - startTime}ms`);
      
    } catch (error) {
      console.error(`❌ BackgroundPlayer[${this.instanceId}]: Failed to switch background:`, error);
      throw error;
    }
  }
  
  private async cleanupBackground() {
    if (this.background) {
      try {
        this.background.setOnPlaybackStatusUpdate(null);
        await this.background.stopAsync();
        await this.background.unloadAsync();
      } catch (e) {}
      this.background = undefined;
    }
  }
  
  async duckBackground(ducked: boolean, duration: number = 500) {
    if (!this.background || this.isCleaningUp) return;
    this.isDucked = ducked;
    const targetVolume = ducked ? this.backgroundVolume * 0.3 : this.backgroundVolume;
    try {
      const status = await this.background.getStatusAsync();
      if (!status.isLoaded) return;
      const currentVolume = status.volume || this.backgroundVolume;
      const steps = 20;
      const stepDuration = duration / steps;
      const volumeStep = (targetVolume - currentVolume) / steps;
      for (let i = 0; i < steps; i++) {
        if (this.isCleaningUp) break;
        const newVolume = Math.max(0, Math.min(1, currentVolume + volumeStep * (i + 1)));
        await this.background.setVolumeAsync(newVolume);
        await new Promise(resolve => setTimeout(resolve, stepDuration));
      }
    } catch (e) {}
  }
  
  
  private onBackgroundStatusUpdate(status: AVPlaybackStatus) {
    // Extend as needed
  }
  
  async cleanup() {
    this.isCleaningUp = true;
    await this.cleanupBackground();
  }
}