import { createActor, fromPromise } from 'xstate';
import type { ActorRefFrom } from 'xstate';
import { AppState, AppStateStatus } from 'react-native';
import { audioMachine } from './audioMachine';
import { AudioPlaybackService } from './audioPlaybackService';
import { URLResolver } from './urlResolver';
import { BundledAssets } from './bundledAssets';
import { getDelayTimerManager } from './delayTimerManager';
import { useAudioStore } from '../store/audioStore';
import type { Playlist, VoiceId, PausedState, PlaybackSnapshot } from '../types/audio';
import TrackPlayer, { Track, State } from 'react-native-track-player';
import { CDNFactory } from './cdn/CDNFactory';
import type { CanonicalTrackId } from './cdn/types';

// Constants
const INITIAL_TRACK_COUNT = 3; // Phase 1B: Reduced from 5 to 3 for better performance
const DEFAULT_ARTIST_NAME = 'Manifestation App';

// Phase 3: CDN Prefetching Configuration - TESTING VALUES
const PREFETCH_TRACK_COUNT = 3; // Reduced for testing (was 12)
const PREFETCH_START_INDEX = INITIAL_TRACK_COUNT; // Start prefetching after initial tracks

// Phase 3.2: Queue Expansion Prefetching Configuration - TESTING VALUES  
const EXPANSION_PREFETCH_COUNT = 3; // Reduced for testing (was 8)

// Timing constants
const PREFETCH_DELAY_MS = 2000;
const EXPANSION_DELAY_MS = 1500;
const INSTANCE_ID_LENGTH = 7;

// Phase 4: Critical states where event suppression is required
const CRITICAL_STATES = [
  'preparing',
  'voiceSwitching', 
  'pausingForModal',
  'voiceSelecting.restoring'
] as const;

export class AudioCoordinator {
  private actor: ActorRefFrom<typeof audioMachine>;
  private audioSystem: AudioPlaybackService;
  private urlResolver: URLResolver;
  private bundledAssets: BundledAssets;
  private appStateSubscription: any;
  private instanceId: string;
  private cdnFactory?: CDNFactory;
  // Session token to cancel/guard async tasks started for a specific playlist
  private activeSessionId: string | null = null;
  
  constructor(cdnFactory?: CDNFactory) {
    this.instanceId = Math.random().toString(36).substring(2, 2 + INSTANCE_ID_LENGTH);
    
    this.cdnFactory = cdnFactory;
    
    // Initialize dependencies with optional CDN support
    this.bundledAssets = new BundledAssets();
    this.urlResolver = this.createURLResolver();
    this.audioSystem = new AudioPlaybackService(undefined, this.urlResolver);

    // Wire track advancement events
    this.audioSystem.onTrackAdvanced = (trackIndex: number) => {
      this.actor.send({ type: 'TRACK_ADVANCED', trackIndex });
      
      // Phase 4: Check queue expansion during safe states only
      const currentState = this.actor.getSnapshot();
      if (currentState.matches('playing.waitingForNext') || currentState.matches('paused')) {
        // Safe to expand queue during delay or when paused
        this.handleQueueExpansion();
      }
    };

    // Phase 4: Enhanced event suppression during critical transitions
    this.audioSystem.shouldSuppressEvents = this.shouldSuppressEvents;

    const machineServices = this.getMachineServices();
    
    const provided = audioMachine.provide({
      actors: {
        bootstrapPlaylist: fromPromise(({ input }) => machineServices.bootstrapPlaylist(input)),
        voiceSwitchTransaction: fromPromise(({ input }) => machineServices.voiceSwitchTransaction(input)),
        pauseAndSnapshot: fromPromise(() => machineServices.pauseAndSnapshot()),
        createDelay: fromPromise(({ input }: { input: { delayMs: number } }) => {
          console.log('⏱️ [DELAY-TIMER] Starting delay timer for', input.delayMs, 'ms');
          
          // Phase 4: Use managed delay timer with app state handling
          return new Promise<void>((resolve) => {
            const timerManager = getDelayTimerManager();
            const timer = timerManager.createManagedTimer(input.delayMs, () => {
              console.log('⏱️ [DELAY-TIMER] Timer completed via managed timer');
              resolve();
            }, {
              enableDriftCompensation: true,
              onCancel: (elapsed) => {
                console.log('⏱️ [DELAY-TIMER-CANCEL] Timer cancelled after', elapsed, 'ms (expected:', input.delayMs, 'ms)');
              }
            });
            
            timer.start();
            
            // Return cleanup function for XState
            return () => {
              timer.cancel();
              timer.cleanup();
            };
          });
        }),
      },
      actions: this.getMachineActions(),
    });

    this.actor = createActor(provided);
    this.setupStoreSync();
    this.setupAppStateHandling();
    this.actor.start();
  }

