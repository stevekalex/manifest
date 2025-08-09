import { Audio, AVPlaybackStatus } from 'expo-av';

export class BackGroundAndPreviewPlayer {
  private background?: Audio.Sound;
  private preview?: Audio.Sound;
  private backgroundVolume = 0.7;
  private isCleaningUp = false;
  private isDucked = false;
  private instanceId: string;
  
  constructor() {
    this.instanceId = Math.random().toString(36).substring(2, 9);
    console.log('🎵 BackgroundAndPreviewPlayer instance created with ID:', this.instanceId);
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
    console.log(`🎵 BackgroundAndPreviewPlayer[${this.instanceId}].playBackground called:`, {
      localPath,
      volume,
      pathType: typeof localPath
    });
    
    try {
      await this.cleanupBackground();
      this.backgroundVolume = volume;
      const source: any = typeof localPath === 'string' ? { uri: localPath } : localPath;
      
      console.log(`🔊 BackgroundAndPreviewPlayer[${this.instanceId}]: Creating Audio.Sound with source:`, source);
      
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
      console.log(`✅ BackgroundAndPreviewPlayer[${this.instanceId}]: Background audio loaded successfully!`);
      
      // Verify it's playing
      const status = await sound.getStatusAsync();
      console.log(`📊 BackgroundAndPreviewPlayer[${this.instanceId}]: Initial audio status:`, {
        isLoaded: status.isLoaded,
        isPlaying: status.isLoaded ? status.isPlaying : 'N/A',
        volume: status.isLoaded ? status.volume : 'N/A'
      });
      
    } catch (error) {
      console.error(`❌ BackgroundAndPreviewPlayer[${this.instanceId}]: Failed to play background:`, error);
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
    console.log(`🎵 BackgroundAndPreviewPlayer[${this.instanceId}].setBackgroundVolume called:`, {
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
      console.log(`🔊 BackgroundAndPreviewPlayer[${this.instanceId}]: Setting actual volume to:`, actualVolume);
      
      try {
        await this.background.setVolumeAsync(actualVolume);
        console.log(`✅ BackgroundAndPreviewPlayer[${this.instanceId}]: Volume successfully set to:`, actualVolume);
        
        // Verify the volume was set correctly
        const status = await this.background.getStatusAsync();
        if (status.isLoaded) {
          console.log(`📊 BackgroundAndPreviewPlayer[${this.instanceId}]: Current audio status:`, {
            volume: status.volume,
            isLoaded: status.isLoaded,
            isPlaying: status.isPlaying
          });
        }
      } catch (error) {
        console.error(`❌ BackgroundAndPreviewPlayer[${this.instanceId}]: Error setting volume:`, error);
      }
    } else {
      console.warn(`⚠️ BackgroundAndPreviewPlayer[${this.instanceId}]: No background audio loaded to set volume on`);
    }
  }

  async switchBackground(localPath: string | number, volume?: number) {
    const startTime = Date.now();
    console.log(`🔄 BackgroundAndPreviewPlayer[${this.instanceId}].switchBackground called:`, {
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
      
      // FAST HANDOFF: Start creating new sound immediately (parallel with fade-out)
      console.log(`🎵 BackgroundAndPreviewPlayer[${this.instanceId}]: Creating new background track in parallel`);
      
      const source: any = typeof localPath === 'string' ? { uri: localPath } : localPath;
      const newSoundPromise = Audio.Sound.createAsync(
        source,
        { 
          isLooping: true,
          volume: actualVolume,
          shouldPlay: true,
        },
        this.onBackgroundStatusUpdate.bind(this)
      );
      
      // While new sound loads, quickly fade out old background (if exists)
      if (oldBackground) {
        console.log(`🎵 BackgroundAndPreviewPlayer[${this.instanceId}]: Quick fade-out of old background`);
        try {
          // Fast volume fade (150ms) instead of abrupt stop
          const fadeSteps = 5;
          const currentStatus = await oldBackground.getStatusAsync();
          const currentVolume = currentStatus.isLoaded ? currentStatus.volume || actualVolume : actualVolume;
          
          for (let i = 1; i <= fadeSteps; i++) {
            const fadeVolume = currentVolume * (1 - (i / fadeSteps));
            await oldBackground.setVolumeAsync(Math.max(0, fadeVolume));
            await new Promise(resolve => setTimeout(resolve, 30)); // 30ms per step = 150ms total
          }
          
          // Stop old background
          oldBackground.setOnPlaybackStatusUpdate(null);
          await oldBackground.stopAsync();
        } catch (e) {
          console.log('Old background cleanup had minor issues (expected)');
        }
      }
      
      // Await new sound creation and assign
      const { sound: newSound } = await newSoundPromise;
      this.background = newSound;
      this.backgroundVolume = targetVolume;
      
      // Clean up old sound after new one is playing
      if (oldBackground) {
        try {
          await oldBackground.unloadAsync();
        } catch (e) {}
      }
      
      const endTime = Date.now();
      console.log(`✅ BackgroundAndPreviewPlayer[${this.instanceId}]: Background switched with fast handoff in ${endTime - startTime}ms`);
      
    } catch (error) {
      console.error(`❌ BackgroundAndPreviewPlayer[${this.instanceId}]: Failed to switch background:`, error);
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
  
  async playPreview(sampleUrl: string | number, onPreviewEnd?: () => Promise<void>): Promise<void> {
    try {
      await this.stopPreview();
      
      // Handle both require() modules (numbers) and URL strings
      const source: any = typeof sampleUrl === 'number' ? sampleUrl : { uri: sampleUrl };
      console.log('🎤 Creating preview sound with source type:', typeof sampleUrl);
      
      // PARALLEL EXECUTION: Start ducking and sound creation simultaneously (unless skipped)
      const soundPromise = Audio.Sound.createAsync(
        source,
        { shouldPlay: true, volume: 1.0 }
      );
      
      // Duck the background and create sound in parallel
      const duckPromise = this.duckBackground(true);
      const [, { sound }] = await Promise.all([duckPromise, soundPromise]);
      this.preview = sound;
      this.preview.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded && status.didJustFinish) {
          await this.stopPreview();
          // Call the callback to resume main affirmations
          if (onPreviewEnd) {
            try {
              await onPreviewEnd();
            } catch (e) {
              console.error('Error in preview end callback:', e);
            }
          }
        }
      });
    } catch (error) {
      // Restore background volume if preview failed
      await this.duckBackground(false);
      console.error('Preview failed:', error);
      throw error;
    }
  }
  
  async stopPreview() {
    if (this.preview) {
      try {
        this.preview.setOnPlaybackStatusUpdate(null);
        await this.preview.stopAsync();
        await this.preview.unloadAsync();
      } catch (e) {}
      this.preview = undefined;
      // Restore background volume after preview ends
      await this.duckBackground(false);
    }
  }
  
  private onBackgroundStatusUpdate(status: AVPlaybackStatus) {
    // Extend as needed
  }
  
  async cleanup() {
    this.isCleaningUp = true;
    await this.cleanupBackground();
    await this.stopPreview();
  }
}