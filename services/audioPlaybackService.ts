import TrackPlayer, { 
    State, 
    Event as TrackPlayerEvent,
    Track,
    RepeatMode,
    Capability,
    IOSCategoryMode,
    IOSCategoryOptions,
    AndroidAudioContentType
  } from 'react-native-track-player';

  import { BackGroundAndPreviewPlayer } from './backgroundAndPreviewPlayer';
  import { PausedState, DELAY_STEPS } from '../types/audio';
  import { AppState, AppStateStatus } from 'react-native';
  import AsyncStorage from '@react-native-async-storage/async-storage';
  
  // Event debouncing service
  class EventDebouncer {
    private lastTrackChangeTime = 0;
    private readonly DEBOUNCE_MS = 100;

    shouldProcessTrackChange(): boolean {
      const now = Date.now();
      if (now - this.lastTrackChangeTime < this.DEBOUNCE_MS) {
        return false; // Ignore rapid duplicate events
      }
      this.lastTrackChangeTime = now;
      return true;
    }
  }

  export class AudioPlaybackService {
    private backgroundPlayer: BackGroundAndPreviewPlayer;
    private affirmationsReady = false;
    private appStateSubscription?: any;
    private debouncer = new EventDebouncer();
    public onTrackAdvanced?: (trackIndex: number) => void;
    
    // Phase 1A: Event suppression function
    public shouldSuppressEvents?: () => boolean;
    
    constructor() {
      this.backgroundPlayer = new BackGroundAndPreviewPlayer();
      this.setupAppStateHandling();
    }
    
    async initialize() {
      if (this.affirmationsReady) return;
      
      await TrackPlayer.setupPlayer({
        // iOS options
        iosCategoryMode: IOSCategoryMode.SpokenAudio,
        iosCategoryOptions: [IOSCategoryOptions.MixWithOthers],
        
        // Android options
        androidAudioContentType: AndroidAudioContentType.Speech,
      });
      
      await TrackPlayer.updateOptions({
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
        ],
        compactCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
        ],
      });
      
      this.affirmationsReady = true;
      this.setupEventListeners();
    }
    
    private setupEventListeners() {
      TrackPlayer.addEventListener(TrackPlayerEvent.RemotePlay, () => TrackPlayer.play());
      TrackPlayer.addEventListener(TrackPlayerEvent.RemotePause, () => TrackPlayer.pause());
      TrackPlayer.addEventListener(TrackPlayerEvent.RemoteNext, () => TrackPlayer.skipToNext());
      TrackPlayer.addEventListener(TrackPlayerEvent.RemotePrevious, () => TrackPlayer.skipToPrevious());
      
      // Notify coordinator when track advances with debouncing and suppression
      TrackPlayer.addEventListener(TrackPlayerEvent.PlaybackTrackChanged, (event) => {
        // Phase 1A: Suppress events during preview or structural operations
        if (this.shouldSuppressEvents?.()) {
          console.log('🚫 Suppressing RNTP PlaybackTrackChanged event - preview/structural op active');
          return;
        }
        
        if (event.nextTrack !== null && this.debouncer.shouldProcessTrackChange() && this.onTrackAdvanced) {
          console.log(`🎵 RNTP Track advanced to index: ${event.nextTrack}`);
          this.onTrackAdvanced(event.nextTrack);
        }
      });
    }
    
    private setupAppStateHandling() {
      this.appStateSubscription = AppState.addEventListener(
        'change',
        this.handleAppStateChange.bind(this)
      );
    }
    
    private async handleAppStateChange(nextAppState: AppStateStatus) {
      if (nextAppState === 'background') {
        // Save state when going to background
        await this.savePlaybackState();
      }
    }
    
    async playBackground(localPath: string | number, volume: number = 0.7) {
      await this.backgroundPlayer.playBackground(localPath, volume);
    }
    
    async setupAffirmationsQueue(tracks: Track[]) {
      await this.initialize();
      await TrackPlayer.reset();
      await TrackPlayer.add(tracks);
      await TrackPlayer.setRepeatMode(RepeatMode.Queue);
    }
    
    async playAffirmations() {
      await TrackPlayer.play();
      // Note: Don't set store.isPlaying here - let state machine handle it
    }
    
    async pauseAffirmations(): Promise<PausedState> {
      try {
        const [progressRes, indexRes] = await Promise.allSettled([
          TrackPlayer.getProgress(), // { position, duration, buffered }
          (TrackPlayer as any).getActiveTrackIndex
            ? (TrackPlayer as any).getActiveTrackIndex()
            : (TrackPlayer as any).getActiveTrack
              ? (TrackPlayer as any).getActiveTrack().then((t: any) => t?.index ?? 0)
              : Promise.resolve(0),
        ]);

        const position =
          progressRes.status === 'fulfilled' ? progressRes.value.position : 0;
        const trackIndex =
          indexRes.status === 'fulfilled' ? (indexRes.value as number) : 0;

        await TrackPlayer.pause();
        // Note: Don't set store.isPlaying here - let state machine handle it

        return {
          trackIndex,
          positionMs: Math.floor(position * 1000),
          timestamp: Date.now(),
        };
      } catch {
        // Fallback to safe defaults
        await TrackPlayer.pause().catch(() => {});
        // Note: Don't set store.isPlaying here - let state machine handle it
        return { trackIndex: 0, positionMs: 0, timestamp: Date.now() };
      }
    }
    
    async resumeAffirmations(pausedState?: PausedState) {
      if (pausedState) {
        // Seek to exact position
        await TrackPlayer.seekTo(pausedState.positionMs / 1000);
      }
      await TrackPlayer.play();
      // Note: Don't set store.isPlaying here - let state machine handle it
    }
    
    async skipToNextTrack() {
      await TrackPlayer.skipToNext();
      await TrackPlayer.play();
      // Note: Don't set store.isPlaying here - let state machine handle it
    }
    
    async previewVoice(sampleUrl: string | number) {
      // No auto-resume - loop should stay stopped until modal closes
      await this.backgroundPlayer.playPreview(sampleUrl as any);
    }
    
    async stopPreview() {
      await this.backgroundPlayer.stopPreview();
    }
    
    async updateUpcomingTracks(tracks: Track[], fromIndex: number) {
      // Get current queue
      const queue = await TrackPlayer.getQueue();
      const currentIndex = await TrackPlayer.getCurrentTrack() || 0;
      
      if (fromIndex <= currentIndex) {
        console.warn('Cannot update tracks that have already played');
        return;
      }
      
      // Remove all tracks after fromIndex
      const removeCount = queue.length - fromIndex;
      if (removeCount > 0) {
        const indicesToRemove = Array.from(
          { length: removeCount }, 
          (_, i) => fromIndex + i
        );
        await TrackPlayer.remove(indicesToRemove);
      }
      
      // Add new tracks
      await TrackPlayer.add(tracks);
    }
    
    async getAffirmationsState(): Promise<{
      state: State;
      position: number;
      trackIndex: number;
      trackDuration: number;
    }> {
      try {
        const [stateRes, progressRes, trackRes] = await Promise.allSettled([
          TrackPlayer.getPlaybackState(),
          TrackPlayer.getProgress(),
          TrackPlayer.getActiveTrack(),
        ]);
    
        const state =
          stateRes.status === 'fulfilled' ? stateRes.value.state : State.None;
        const position =
          progressRes.status === 'fulfilled' ? progressRes.value.position : 0;
        const track = trackRes.status === 'fulfilled' ? trackRes.value : undefined;
    
        const trackIndex = (track as any)?.id ?? 0;
        const trackDuration = (track as any)?.duration ?? 0;
    
        return { state, position, trackIndex, trackDuration };
      } catch {
        return { state: State.None, position: 0, trackIndex: 0, trackDuration: 0 };
      }
    }
    
    async pauseAll() {
      await this.pauseAffirmations();
      await this.backgroundPlayer.pauseBackground();
    }
    
    async resumeAll() {
      await this.resumeAffirmations();
      await this.backgroundPlayer.resumeBackground();
    }

    async pauseBackground() {
      await this.backgroundPlayer.pauseBackground();
    }

    async resumeBackground() {
      await this.backgroundPlayer.resumeBackground();
    }

    async setBackgroundVolume(volume: number) {
      console.log('🎵 AudioPlaybackService.setBackgroundVolume called with:', volume);
      await this.backgroundPlayer.setBackgroundVolume(volume);
      console.log('✅ AudioPlaybackService.setBackgroundVolume completed');
    }

    async setAffirmationVolume(volume: number) {
      console.log('🎤 AudioPlaybackService.setAffirmationVolume called with:', volume);
      const clampedVolume = Math.max(0, Math.min(1, volume));
      await TrackPlayer.setVolume(clampedVolume);
      console.log('✅ AudioPlaybackService: TrackPlayer volume set to:', clampedVolume);
    }

    async switchBackground(localPath: string | number) {
      console.log('🔄 AudioPlaybackService.switchBackground called with:', localPath);
      await this.backgroundPlayer.switchBackground(localPath);
      console.log('✅ AudioPlaybackService.switchBackground completed');
    }
    
    private async savePlaybackState() {
      try {
        const state = await this.getAffirmationsState();
        const playbackState = {
          trackIndex: state.trackIndex,
          positionMs: Math.floor(state.position * 1000),
          timestamp: Date.now(),
          wasPlaying: state.state === State.Playing,
        };
        
        await AsyncStorage.setItem(
          'lastPlaybackState',
          JSON.stringify(playbackState)
        );
      } catch (error) {
        console.error('Failed to save playback state:', error);
      }
    }
    
    async cleanup() {
      if (this.appStateSubscription) {
        this.appStateSubscription.remove();
      }
      
      await TrackPlayer.reset();
      await this.backgroundPlayer.cleanup();
    }
  }
  
  // Helper function to build silence asset URL
  export function getSilenceAssetPath(delayMs: number): string {
    // Round to nearest step
    const rounded = DELAY_STEPS.reduce((prev, curr) =>
      Math.abs(curr - delayMs) < Math.abs(prev - delayMs) ? curr : prev
    );
    
    // In production, these would be bundled with the app
    return `asset:/silence/silence_${rounded}ms.mp3`;
  }