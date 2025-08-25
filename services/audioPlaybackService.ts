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

  import { BackgroundPlayer } from './backgroundPlayer';
  import { PausedState, DELAY_STEPS, PlaybackSnapshot, AffirmationId } from '../types/audio';
  import { AppState, AppStateStatus } from 'react-native';
  import AsyncStorage from '@react-native-async-storage/async-storage';
  import { useAudioStore } from '../store/audioStore';
  import { URLResolver } from './urlResolver';
  
  // Phase 4: Enhanced queue management configuration
  interface QueueConfig {
    readonly initialWindowSize: number;    // Tracks to load initially
    readonly preloadThreshold: number;     // When to expand window (tracks remaining)
    readonly expansionSize: number;        // How many tracks to add when expanding
    readonly maxWindowSize: number;        // Maximum tracks in memory
    readonly enableDynamicLoading: boolean; // Feature flag for gradual rollout
  }
  
  const DEFAULT_QUEUE_CONFIG: QueueConfig = {
    initialWindowSize: 3,      // Load first 3 tracks initially
    preloadThreshold: 1,       // Expand when 1 track remaining
    expansionSize: 7,          // Add 7 more tracks when expanding
    maxWindowSize: 50,         // Allow large playlists
    enableDynamicLoading: true, // Enable dynamic loading
  };
  
  // Legacy constant for backward compatibility
  const QUEUE_WINDOW_SIZE = DEFAULT_QUEUE_CONFIG.initialWindowSize;
  
  // Event debouncing service
  class EventDebouncer {
    private lastTrackChangeTime = 0;
    private lastTrackIndex = -1;
    private readonly DEBOUNCE_MS = 50; // Reduced for better responsiveness

    shouldProcessTrackChange(trackIndex: number): boolean {
      const now = Date.now();
      
      // If track index actually changed, always process (no time debounce)
      if (trackIndex !== this.lastTrackIndex) {
        this.lastTrackIndex = trackIndex;
        this.lastTrackChangeTime = now;
        return true;
      }
      
      // Same track index - apply time-based debounce for duplicates
      if (now - this.lastTrackChangeTime < this.DEBOUNCE_MS) {
        return false; // Ignore rapid duplicate events for same track
      }
      
      this.lastTrackChangeTime = now;
      return true;
    }
  }

  export class AudioPlaybackService {
    private backgroundPlayer: BackgroundPlayer;
    private affirmationsReady = false;
    private appStateSubscription?: any;
    private debouncer = new EventDebouncer();
    private lastSnapshot?: PlaybackSnapshot;
    private urlResolver?: URLResolver;
    public onTrackAdvanced?: (trackIndex: number) => void;
    
    // Phase 1A: Event suppression function
    public shouldSuppressEvents?: () => boolean;
    
    // Phase 1B: Refined suppression for QueueEnded events
    public shouldSuppressQueueEnded?: () => boolean;
    
    // Phase 4: Queue management configuration
    private queueConfig: QueueConfig;
    private allTracks: Track[] = []; // Full track list for windowing
    private currentWindowStart = 0;  // Track index of current window start
    
    
    // Check if there's a snapshot available for restoration
    hasSnapshotForRestore(): boolean {
      return !!this.lastSnapshot;
    }
    
    constructor(queueConfig?: Partial<QueueConfig>, urlResolver?: URLResolver) {
      this.backgroundPlayer = new BackgroundPlayer();
      this.queueConfig = { ...DEFAULT_QUEUE_CONFIG, ...queueConfig };
      this.urlResolver = urlResolver;
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
      
      // Phase 1B: Enhanced event suppression for multiple RNTP events
      
      // Track change events (most important for coordination)
      TrackPlayer.addEventListener(TrackPlayerEvent.PlaybackTrackChanged, (event) => {
        console.log('🎵 [EVENT] PlaybackTrackChanged fired:', {
          nextTrack: event.nextTrack,
          prevTrack: event.track,
          suppressEvents: this.shouldSuppressEvents?.()
        });
        
        if (this.shouldSuppressEvents?.()) {
          console.log('🚫 [EVENT] Suppressing RNTP PlaybackTrackChanged event');
          return;
        }
        
        if (event.nextTrack !== null && this.debouncer.shouldProcessTrackChange(event.nextTrack) && this.onTrackAdvanced) {
          console.log(`🎵 [EVENT] Track advanced to index: ${event.nextTrack} - calling onTrackAdvanced`);
          // Log current delay value for debugging
          const store = useAudioStore.getState();
          console.log(`⏰ [TRACK-ADVANCE] Current globalDelayMs: ${store.globalDelayMs}ms`);
          this.onTrackAdvanced(event.nextTrack);
          
          // Phase 4: Queue expansion is now handled by the coordinator during waitingForNext state
          // This prevents interrupting playback with queue operations
        } else {
          console.log('🎵 [EVENT] Track change ignored:', {
            nextTrack: event.nextTrack,
            shouldProcess: event.nextTrack !== null ? this.debouncer.shouldProcessTrackChange(event.nextTrack) : false,
            hasCallback: !!this.onTrackAdvanced
          });
        }
      });
      
      // Playback state events (suppress to prevent UI flickering during operations)
      TrackPlayer.addEventListener(TrackPlayerEvent.PlaybackState, (event) => {
        console.log('🎵 [EVENT] PlaybackState changed:', {
          state: event.state,
          suppressEvents: this.shouldSuppressEvents?.()
        });
        
        if (this.shouldSuppressEvents?.()) {
          console.log('🚫 [EVENT] Suppressing RNTP PlaybackState event');
          return;
        }
        // Allow state changes through when not suppressed
        console.log('🎵 [EVENT] RNTP Playback state allowed through:', event.state);
      });
      
      // Queue end events (refined suppression for preview operations)
      TrackPlayer.addEventListener(TrackPlayerEvent.PlaybackQueueEnded, (event) => {
        // Use refined suppression: allow during preview (for natural end), suppress during structural ops
        if (this.shouldSuppressQueueEnded?.()) {
          console.log('🚫 Suppressing RNTP PlaybackQueueEnded event - structural op active');
          return;
        }
        console.log('🎵 RNTP Queue ended - main playback');
      });
      
      // Progress events are generally OK but can be noisy during operations
      TrackPlayer.addEventListener(TrackPlayerEvent.PlaybackProgressUpdated, (event) => {
        if (this.shouldSuppressEvents?.()) {
          // Don't log these as they're very frequent
          return;
        }
        // Progress events pass through - needed for UI updates
      });
      
      // Always allow error events - these are critical for debugging
      TrackPlayer.addEventListener(TrackPlayerEvent.PlaybackError, (event) => {
        console.error('❌ RNTP Playback error:', event);
        // Never suppress errors
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
      console.log('🎵 [QUEUE] Setting up affirmations queue with', tracks.length, 'tracks');
      console.log('🎵 [QUEUE] Track details:', tracks.map(t => ({ id: t.id, title: t.title })));
      
      await this.initialize();
      
      // CRITICAL: Stop playback before reset to ensure queue is properly cleared
      try {
        const state = await TrackPlayer.getPlaybackState();
        if (state.state === State.Playing || state.state === State.Paused) {
          console.log('🛑 [QUEUE] Stopping playback before reset');
          await TrackPlayer.stop();
        }
      } catch (error) {
        console.warn('⚠️ [QUEUE] Error checking playback state:', error);
      }
      
      await TrackPlayer.reset();
      console.log('🎵 [QUEUE] RNTP reset completed');
      
      await TrackPlayer.add(tracks);
      console.log('🎵 [QUEUE] Added', tracks.length, 'tracks to RNTP queue');
      
      await TrackPlayer.setRepeatMode(RepeatMode.Queue);
      console.log('🎵 [QUEUE] Set repeat mode to Queue');
      
      // Verify queue was set up correctly
      const queue = await TrackPlayer.getQueue();
      console.log('🎵 [QUEUE] Final queue verification:', queue.length, 'tracks in queue');
    }
    
    // Phase 4: Enhanced windowed queue setup
    async setupAffirmationsQueueWindowed(tracks: Track[]) {
      console.log('🎵 [QUEUE-WINDOWED] Setting up windowed queue with', tracks.length, 'total tracks');
      console.log('🎵 [QUEUE-WINDOWED] Window config:', this.queueConfig);
      
      // Store all tracks for windowing
      this.allTracks = tracks;
      this.currentWindowStart = 0;
      
      // Use existing method if dynamic loading is disabled or tracks <= window size
      if (!this.queueConfig.enableDynamicLoading || tracks.length <= this.queueConfig.initialWindowSize) {
        console.log('🎵 [QUEUE-WINDOWED] Using legacy full-queue method');
        return this.setupAffirmationsQueue(tracks);
      }
      
      // Load initial window
      const initialWindow = tracks.slice(0, this.queueConfig.initialWindowSize);
      console.log('🎵 [QUEUE-WINDOWED] Loading initial window:', initialWindow.length, 'tracks');
      
      await this.initialize();
      
      // CRITICAL: Stop playback before reset to ensure queue is properly cleared
      try {
        const state = await TrackPlayer.getPlaybackState();
        if (state.state === State.Playing || state.state === State.Paused) {
          console.log('🛑 [QUEUE-WINDOWED] Stopping playback before reset');
          await TrackPlayer.stop();
        }
      } catch (error) {
        console.warn('⚠️ [QUEUE-WINDOWED] Error checking playback state:', error);
      }
      
      await TrackPlayer.reset();
      console.log('🎵 [QUEUE-WINDOWED] RNTP reset completed');
      
      await TrackPlayer.add(initialWindow);
      console.log('🎵 [QUEUE-WINDOWED] Added initial window to RNTP queue');
      
      await TrackPlayer.setRepeatMode(RepeatMode.Queue);
      console.log('🎵 [QUEUE-WINDOWED] Set repeat mode to Queue');
      
      // Verify initial window was set up correctly
      const queue = await TrackPlayer.getQueue();
      console.log('🎵 [QUEUE-WINDOWED] Initial window verification:', queue.length, 'tracks in queue');
    }
    
    // Phase 4: Check if queue needs expansion and expand if needed
    async checkAndExpandQueue(): Promise<boolean> {
      if (!this.queueConfig.enableDynamicLoading || this.allTracks.length === 0) {
        return false; // Dynamic loading disabled or no tracks stored
      }
      
      try {
        const [queue, currentTrackIndex] = await Promise.all([
          TrackPlayer.getQueue(),
          TrackPlayer.getCurrentTrack()
        ]);
        
        if (currentTrackIndex === null || currentTrackIndex === undefined) {
          return false; // No current track
        }
        
        const tracksRemaining = queue.length - (currentTrackIndex + 1);
        console.log('🔍 [QUEUE-CHECK] Current position:', currentTrackIndex + 1, '/', queue.length, 'tracks remaining:', tracksRemaining);
        
        // Check if expansion is needed
        if (tracksRemaining <= this.queueConfig.preloadThreshold && queue.length < this.queueConfig.maxWindowSize) {
          const nextWindowStart = this.currentWindowStart + queue.length;
          const availableTracksRemaining = this.allTracks.length - nextWindowStart;
          
          if (availableTracksRemaining > 0) {
            console.log('🚀 [QUEUE-EXPAND] Expanding queue - tracks remaining in window:', tracksRemaining);
            return await this.expandQueue();
          }
        }
        
        return false;
      } catch (error) {
        console.error('❌ [QUEUE-CHECK] Error checking queue expansion:', error);
        return false;
      }
    }
    
    // Phase 4: Expand the queue window with next batch of tracks
    private async expandQueue(): Promise<boolean> {
      try {
        const queue = await TrackPlayer.getQueue();
        const nextWindowStart = this.currentWindowStart + queue.length;
        const tracksToAdd = Math.min(
          this.queueConfig.expansionSize,
          this.allTracks.length - nextWindowStart,
          this.queueConfig.maxWindowSize - queue.length
        );
        
        if (tracksToAdd <= 0) {
          console.log('🎵 [QUEUE-EXPAND] No tracks to add');
          return false;
        }
        
        const newTracks = this.allTracks.slice(nextWindowStart, nextWindowStart + tracksToAdd);
        console.log('🎵 [QUEUE-EXPAND] Adding', newTracks.length, 'tracks to queue');
        console.log('🎵 [QUEUE-EXPAND] Track IDs:', newTracks.map(t => t.id));
        
        await TrackPlayer.add(newTracks);
        
        // Verify expansion
        const updatedQueue = await TrackPlayer.getQueue();
        console.log('✅ [QUEUE-EXPAND] Queue expanded successfully. New size:', updatedQueue.length);
        
        return true;
      } catch (error) {
        console.error('❌ [QUEUE-EXPAND] Error expanding queue:', error);
        return false;
      }
    }
    
    async playAffirmations() {
      console.log('▶️ [PLAY] Starting affirmation playback');
      const beforeState = await TrackPlayer.getPlaybackState();
      console.log('▶️ [PLAY] RNTP state before play:', beforeState.state);
      
      await TrackPlayer.play();
      
      const afterState = await TrackPlayer.getPlaybackState();
      console.log('▶️ [PLAY] RNTP state after play:', afterState.state);
      
      const currentTrack = await TrackPlayer.getActiveTrack();
      console.log('▶️ [PLAY] Current active track:', currentTrack?.id, '-', currentTrack?.title);
      
      // Note: Don't set store.isPlaying here - let state machine handle it
    }
    
    async pauseAffirmations(): Promise<PausedState> {
      console.log('⏸️ [PAUSE] Pausing affirmations');
      // If RNTP hasn't been initialized yet, skip pausing safely to avoid startup race
      if (!this.affirmationsReady) {
        console.log('⏸️ [PAUSE] Skipping pause - RNTP not initialized yet');
        return { trackIndex: 0, positionMs: 0, timestamp: Date.now() };
      }
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

        console.log('⏸️ [PAUSE] Current state before pause:', {
          position,
          trackIndex,
          progressRes: progressRes.status,
          indexRes: indexRes.status
        });

        await TrackPlayer.pause();
        console.log('⏸️ [PAUSE] TrackPlayer.pause() completed');
        
        // Note: Don't set store.isPlaying here - let state machine handle it

        const pausedState = {
          trackIndex,
          positionMs: Math.floor(position * 1000),
          timestamp: Date.now(),
        };
        
        console.log('⏸️ [PAUSE] Returning paused state:', pausedState);
        return pausedState;
      } catch (error) {
        console.error('❌ [PAUSE] Error pausing affirmations:', error);
        // If not initialized, avoid calling RNTP APIs and return safe default
        if (!this.affirmationsReady) {
          return { trackIndex: 0, positionMs: 0, timestamp: Date.now() };
        }
        // Fallback to safe defaults
        await TrackPlayer.pause().catch(() => {});
        // Note: Don't set store.isPlaying here - let state machine handle it
        const fallbackState = { trackIndex: 0, positionMs: 0, timestamp: Date.now() };
        console.log('⏸️ [PAUSE] Using fallback state:', fallbackState);
        return fallbackState;
      }
    }
    
    async resumeAffirmations(pausedState?: PausedState) {
      console.log('▶️ [RESUME] Resuming affirmations', pausedState ? 'with paused state' : 'without paused state');
      
      try {
        // If not initialized yet, initialize now to avoid resume errors
        if (!this.affirmationsReady) {
          await this.initialize();
        }
        if (pausedState) {
          const currentProgress = await TrackPlayer.getProgress();
          const currentTrack = await TrackPlayer.getCurrentTrack();
          
          // Only seek if we're on wrong track or position is significantly different (>100ms)
          const positionDiff = Math.abs(currentProgress.position - pausedState.positionMs / 1000);
          const needsSeek = currentTrack !== pausedState.trackIndex || positionDiff > 0.1;
          
          if (needsSeek) {
            console.log('▶️ [RESUME] Seeking to position:', pausedState.positionMs / 1000, 'seconds, track:', pausedState.trackIndex);
            await TrackPlayer.seekTo(pausedState.positionMs / 1000);
          } else {
            console.log('▶️ [RESUME] Position correct, skipping seek for seamless resume');
          }
        }
        
        const beforeState = await TrackPlayer.getPlaybackState();
        console.log('▶️ [RESUME] RNTP state before resume:', beforeState.state);
        
        await TrackPlayer.play();
        
        const afterState = await TrackPlayer.getPlaybackState();
        console.log('▶️ [RESUME] RNTP state after resume:', afterState.state);
        
        const currentTrack = await TrackPlayer.getActiveTrack();
        console.log('▶️ [RESUME] Current active track after resume:', currentTrack?.id, '-', currentTrack?.title);
        
      } catch (error) {
        console.error('❌ [RESUME] Error during resume:', error);
        // Fallback: simple play without seek
        try {
          await TrackPlayer.play();
        } catch (fallbackError) {
          console.error('❌ [RESUME] Fallback play also failed:', fallbackError);
        }
      }
      
      // Note: Don't set store.isPlaying here - let state machine handle it
    }
    
    async skipToNextTrack() {
      console.log('⏭️ [SKIP] Skipping to next track');
      await TrackPlayer.skipToNext();
      
      const currentTrack = await TrackPlayer.getActiveTrack();
      console.log('⏭️ [SKIP] New current track:', currentTrack?.id, '-', currentTrack?.title);
      
      await TrackPlayer.play();
      console.log('⏭️ [SKIP] Playback started after skip');
      // Note: Don't set store.isPlaying here - let state machine handle it
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
    
    // Phase 3.3: Add tracks to existing queue
    async addTracksToQueue(tracks: Track[]): Promise<void> {
      await TrackPlayer.add(tracks);
      
      // Verify addition
      const queueAfter = await TrackPlayer.getQueue();
      console.log(`✅ Added ${tracks.length} tracks to queue, total: ${queueAfter.length}`);
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
    
    // Phase 1B: Capture full playback snapshot for voice switching
    async captureSnapshot(): Promise<PlaybackSnapshot> {
      console.log('📸 Capturing playback snapshot...');
      
      try {
        // Get current queue and playback state
        const [queue, currentTrack, progress, playbackState] = await Promise.all([
          TrackPlayer.getQueue(),
          TrackPlayer.getCurrentTrack(),
          TrackPlayer.getProgress(),
          TrackPlayer.getPlaybackState()
        ]);
        
        // Extract affirmation IDs from queue
        const affirmationIds = queue.map(track => track.id as AffirmationId);
        
        // Calculate head hash from first 3 tracks
        const headSize = Math.min(3, queue.length);
        const headTracks = queue.slice(0, headSize);
        const headHash = this.calculateHeadHash(headTracks);
        
        // Get current voice and playlist from store
        const store = useAudioStore.getState();
        
        const snapshot: PlaybackSnapshot = {
          affirmationIds,
          currentIndex: currentTrack || 0,
          positionMs: Math.floor(progress.position * 1000),
          wasPlaying: playbackState.state === State.Playing,
          headHash,
          timestamp: Date.now(),
          voiceId: store.currentVoiceId,
          playlistId: store.playlist?.id || ''
        };
        
        console.log('📸 Snapshot captured:', {
          trackCount: affirmationIds.length,
          currentIndex: snapshot.currentIndex,
          positionMs: snapshot.positionMs,
          headHash: snapshot.headHash
        });
        
        return snapshot;
      } catch (error) {
        console.error('❌ Failed to capture snapshot:', error);
        // Return a minimal valid snapshot
        return {
          affirmationIds: [],
          currentIndex: 0,
          positionMs: 0,
          wasPlaying: false,
          headHash: '',
          timestamp: Date.now(),
          voiceId: '',
          playlistId: ''
        };
      }
    }
    
    // Helper to calculate head hash for fast-path detection
    private calculateHeadHash(tracks: Track[]): string {
      if (tracks.length === 0) return '';
      
      // Create a simple hash from track IDs and URLs
      const hashInput = tracks.map(t => `${t.id}:${t.url}`).join('|');
      
      // Simple hash function (not cryptographic, just for comparison)
      let hash = 0;
      for (let i = 0; i < hashInput.length; i++) {
        const char = hashInput.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      
      return hash.toString(36);
    }
    
    // Phase 1B: Restore playback from snapshot
    async restoreFromSnapshot(
      snapshot: PlaybackSnapshot,
      newTracks?: Track[]
    ): Promise<boolean> {
      console.log('🔄 Restoring from snapshot...', {
        currentIndex: snapshot.currentIndex,
        positionMs: snapshot.positionMs,
        wasPlaying: snapshot.wasPlaying,
        headHash: snapshot.headHash
      });
      
      try {
        // Get current queue to check for fast path
        const currentQueue = await TrackPlayer.getQueue();
        const currentHeadHash = this.calculateHeadHash(currentQueue.slice(0, 3));
        
        // Fast path: If head hash matches, just seek to position
        if (currentHeadHash === snapshot.headHash && !newTracks) {
          console.log('⚡ Fast path: Head hash matches, seeking to position');
          
          // Seek to the saved position
          await TrackPlayer.skip(snapshot.currentIndex);
          await TrackPlayer.seekTo(snapshot.positionMs / 1000);
          
          // Resume if was playing
          if (snapshot.wasPlaying) {
            await TrackPlayer.play();
          }
          
          console.log('✅ Fast path restore completed');
          return true;
        }
        
        // Rebuild path: Queue has changed, need full reconstruction
        console.log('🔨 Rebuild path: Reconstructing queue');
        
        // If new tracks provided, use them; otherwise try to rebuild from snapshot
        const tracksToLoad = newTracks || await this.reconstructTracksFromSnapshot(snapshot);
        
        if (!tracksToLoad || tracksToLoad.length === 0) {
          console.error('❌ No tracks to restore');
          return false;
        }
        
        // Reset and rebuild queue
        await TrackPlayer.reset();
        await TrackPlayer.add(tracksToLoad);
        await TrackPlayer.setRepeatMode(RepeatMode.Queue);
        
        // Skip to the correct track
        if (snapshot.currentIndex > 0 && snapshot.currentIndex < tracksToLoad.length) {
          await TrackPlayer.skip(snapshot.currentIndex);
        }
        
        // Seek to position
        await TrackPlayer.seekTo(snapshot.positionMs / 1000);
        
        // Resume if was playing
        if (snapshot.wasPlaying) {
          await TrackPlayer.play();
        }
        
        console.log('✅ Rebuild path restore completed');
        return true;
        
      } catch (error) {
        console.error('❌ Failed to restore from snapshot:', error);
        return false;
      }
    }
    
    // Helper to reconstruct tracks from snapshot affirmation IDs
    private async reconstructTracksFromSnapshot(
      snapshot: PlaybackSnapshot
    ): Promise<Track[]> {
      const store = useAudioStore.getState();
      const playlist = store.playlist;
      
      if (!playlist) {
        console.error('No playlist available for reconstruction');
        return [];
      }
      
      if (!this.urlResolver) {
        console.error('❌ [PLAYBACK-SERVICE] URLResolver not available for reconstruction');
        return [];
      }
      
      // Map affirmation IDs back to tracks
      const tracks: Track[] = [];
      
      for (const affirmationId of snapshot.affirmationIds) {
        const affirmation = playlist.affirmations.find(a => a.id === affirmationId);
        if (!affirmation) continue;
        
        try {
          // Always use URLResolver for URL resolution
          const urlOrPromise = this.urlResolver.resolve(playlist, affirmationId, store.currentVoiceId);
          const url = await Promise.resolve(urlOrPromise);
          
          tracks.push({
            id: affirmationId,
            url: url,
            title: affirmation.text || `Affirmation ${tracks.length + 1}`,
            artist: 'Manifestation App'
          });
          
        } catch (error) {
          console.error(`❌ Failed to resolve URL for ${affirmationId}:`, error);
          // Continue processing other tracks
        }
      }
      
      return tracks;
    }
    
    // Restore functionality disabled - will be removed in Phase 9
    async restoreLastSnapshot() {
      console.log('🔄 [SNAPSHOT] restoreLastSnapshot disabled');
    }
    
    async cleanup() {
      if (this.appStateSubscription) {
        this.appStateSubscription.remove();
      }
      
      // Phase 1B: Enhanced RNTP reset hygiene during cleanup
      try {
        await TrackPlayer.stop();
        await TrackPlayer.reset();
        console.log('✅ RNTP reset completed during cleanup');
      } catch (error) {
        console.warn('⚠️ RNTP reset failed during cleanup:', error);
      }
      
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