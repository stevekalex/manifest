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
import { useAudioStore } from '../store/audioStore';

  import { BackGroundAndPreviewPlayer } from './backgroundAndPreviewPlayer';
  import { PausedState, DELAY_STEPS } from '../types/audio';
  import { AppState, AppStateStatus } from 'react-native';
  import AsyncStorage from '@react-native-async-storage/async-storage';
  
  export class AudioPlaybackService {
    private backgroundPlayer: BackGroundAndPreviewPlayer;
    private affirmationsReady = false;
    private appStateSubscription?: any;
    public onTrackChanged?: (trackIndex: number) => void;
    
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
      
      // Notify coordinator when track changes
      TrackPlayer.addEventListener(TrackPlayerEvent.PlaybackTrackChanged, (event) => {
        if (event.nextTrack !== null && this.onTrackChanged) {
          this.onTrackChanged(event.nextTrack);
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
    
    async playBackground(localPath: string) {
      await this.backgroundPlayer.playBackground(localPath);
    }
    
    async setupAffirmationsQueue(tracks: Track[]) {
      await this.initialize();
      await TrackPlayer.reset();
      await TrackPlayer.add(tracks);
      await TrackPlayer.setRepeatMode(RepeatMode.Queue);
    }
    
    async playAffirmations() {
      await TrackPlayer.play();
      const setPlaying = (useAudioStore as any).getState?.().setIsPlaying;
      if (typeof setPlaying === 'function') setPlaying(true);
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
        const setPlaying = (useAudioStore as any).getState?.().setIsPlaying;
        if (typeof setPlaying === 'function') setPlaying(false);

        return {
          trackIndex,
          positionMs: Math.floor(position * 1000),
          timestamp: Date.now(),
        };
      } catch {
        // Fallback to safe defaults
        await TrackPlayer.pause().catch(() => {});
        const setPlaying = (useAudioStore as any).getState?.().setIsPlaying;
        if (typeof setPlaying === 'function') setPlaying(false);
        return { trackIndex: 0, positionMs: 0, timestamp: Date.now() };
      }
    }
    
    async resumeAffirmations(pausedState?: PausedState) {
      if (pausedState) {
        // Seek to exact position
        await TrackPlayer.seekTo(pausedState.positionMs / 1000);
      }
      await TrackPlayer.play();
      const setPlaying = (useAudioStore as any).getState?.().setIsPlaying;
      if (typeof setPlaying === 'function') setPlaying(true);
    }
    
    async skipToNextTrack() {
      await TrackPlayer.skipToNext();
      await TrackPlayer.play();
      const setPlaying = (useAudioStore as any).getState?.().setIsPlaying;
      if (typeof setPlaying === 'function') setPlaying(true);
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