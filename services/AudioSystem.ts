import { Audio, AVPlaybackStatus } from 'expo-av';
import { createActor } from 'xstate';
import { audioMachine, type AudioMachineActor } from './audioMachine';
import type {
  AudioSystemInterface,
  AudioSystemState,
  PlayerInstance,
  Playlist,
  VoiceId,
} from '../types/audio';

// Custom player wrapper for expo-av
class ExpoAVPlayer implements PlayerInstance {
  private sound: Audio.Sound | null = null;
  private isSetup = false;

  constructor(private playerType: 'background' | 'affirmations' | 'preview') {}

  async setupPlayer(): Promise<void> {
    if (this.isSetup) return;
    
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: this.playerType === 'background',
        playThroughEarpieceAndroid: false,
      });
      this.isSetup = true;
    } catch (error) {
      console.error(`${this.playerType} player setup error:`, error);
      throw error;
    }
  }

  async loadSound(uri: string, options: { volume?: number; isLooping?: boolean } = {}): Promise<void> {
    if (this.sound) {
      await this.unload();
    }

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        {
          shouldPlay: false,
          isLooping: options.isLooping || false,
          volume: options.volume || 1.0,
        },
        this.onPlaybackStatusUpdate.bind(this)
      );
      this.sound = sound;
    } catch (error) {
      console.error(`${this.playerType} sound loading error:`, error);
      throw error;
    }
  }

  async play(): Promise<void> {
    if (!this.sound) throw new Error('No sound loaded');
    await this.sound.playAsync();
  }

  async pause(): Promise<void> {
    if (!this.sound) return;
    await this.sound.pauseAsync();
  }

  async stop(): Promise<void> {
    if (!this.sound) return;
    await this.sound.stopAsync();
  }

  async setVolume(volume: number): Promise<void> {
    if (!this.sound) return;
    await this.sound.setVolumeAsync(volume);
  }

  async getStatus(): Promise<AVPlaybackStatus> {
    if (!this.sound) throw new Error('No sound loaded');
    return await this.sound.getStatusAsync();
  }

  async unload(): Promise<void> {
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }
  }

  private onPlaybackStatusUpdate(status: AVPlaybackStatus): void {
    if (!status.isLoaded) {
      if (status.error) {
        console.error(`${this.playerType} playback error:`, status.error);
      }
    }
  }
}

export class AudioSystem implements AudioSystemInterface {
  private players: {
    background: ExpoAVPlayer;
    affirmations: ExpoAVPlayer;
    preview: ExpoAVPlayer;
  };
  
  private stateMachine: AudioMachineActor;
  private listeners: Set<(state: AudioSystemState) => void> = new Set();
  private currentPlaylist?: Playlist;
  private affirmationTimeout?: NodeJS.Timeout;

  constructor() {
    // Initialize three separate players
    this.players = {
      background: new ExpoAVPlayer('background'),
      affirmations: new ExpoAVPlayer('affirmations'),
      preview: new ExpoAVPlayer('preview'),
    };
    
    // Initialize state machine
    this.stateMachine = createActor(audioMachine);
    this.stateMachine.start();
    
    // Subscribe to state changes
    this.stateMachine.subscribe((snapshot) => {
      const state = this.mapMachineStateToAudioState(snapshot);
      this.notifyListeners(state);
    });
    
    // Setup error boundaries
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    // Note: expo-av doesn't have addEventListener like TrackPlayer
    // Error handling will be done in try-catch blocks in individual methods
  }

  private async handlePlayerError(playerType: 'background' | 'affirmations', error: Error): Promise<void> {
    console.error(`${playerType} player error:`, error);
    
    this.stateMachine.send({
      type: 'PLAYER_ERROR',
      playerType,
      error,
    });

    // Attempt recovery based on error count
    const snapshot = this.stateMachine.getSnapshot();
    const errorCount = snapshot.context.errorCounts[`${playerType}_error_count`] || 0;
    
    if (errorCount <= 3) {
      // Try to recover
      setTimeout(() => {
        this.stateMachine.send({ type: 'RETRY' });
      }, 1000 * Math.pow(2, errorCount)); // Exponential backoff
    } else {
      // Too many errors, skip if possible
      if (playerType === 'affirmations') {
        this.stateMachine.send({ type: 'SKIP' });
      }
    }
  }

  async playPlaylist(playlist: Playlist, voiceId: VoiceId): Promise<void> {
    try {
      this.currentPlaylist = playlist;
      
      // Send state machine event
      this.stateMachine.send({
        type: 'START_PLAYBACK',
        playlist,
        voiceId,
      });

      // Setup players
      await Promise.all([
        this.players.background.setupPlayer(),
        this.players.affirmations.setupPlayer(),
      ]);

      // Start background music
      await this.startBackgroundMusic(playlist.backgroundTrackUrl);
      
      // Start affirmations
      await this.startAffirmations(voiceId);
      
    } catch (error) {
      await this.handlePlayerError('background', error as Error);
    }
  }

  private async startBackgroundMusic(backgroundUrl: string): Promise<void> {
    try {
      await this.players.background.loadSound(backgroundUrl, {
        volume: 0.3, // Default background volume
        isLooping: true,
      });
      await this.players.background.play();
    } catch (error) {
      await this.handlePlayerError('background', error as Error);
    }
  }