  private setupStoreSync() {
    this.actor.subscribe((snapshot: any) => {
      console.log('🏃 [STATE] State machine transition:', {
        state: snapshot.value,
        modalOpen: snapshot.context.modalOpen,
        currentTrackIndex: snapshot.context.currentTrackIndex,
        currentVoiceId: snapshot.context.currentVoiceId,
        globalDelayMs: snapshot.context.globalDelayMs,
        isPlaying: snapshot.matches('playing') || snapshot.matches('voiceSelecting'),
        // TODO - this is fine for now, but once we do voice previews this might need to change
        isPreviewMode: snapshot.matches('voiceSelecting.previewing'),
        isVoiceSwitching: snapshot.matches('voiceSwitching'),
        isRestoring: snapshot.matches('voiceSelecting.restoring')
      });
      
      const store = useAudioStore.getState();
      store.setModalOpen(!!snapshot.context.modalOpen);
      store.setPausedState(snapshot.context.pausedState);
      store.setVoiceId(snapshot.context.currentVoiceId);
      store.setIsPlaying(snapshot.matches('playing') || snapshot.matches('voiceSelecting'));
      store.setCurrentTrackIndex(snapshot.context.currentTrackIndex || 0);
      store.setGlobalDelay(snapshot.context.globalDelayMs ?? 3000);
      
      // Keep the store's playlist in sync with the state machine context
      // Use setState directly to allow clearing the playlist (undefined) on STOP_PLAYBACK
      useAudioStore.setState({ playlist: snapshot.context.playlist });
      
    });
  }

