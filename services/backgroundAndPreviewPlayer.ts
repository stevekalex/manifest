import { Audio, AVPlaybackStatus } from 'expo-av';

export class BackGroundAndPreviewPlayer {
  private background?: Audio.Sound;
  private preview?: Audio.Sound;
  private backgroundVolume = 0.7;
  private isCleaningUp = false;
  
  constructor() {
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
    try {
      await this.cleanupBackground();
      this.backgroundVolume = volume;
      const source: any = typeof localPath === 'string' ? { uri: localPath } : localPath;
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
    } catch (error) {
      console.error('Failed to play background:', error);
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
  
  async playPreview(sampleUrl: string): Promise<void> {
    try {
      await this.stopPreview();
      await this.duckBackground(true);
      const { sound } = await Audio.Sound.createAsync(
        { uri: sampleUrl },
        { shouldPlay: true, volume: 1.0 }
      );
      this.preview = sound;
      this.preview.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          this.stopPreview();
        }
      });
    } catch (error) {
      await this.duckBackground(false);
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
    }
    await this.duckBackground(false);
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