  private async startAffirmations(voiceId: VoiceId): Promise<void> {
    const snapshot = this.stateMachine.getSnapshot();
    const trackIndex = snapshot.context.currentTrackIndex;
    
    if (!this.currentPlaylist || trackIndex >= this.currentPlaylist.affirmations.length) {
      return;
    }

    try {
      // For Phase 0, we'll use a placeholder approach since we don't have CDN yet
      // This will be replaced in Phase 1 with actual audio files
      const affirmation = this.currentPlaylist.affirmations[trackIndex];
      console.log(`Playing affirmation: ${affirmation.text} with voice: ${voiceId}`);
      
      // Simulate affirmation playback duration (replace with actual audio in Phase 1)
      this.affirmationTimeout = setTimeout(() => {
        this.playNextAffirmation();
      }, 5000); // 5 second placeholder
      
    } catch (error) {
      await this.handlePlayerError('affirmations', error as Error);
    }
  }

  private playNextAffirmation(): void {
    this.stateMachine.send({ type: 'NEXT_TRACK' });
    
    const snapshot = this.stateMachine.getSnapshot();
    const voiceId = snapshot.context.currentVoiceId;
    
    // Continue playing if there are more affirmations
    if (this.currentPlaylist && snapshot.context.currentTrackIndex < this.currentPlaylist.affirmations.length) {
      this.startAffirmations(voiceId);
    }
  }

  async pause(): Promise<void> {
    this.stateMachine.send({ type: 'PAUSE_PLAYBACK' });
    
    if (this.affirmationTimeout) {
      clearTimeout(this.affirmationTimeout);
    }
    
    await Promise.all([
      this.players.background.pause(),
      this.players.affirmations.pause(),
    ]);
  }

  async resume(): Promise<void> {
    this.stateMachine.send({ type: 'RESUME_PLAYBACK' });
    
    const snapshot = this.stateMachine.getSnapshot();
    const voiceId = snapshot.context.currentVoiceId;
    
    await this.players.background.play();
    await this.startAffirmations(voiceId);
  }

  async stop(): Promise<void> {
    this.stateMachine.send({ type: 'STOP_PLAYBACK' });
    
    if (this.affirmationTimeout) {
      clearTimeout(this.affirmationTimeout);
    }
    
    await Promise.all([
      this.players.background.stop(),
      this.players.affirmations.stop(),
    ]);
  }

  openVoiceModal(): void {
    this.stateMachine.send({ type: 'OPEN_VOICE_MODAL' });
    // Pause affirmations but keep background playing
    if (this.affirmationTimeout) {
      clearTimeout(this.affirmationTimeout);
    }
  }

  closeVoiceModal(): void {
    this.stateMachine.send({ type: 'CLOSE_VOICE_MODAL' });
    // Resume affirmations
    const snapshot = this.stateMachine.getSnapshot();
    const voiceId = snapshot.context.currentVoiceId;
    this.startAffirmations(voiceId);
  }

  async setVoice(voiceId: VoiceId): Promise<void> {
    this.stateMachine.send({
      type: 'SET_VOICE',
      voiceId,
    });
    
    // If currently playing, restart with new voice
    const snapshot = this.stateMachine.getSnapshot();
    if (snapshot.matches({ playing: { affirmations: 'active' } })) {
      await this.startAffirmations(voiceId);
    }
  }

  async previewVoice(voiceId: VoiceId, affirmationIndex: number = 0): Promise<void> {
    if (!this.currentPlaylist) return;
    
    try {
      // For Phase 0, just log the preview
      const affirmation = this.currentPlaylist.affirmations[affirmationIndex];
      console.log(`Previewing voice ${voiceId} with: ${affirmation.text}`);
      
      // TODO: In Phase 1, load actual preview audio file using preview player
      // const previewPath = getVoiceAssetPath(voiceId, affirmationIndex, 'preview');
      // await this.players.preview.loadSound(previewPath);
      // await this.players.preview.play();
      
    } catch (error) {
      console.error('Preview error:', error);
    }
  }

  getState(): AudioSystemState {
    const snapshot = this.stateMachine.getSnapshot();
    return this.mapMachineStateToAudioState(snapshot);
  }

  subscribe(listener: (state: AudioSystemState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async destroy(): Promise<void> {
    if (this.affirmationTimeout) {
      clearTimeout(this.affirmationTimeout);
    }
    
    this.stateMachine.stop();
    
    await Promise.all([
      this.players.background.unload(),
      this.players.affirmations.unload(),
      this.players.preview.unload(),
    ]);
  }

  private mapMachineStateToAudioState(snapshot: any): AudioSystemState {
    const context = snapshot.context;
    const value = snapshot.value;
    
    // Determine player state
    let playerState: AudioSystemState['playerState'] = 'idle';
    if (typeof value === 'object' && value.playing) {
      playerState = 'playing';
    } else if (value === 'error_recovery') {
      playerState = 'error_recovery';
    }
    
    // Determine individual player states
    const backgroundPlaying = typeof value === 'object' && 
                             value.playing?.background === 'active';
    const affirmationsPlaying = typeof value === 'object' && 
                               value.playing?.affirmations === 'active';
    
    return {
      playerState,
      currentVoiceId: context.currentVoiceId,
      currentTrackIndex: context.currentTrackIndex,
      modalOpen: context.modalOpen,
      isPlaying: backgroundPlaying && affirmationsPlaying,
      backgroundPlaying,
      affirmationsPlaying,
    };
  }

  private notifyListeners(state: AudioSystemState): void {
    this.listeners.forEach(listener => listener(state));
  }
}