  private setupAppStateHandling() {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );
  }

  private handleAppStateChange(nextAppState: AppStateStatus) {
    if (nextAppState === 'active') {
      if (this.actor.getSnapshot().matches('interrupted')) {
        this.actor.send({ type: 'RESUME_FROM_INTERRUPTION' });
      }
    }
  }


  // Public API
  async selectPlaylist(playlist: Playlist) {
    console.log(`🎮 AudioCoordinator[${this.instanceId}].selectPlaylist called for:`, playlist.name);
    this.actor.send({ type: 'SELECT_PLAYLIST', playlist });
    console.log(`✅ AudioCoordinator[${this.instanceId}].selectPlaylist completed`);
  }

  async startPlayback(playlist: Playlist, voiceId: VoiceId) {
    console.log(`🎮 AudioCoordinator[${this.instanceId}].startPlayback called for:`, playlist.name, 'with voice:', voiceId);
    this.actor.send({ type: 'START_PLAYBACK', playlist, voiceId });
    console.log(`✅ AudioCoordinator[${this.instanceId}].startPlayback completed`);
  }

  openVoiceModal() {
    console.log(`🔓 AudioCoordinator[${this.instanceId}].openVoiceModal - sending OPEN_VOICE_MODAL event`);
    this.actor.send({ type: 'OPEN_VOICE_MODAL' });
    console.log(`✅ AudioCoordinator[${this.instanceId}].openVoiceModal completed`);
  }

  async closeVoiceModal() {
    console.log(`🔒 AudioCoordinator[${this.instanceId}].closeVoiceModal - sending CANCEL_VOICE_MODAL event`);
    this.actor.send({ type: 'CANCEL_VOICE_MODAL' });
    console.log(`✅ AudioCoordinator[${this.instanceId}].closeVoiceModal completed`);
  }

  async confirmVoiceSelection(voiceId: VoiceId) {
    console.log(`✅ AudioCoordinator[${this.instanceId}].confirmVoiceSelection called with:`, voiceId);
    this.actor.send({ type: 'CONFIRM_VOICE', voiceId });
    console.log(`✅ AudioCoordinator[${this.instanceId}].confirmVoiceSelection completed`);
  }

  updateDelay(delayMs: number) {
    console.log('⏰ [DELAY] updateDelay called with:', delayMs, 'ms');
    const currentState = this.actor.getSnapshot();
    console.log('⏰ [DELAY] Current state when updating delay:', {
      state: currentState.value,
      currentDelayMs: currentState.context.globalDelayMs,
      isWaitingForNext: currentState.matches('playing.waitingForNext')
    });
    console.log('⏰ [DELAY] Sending UPDATE_DELAY event to state machine');
    this.actor.send({ type: 'UPDATE_DELAY', delayMs });
  }

  skipDelay() {
    console.log(`⏭️ AudioCoordinator[${this.instanceId}].skipDelay called`);
    this.actor.send({ type: 'SKIP_DELAY' });
    console.log(`✅ AudioCoordinator[${this.instanceId}].skipDelay completed`);
  }

  pause() {
    console.log(`⏸️ AudioCoordinator[${this.instanceId}].pause called`);
    this.actor.send({ type: 'PAUSE_PLAYBACK' });
    console.log(`✅ AudioCoordinator[${this.instanceId}].pause completed`);
  }

  resume() {
    console.log(`▶️ AudioCoordinator[${this.instanceId}].resume called`);
    this.actor.send({ type: 'RESUME_PLAYBACK' });
    console.log(`✅ AudioCoordinator[${this.instanceId}].resume completed`);
  }

  stop() {
    console.log(`⏹️ AudioCoordinator[${this.instanceId}].stop called`);
    this.actor.send({ type: 'STOP_PLAYBACK' });
    console.log(`✅ AudioCoordinator[${this.instanceId}].stop completed`);
  }

  async switchPlaylist(newPlaylist: Playlist, voiceId: VoiceId): Promise<void> {
    console.log(`🔄 AudioCoordinator[${this.instanceId}].switchPlaylist called: ${newPlaylist.name} (${voiceId})`);
    
    return new Promise<void>((resolve) => {
      const subscription = this.actor.subscribe((state) => {
        // Wait for idle state after STOP_PLAYBACK
        if (state.value === 'idle' && state.context.playlist === undefined) {
          subscription.unsubscribe();
          
          console.log(`🔄 AudioCoordinator[${this.instanceId}].switchPlaylist: Reached idle state, starting new playlist`);
          
          // Start new playlist
          this.actor.send({ type: 'START_PLAYBACK', playlist: newPlaylist, voiceId });
          resolve();
        }
      });
      
      // Trigger the switch by stopping current playback
      console.log(`🔄 AudioCoordinator[${this.instanceId}].switchPlaylist: Stopping current playlist`);
      // Invalidate async tasks immediately so any queued work from the old session is dropped
      this.activeSessionId = null;
      this.actor.send({ type: 'STOP_PLAYBACK' });
    });
  }

  handlePhoneCallInterruption() {
    this.actor.send({ type: 'PAUSE_FOR_INTERRUPTION' });
  }

  handlePhoneCallEnd() {
    this.actor.send({ type: 'RESUME_FROM_INTERRUPTION' });
  }

  getCurrentState() {
    return this.actor.getSnapshot();
  }

  async setBackgroundVolume(volume: number) {
    console.log(`🎵 AudioCoordinator[${this.instanceId}].setBackgroundVolume called with:`, volume);
    await this.updateVolume('background', volume, 
      () => this.audioSystem.setBackgroundVolume(volume),
      (store) => store.setBackgroundVolume(volume)
    );
    console.log('✅ AudioCoordinator.setBackgroundVolume completed');
  }

  async setAffirmationVolume(volume: number) {
    console.log('🎤 AudioCoordinator.setAffirmationVolume called with:', volume);
    await this.updateVolume('affirmation', volume,
      () => this.audioSystem.setAffirmationVolume(volume),
      (store) => store.setAffirmationVolume(volume)
    );
    console.log('✅ AudioCoordinator.setAffirmationVolume completed');
  }

  private async updateVolume(
    type: 'background' | 'affirmation',
    volume: number,
    updateAudioSystem: () => Promise<void>,
    updateStore: (store: any) => void
  ) {
    await updateAudioSystem();
    console.log(`📋 AudioCoordinator: Updating store with ${type} volume:`, volume);
    const store = useAudioStore.getState();
    updateStore(store);
  }

  async switchBackgroundTrack(soundId: string) {
    console.log(`🔄 AudioCoordinator[${this.instanceId}].switchBackgroundTrack called with:`, soundId);
    const store = useAudioStore.getState();
    
    try {
      // Use URLResolver to get background track URL
      const trackUrl = this.urlResolver.resolveBackgroundTrack(soundId, store.playlist);
      
      console.log('🎵 AudioCoordinator: Switching to background track:', { soundId, trackUrl });
      await this.audioSystem.switchBackground(trackUrl);
      console.log(`✅ AudioCoordinator[${this.instanceId}].switchBackgroundTrack completed`);
    } catch (error) {
      console.error('❌ AudioCoordinator: Background track switch failed:', error);
      throw error;
    }
  }

  getAudioSystem() {
    return this.audioSystem;
  }




  async cleanup() {
    if (this.appStateSubscription) this.appStateSubscription.remove();
    
    // Phase 4: Cleanup delay timer manager
    const timerManager = getDelayTimerManager();
    timerManager.cleanup();
    
    this.actor.stop();
    await this.audioSystem.cleanup();
  }

  // === PHASE 4 PRIVATE HELPERS ===

  /**
   * Check if events should be suppressed during critical state machine transitions
   * @returns True if events should be suppressed
   */
  private shouldSuppressEvents = (): boolean => {
    const currentState = this.actor.getSnapshot();
    const shouldSuppress = CRITICAL_STATES.some(state => currentState.matches(state));
    
    if (shouldSuppress) {
      console.log(`🚫 AudioCoordinator[${this.instanceId}] Suppressing events during:`, currentState.value);
    }
    
    return shouldSuppress;
  };

  /**
   * Handle queue expansion during safe states with proper error handling
   * Phase 3.2: Added CDN prefetching during queue expansion
   */
  private async handleQueueExpansion(): Promise<void> {
    try {
      const expanded = await this.audioSystem.checkAndExpandQueue();
      if (expanded) {
        console.log(`🎵 AudioCoordinator[${this.instanceId}] Queue expanded during safe state`);
        
        // Phase 3.2: Trigger prefetch for upcoming tracks after queue expansion
        const store = useAudioStore.getState();
        if (store.playlist) {
          const sessionId = this.activeSessionId;
          this.prefetchExpansionTracks(store.playlist, store.currentVoiceId, sessionId as any).catch(error => {
            console.warn('⚠️ [EXPANSION-PREFETCH] CDN prefetch failed (non-blocking):', error);
          });
          
          // Phase 3.3: Also add the expansion prefetched tracks to queue after a delay
          this.addExpansionTracksToQueue(store.playlist, store.currentVoiceId, sessionId as any).catch(error => {
            console.warn('⚠️ [EXPANSION-ADD] Adding expansion tracks failed (non-blocking):', error);
          });
        }
      }
    } catch (error) {
      console.error(`❌ AudioCoordinator[${this.instanceId}] Queue expansion failed:`, error);
      // Could add retry logic or user notification here
    }
  }

  // === PRIVATE BUSINESS LOGIC (moved from AudioServices) ===

  // Assumes playlist URLs are already local (file://, asset:/, or absolute path).
  private bootstrapPlaylist = async (context: { playlist: Playlist; currentVoiceId: VoiceId; globalDelayMs: number }) => {
    const { playlist, currentVoiceId } = context;
    
    if (!playlist) throw new Error('No playlist selected');
    
    // Start a new playback session; invalidate any previously scheduled async tasks
    const sessionId = Math.random().toString(36).slice(2);
    this.activeSessionId = sessionId;
    
    // CRITICAL: Ensure complete audio cleanup before starting new playlist
    console.log('🧹 [BOOTSTRAP] Ensuring complete audio cleanup before new playlist');
    try {
      // Pause all audio first  
      await this.audioSystem.pauseAll();
      // The queue reset will happen in setupAffirmationsQueueWindowed which calls TrackPlayer.reset()
    } catch (error) {
      console.warn('⚠️ [BOOTSTRAP] Cleanup warning (non-fatal):', error);
    }

    // 1) Play background directly (accept require module or uri string)
    const store = useAudioStore.getState();
    let backgroundUrl = playlist.backgroundTrackUrl;
    
    console.log('🎵 [BOOTSTRAP] Original background URL:', backgroundUrl);
    
    // Handle special bundled:// scheme for API playlists
    if (typeof backgroundUrl === 'string' && backgroundUrl.startsWith('bundled://')) {
      const soundId = backgroundUrl.replace('bundled://', '');
      console.log('🎵 [BOOTSTRAP] Resolving bundled background track:', soundId);
      backgroundUrl = this.urlResolver.resolveBackgroundTrack(soundId, playlist);
      console.log('🎵 [BOOTSTRAP] Resolved background URL:', backgroundUrl);
    }
    
    console.log('🎵 [BOOTSTRAP] Final background URL for playback:', backgroundUrl);
    await this.audioSystem.playBackground(backgroundUrl as any, store.backgroundVolume);

    // 2) Build initial queue with URL resolution + CDN prefetching
    // Phase 3.1: CDN Prefetching - fetch additional tracks in background
    this.prefetchPlaylistTracks(playlist, currentVoiceId, sessionId).catch(error => {
      console.warn('⚠️ CDN prefetch failed (non-blocking):', error);
    });

    const affirmations = playlist.affirmations.slice(0, INITIAL_TRACK_COUNT);
    
    // Use URL resolver to handle TTS placeholders and mixed URL types
    const resolvedUrls = this.resolveAffirmationUrls(affirmations, playlist, currentVoiceId, 'BOOTSTRAP');
    const tracks = this.buildTracksWithResolvedUrls(affirmations, resolvedUrls);

    if (!tracks.length) {
      console.warn('⚠️ No tracks resolved for initial queue. Ensure playlist.cdnUrls uses require() or http(s) urls.');
    }
    
    await this.audioSystem.setupAffirmationsQueueWindowed(tracks);
    
    // Phase 3.3: Wait for CDN prefetch to complete, then add prefetched tracks to queue
    this.addPrefetchedTracksToQueue(playlist, currentVoiceId, sessionId).catch(error => {
      console.error('❌ Adding prefetched tracks failed (non-blocking):', error);
    });
    
    // Ensure session is still valid before starting playback
    if (sessionId === this.activeSessionId) {
      await this.audioSystem.playAffirmations();
    } else {
      console.log('⏭️ [BOOTSTRAP] Session changed before starting playback; aborting start');
      return { success: false } as any;
    }
    await this.audioSystem.setAffirmationVolume(store.affirmationVolume);
    
    return { success: true };
  };

  /**
   * Phase 3.3: Add prefetched tracks to the active queue
   * Waits a bit for prefetch to complete, then adds CDN-resolved tracks to queue
   */
  private async addPrefetchedTracksToQueue(playlist: Playlist, voiceId: VoiceId, sessionId: string): Promise<void> {
    if (!this.cdnFactory) {
      return;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, PREFETCH_DELAY_MS));
      // Abort if session changed (playlist switched)
      if (sessionId !== this.activeSessionId) return;
      
      const prefetchStartIndex = PREFETCH_START_INDEX;
      const prefetchEndIndex = Math.min(
        prefetchStartIndex + PREFETCH_TRACK_COUNT,
        playlist.affirmations.length
      );
      
      const prefetchedAffirmations = playlist.affirmations.slice(prefetchStartIndex, prefetchEndIndex);
      
      if (prefetchedAffirmations.length === 0) {
        return;
      }
      
      const resolvedUrls = this.resolveAffirmationUrls(prefetchedAffirmations, playlist, voiceId, 'QUEUE-ADD');
      const tracks = this.buildTracksWithResolvedUrls(prefetchedAffirmations, resolvedUrls);
      
      if (tracks.length > 0) {
        // Guard again before mutating queue
        if (sessionId !== this.activeSessionId) return;
        await this.audioSystem.addTracksToQueue(tracks);
      }
      
    } catch (error) {
      console.error('❌ Failed to add prefetched tracks to queue (non-blocking):', error);
      // Don't throw - this should not block playback
    }
  }

  /**
   * Phase 3.1: Prefetch tracks for CDN caching
   * Fire-and-forget operation that fetches tracks in the background
   */
  private async prefetchPlaylistTracks(playlist: Playlist, voiceId: VoiceId, sessionId: string): Promise<void> {
    if (!this.cdnFactory) {
      return;
    }

    try {
      // Abort early if session already changed
      if (sessionId !== this.activeSessionId) return;
      const cdnClient = this.cdnFactory.getDefaultClient();
      const trackIdsToPrefetch = this.generatePrefetchTrackIds(playlist, voiceId);
      
      if (trackIdsToPrefetch.length === 0) {
        return;
      }

      // Guard again before network work (best-effort)
      if (sessionId !== this.activeSessionId) return;
      await cdnClient.prefetch(trackIdsToPrefetch);
    } catch (error) {
      console.error('❌ CDN prefetch error (non-blocking):', error);
      // Don't throw - prefetch failures should not block playback
    }
  }

  /**
   * Generate canonical track IDs for prefetching
   * Creates IDs in format: voiceId:affirmationId
   */
  private generatePrefetchTrackIds(playlist: Playlist, voiceId: VoiceId): CanonicalTrackId[] {
    const trackIds: CanonicalTrackId[] = [];
    
    // Calculate which tracks to prefetch (after initial tracks)
    const endIndex = Math.min(
      PREFETCH_START_INDEX + PREFETCH_TRACK_COUNT,
      playlist.affirmations.length
    );
    
    for (let i = PREFETCH_START_INDEX; i < endIndex; i++) {
      const affirmation = playlist.affirmations[i];
      if (affirmation) {
        const trackId: CanonicalTrackId = `${voiceId}:${affirmation.id}`;
        trackIds.push(trackId);
      }
    }
    
    return trackIds;
  }

  /**
   * Phase 3.3: Add expansion prefetched tracks to the active queue
   * Waits for expansion prefetch to complete, then adds CDN-resolved tracks to queue
   */
  private async addExpansionTracksToQueue(playlist: Playlist, voiceId: VoiceId, sessionId: string): Promise<void> {
    if (!this.cdnFactory) {
      return;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, EXPANSION_DELAY_MS));
      if (sessionId !== this.activeSessionId) return;
      
      const queueStatus = await this.getCurrentQueueStatus();
      if (!queueStatus) {
        return;
      }
      
      const expansionStartIndex = queueStatus.estimatedNextTrackIndex;
      const expansionEndIndex = Math.min(
        expansionStartIndex + EXPANSION_PREFETCH_COUNT,
        playlist.affirmations.length
      );
      
      const expansionAffirmations = playlist.affirmations.slice(expansionStartIndex, expansionEndIndex);
      
      if (expansionAffirmations.length === 0) {
        return;
      }
      
      const resolvedUrls = this.resolveAffirmationUrls(expansionAffirmations, playlist, voiceId, 'EXPANSION-ADD');
      const tracks = this.buildTracksWithResolvedUrls(expansionAffirmations, resolvedUrls);
      
      if (tracks.length > 0) {
        if (sessionId !== this.activeSessionId) return;
        await this.audioSystem.addTracksToQueue(tracks);
      }
      
    } catch (error) {
      console.warn('⚠️ Failed to add expansion tracks to queue (non-blocking):', error);
      // Don't throw - this should not block playback
    }
  }

  /**
   * Phase 3.2: Prefetch tracks for queue expansion
   * Fire-and-forget operation that fetches tracks beyond current queue window
   */
  private async prefetchExpansionTracks(playlist: Playlist, voiceId: VoiceId, sessionId: string): Promise<void> {
    if (!this.cdnFactory) {
      return;
    }

    try {
      if (sessionId !== this.activeSessionId) return;
      const cdnClient = this.cdnFactory.getDefaultClient();
      
      const queueStatus = await this.getCurrentQueueStatus();
      if (!queueStatus) {
        return;
      }

      const trackIdsToPrefetch = this.generateExpansionPrefetchTrackIds(
        playlist, 
        voiceId, 
        queueStatus.estimatedNextTrackIndex
      );
      
      if (trackIdsToPrefetch.length === 0) {
        return;
      }

      // Guard again before network work
      if (sessionId !== this.activeSessionId) return;
      await cdnClient.prefetch(trackIdsToPrefetch);
    } catch (error) {
      console.warn('⚠️ CDN expansion prefetch error (non-blocking):', error);
      // Don't throw - prefetch failures should not block queue expansion
    }
  }

  /**
   * Generate canonical track IDs for expansion prefetching
   * Creates IDs for tracks beyond the current queue window
   */
  private generateExpansionPrefetchTrackIds(
    playlist: Playlist, 
    voiceId: VoiceId, 
    startIndex: number
  ): CanonicalTrackId[] {
    const trackIds: CanonicalTrackId[] = [];
    
    // Calculate prefetch range starting from the estimated next queue position
    const endIndex = Math.min(
      startIndex + EXPANSION_PREFETCH_COUNT,
      playlist.affirmations.length
    );
    
    for (let i = startIndex; i < endIndex; i++) {
      const affirmation = playlist.affirmations[i];
      if (affirmation) {
        const trackId: CanonicalTrackId = `${voiceId}:${affirmation.id}`;
        trackIds.push(trackId);
      }
    }
    
    return trackIds;
  }

  /**
   * Get current queue status to determine prefetch range
   */
  private async getCurrentQueueStatus(): Promise<{ estimatedNextTrackIndex: number } | null> {
    try {
      const audioSystem = this.audioSystem as any;
      const allTracks = audioSystem.allTracks;
      const currentWindowStart = audioSystem.currentWindowStart;
      
      if (!allTracks || allTracks.length === 0) {
        return null;
      }

      // Estimate where the next queue expansion would add tracks
      const currentQueue = await TrackPlayer.getQueue();
      const estimatedNextTrackIndex = currentWindowStart + currentQueue.length;
      
      return { estimatedNextTrackIndex };
    } catch (error) {
      console.warn('⚠️ [EXPANSION-PREFETCH] Failed to get queue status:', error);
      return null;
    }
  }

  // Switch to a new voice without downloads; assumes local files exist
  private voiceSwitchTransaction = async (data: {
    newVoiceId: VoiceId;
    pausedState: PausedState;
    playlist: Playlist;
    globalDelayMs: number;
  }) => {
    console.log('🔄 [VOICE-SWITCH] Starting voice switch transaction:', {
      newVoiceId: data.newVoiceId,
      fromIndex: data.pausedState.trackIndex,
      positionMs: data.pausedState.positionMs,
      globalDelayMs: data.globalDelayMs
    });
    
    console.log('🔄 [VOICE-SWITCH] Executing main voice switch operation');
    const { newVoiceId, pausedState, playlist } = data;
    if (!playlist || !pausedState) throw new Error('Missing required data for voice switch');

    const fromIndex = pausedState.trackIndex;
    console.log('🔄 [VOICE-SWITCH] Building tracks from index:', fromIndex);
    
    const remainingAffirmations = playlist.affirmations.slice(fromIndex);
    console.log('🔄 [VOICE-SWITCH] Remaining affirmations:', remainingAffirmations.length);
    
    // Use URL resolver for voice switching
    const resolvedUrls = this.resolveAffirmationUrls(remainingAffirmations, playlist, newVoiceId, 'VOICE-SWITCH');
    
    console.log('🔄 [VOICE-SWITCH] Resolved URLs for voice:', resolvedUrls.length);

    const tracks = this.buildTracksWithResolvedUrls(remainingAffirmations, resolvedUrls);
    console.log('🔄 [VOICE-SWITCH] Built tracks with resolved URLs:', tracks.length);

    // TODO - consider the perofrmance of this code - would this be too blocking for what we need? Could we update a quick few tracks and then
    // create a queue of tracks to play?
    console.log('🔄 [VOICE-SWITCH] Updating upcoming tracks...');
    await this.audioSystem.updateUpcomingTracks(tracks, fromIndex);
    
    console.log('🔄 [VOICE-SWITCH] Resuming affirmations with paused state...');
    await this.audioSystem.resumeAffirmations(pausedState);

    console.log('✅ [VOICE-SWITCH] Voice switch completed successfully to:', newVoiceId);
    return { voiceId: newVoiceId };
  };

  /**
   * Resolve URLs for multiple affirmations with error handling
   * @param affirmations Array of affirmations to resolve
   * @param playlist The playlist containing URL mappings
   * @param voiceId The voice to use
   * @param context Context for logging (e.g., 'BOOTSTRAP', 'VOICE-SWITCH')
   * @returns Array of resolved URLs (failed resolutions are filtered out)
   */
  private resolveAffirmationUrls(
    affirmations: { id: string }[],
    playlist: Playlist,
    voiceId: VoiceId,
    context: string
  ): string[] {
    console.log(`🔍 [${context}] Resolving URLs for ${affirmations.length} affirmations with voice: ${voiceId}`);
    console.log(`🔍 [${context}] Playlist CDN URLs available for voice ${voiceId}:`, Object.keys(playlist.cdnUrls?.[voiceId] || {}));
    
    const results = affirmations.map((affirmation, index) => {
      try {
        console.log(`🔍 [${context}] [${index}] Resolving affirmation ID: ${affirmation.id}`);
        const resolvedUrl = this.urlResolver.resolve(playlist, affirmation.id, voiceId);
        console.log(`✅ [${context}] [${index}] Resolved to: ${typeof resolvedUrl} ${typeof resolvedUrl === 'number' ? `(require module ${resolvedUrl})` : `(${resolvedUrl})`}`);
        
        // Validate that resolved URL is playable
        if (!this.urlResolver.isPlayable(resolvedUrl)) {
          console.warn(`⚠️ [${context}] [${index}] Resolved URL not playable for ${affirmation.id}: ${resolvedUrl}`);
          return null;
        }
        
        console.log(`🎵 [${context}] [${index}] URL validation passed for ${affirmation.id}`);
        return resolvedUrl;
      } catch (error) {
        console.error(`❌ [${context}] [${index}] Failed to resolve URL for ${affirmation.id}:`, error);
        return null;
      }
    });
    
    const filteredResults = results.filter(Boolean) as string[];
    console.log(`📊 [${context}] URL Resolution Summary: ${filteredResults.length}/${affirmations.length} URLs resolved successfully`);
    
    return filteredResults;
  }

  /**
   * Build tracks with pre-resolved URLs
   * @param affirmations Array of affirmations
   * @param resolvedUrls Array of resolved URLs (same length as affirmations)
   * @returns Array of Track objects ready for RNTP
   */
  private buildTracksWithResolvedUrls(
    affirmations: { id: string; text?: string }[], 
    resolvedUrls: string[]
  ): Track[] {
    console.log(`🔧 [TRACK-BUILD] Building tracks from ${affirmations.length} affirmations and ${resolvedUrls.length} resolved URLs`);
    const tracks: Track[] = [];

    // Ensure we have matching arrays
    const minLength = Math.min(affirmations.length, resolvedUrls.length);
    console.log(`🔧 [TRACK-BUILD] Processing ${minLength} tracks (minimum of affirmations and URLs)`);
    
    for (let index = 0; index < minLength; index++) {
      const affirmation = affirmations[index];
      const url = resolvedUrls[index];
      
      console.log(`🔧 [TRACK-BUILD] [${index}] Building track:`, {
        id: affirmation.id,
        title: affirmation.text?.substring(0, 30) + '...',
        urlType: typeof url,
        urlValue: typeof url === 'number' ? `require(${url})` : url?.toString().substring(0, 50)
      });
      
      // URLs are already validated in resolveAffirmationUrls
      const track = {
        id: affirmation.id,
        url: url as any,
        title: affirmation.text || `Affirmation ${index + 1}`,
        artist: DEFAULT_ARTIST_NAME,
      };

      tracks.push(track);
      console.log(`✅ [TRACK-BUILD] [${index}] Track added to queue: ${track.id}`);

      // Delay insertion disabled until silence assets are bundled or a timer-based gap is implemented
    }

    console.log(`🎵 [TRACK-BUILD] Built ${tracks.length} tracks from ${affirmations.length} affirmations`);
    console.log(`🎵 [TRACK-BUILD] Final tracks summary:`, tracks.map(t => ({ id: t.id, title: (t.title || '').substring(0, 20) + '...' })));
    return tracks;
  }

  private getMachineActions() {
    return {
      pauseAffirmations: async () => { 
        console.log('🔇 [DELAY-PAUSE] pauseAffirmations action called - pausing for delay timer');
        await this.audioSystem.pauseAffirmations(); 
      },
      savePausedState: async () => await this.audioSystem.pauseAffirmations(),
      resumeAffirmations: async () => { 
        console.log('🔊 [DELAY-RESUME] resumeAffirmations action called - resuming after delay timer');
        await this.audioSystem.resumeAffirmations(); 
      },
      skipToNextTrack: async () => { await this.audioSystem.skipToNextTrack(); },
      pauseAllPlayers: async () => { await this.audioSystem.pauseAll(); },
      resumeAllPlayers: async () => { await this.audioSystem.resumeAll(); },
      pauseBackground: async () => { await this.audioSystem.pauseBackground(); },
      resumeBackground: async () => { await this.audioSystem.resumeBackground(); },
      stopAllAudio: async () => {
        console.log('🛑 [STOP-ALL] stopAllAudio action called - stopping all audio playback');
        try {
          // Stop Track Player completely
          const state = await TrackPlayer.getPlaybackState();
          if (state.state !== State.None) {
            await TrackPlayer.stop();
          }
          // Stop background music
          await this.audioSystem['backgroundPlayer'].cleanup();
        } catch (error) {
          console.error('❌ [STOP-ALL] Error stopping audio:', error);
        }
      },
      updateGlobalDelay: (args: any) => {
        console.log('⏰ [DELAY] updateGlobalDelay action called');
        const { context, event } = args || {};
        console.log('⏰ [DELAY] Event details:', { 
          eventType: event?.type, 
          delayMs: event?.delayMs,
          currentDelay: context?.globalDelayMs 
        });
        
        if (event?.type !== 'UPDATE_DELAY') return;
        if (context) {
          console.log('⏰ [DELAY] Updating context delay from', context.globalDelayMs, 'to', event.delayMs);
          context.globalDelayMs = event.delayMs;
        }
      },
      updateUpcomingTracks: async (args: any) => {
        console.log('🔄 [DELAY] updateUpcomingTracks action called');
        const { context } = args || {};
        console.log('🔄 [DELAY] Context delay for upcoming tracks:', context?.globalDelayMs);
        // TODO: Actually implement track updates with new delay if needed
      },
      logBootstrapSuccess: () => console.log('Playlist bootstrap successful'),
      logVoiceSwitchSuccess: () => console.log('Voice switch successful'),
      logVoiceSwitchError: (args: any) => console.error('Voice switch failed:', args?.event?.data),
      resumeWithOldVoice: async () => { await this.audioSystem.resumeAffirmations(); },
    };
  }

  // Phase 1B: Enhanced pause and snapshot for voice switching
  private pauseAndSnapshot = async (): Promise<PausedState> => {
    // Legacy method for backward compatibility - still returns PausedState
    return await this.audioSystem.pauseAffirmations();
  };

  // Phase 1B: New snapshot-based pause for voice switching
  private capturePlaybackSnapshot = async (): Promise<PlaybackSnapshot> => {
    console.log('📸 AudioCoordinator: Capturing playback snapshot');
    await this.audioSystem.pauseAffirmations();
    return await this.audioSystem.captureSnapshot();
  };

  // Phase 1B: Restore from snapshot with optional new tracks
  private restoreFromSnapshot = async (
    snapshot: PlaybackSnapshot, 
    newTracks?: Track[]
  ): Promise<boolean> => {
    console.log('🔄 AudioCoordinator: Restoring from snapshot');
    return await this.audioSystem.restoreFromSnapshot(snapshot, newTracks);
  };

  private getMachineServices() {
    return {
      bootstrapPlaylist: this.bootstrapPlaylist,
      voiceSwitchTransaction: this.voiceSwitchTransaction,
      pauseAndSnapshot: this.pauseAndSnapshot,
      // Phase 1B: New snapshot-based services
      capturePlaybackSnapshot: this.capturePlaybackSnapshot,
      restoreFromSnapshot: this.restoreFromSnapshot,
    };
  }

  /**
   * Create URLResolver with optional CDN client
   */
  private createURLResolver(): URLResolver {
    if (!this.cdnFactory) {
      return new URLResolver(this.bundledAssets);
    }

    try {
      // Validate CDN factory
      if (typeof this.cdnFactory.getDefaultClient !== 'function') {
        console.warn('⚠️ [AUDIO-COORDINATOR] Invalid CDN factory provided, falling back to standard URLResolver');
        return new URLResolver(this.bundledAssets);
      }

      const cdnClient = this.cdnFactory.getDefaultClient();
      console.log('📦 [AUDIO-COORDINATOR] CDN-enabled URLResolver created');
      return new URLResolver(this.bundledAssets, cdnClient);
    } catch (error) {
      console.warn('⚠️ [AUDIO-COORDINATOR] Failed to initialize CDN client, falling back to standard URLResolver:', error);
      return new URLResolver(this.bundledAssets);
    }
  }

  /**
   * Log CDN client statistics for debugging
   */
  private logCDNStats(): void {
    if (!this.cdnFactory) return;

    try {
      const cdnClient = this.cdnFactory.getDefaultClient();
      const stats = cdnClient.getStats();
      console.log('📊 [AUDIO-COORDINATOR] CDN client stats:', {
        manifestLoaded: stats.manifestLoaded,
        totalRequests: stats.totalRequests,
        successfulRequests: stats.successfulRequests,
        failedRequests: stats.failedRequests
      });
    } catch (error) {
      console.warn('⚠️ [AUDIO-COORDINATOR] Failed to get CDN stats:', error);
    }
  }
}

// Singleton instance
let coordinatorInstance: AudioCoordinator | null = null;

export function getAudioCoordinator(cdnFactory?: CDNFactory): AudioCoordinator {
  if (!coordinatorInstance) {
    coordinatorInstance = new AudioCoordinator(cdnFactory);
  }
  return coordinatorInstance;
}

/**
 * Reset the singleton instance (primarily for testing)
 */
export function resetAudioCoordinator(): void {
  coordinatorInstance = null;
}