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
import { audioLog, audioWarn } from '../utils/logger';
import { AUDIO_CONFIG } from '../config/audio';

// Derived constants
const PREFETCH_START_INDEX = AUDIO_CONFIG.INITIAL_TRACK_COUNT; // Start prefetching after initial tracks

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
    this.instanceId = Math.random().toString(36).substring(2, 2 + AUDIO_CONFIG.INSTANCE_ID_LENGTH);
    
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
          audioLog('[DELAY-TIMER] Starting timer:', `${input.delayMs}ms`);
          
          // Phase 4: Use managed delay timer with app state handling
          return new Promise<void>((resolve) => {
            const timerManager = getDelayTimerManager();
            const timer = timerManager.createManagedTimer(input.delayMs, () => {
              audioLog('[DELAY-TIMER] Timer completed');
              resolve();
            }, {
              enableDriftCompensation: true,
              onCancel: (elapsed) => {
                audioWarn('[DELAY-TIMER] Timer cancelled:', `${elapsed}ms/${input.delayMs}ms`);
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
      // Only log significant state changes, not every transition
      const stateValue = typeof snapshot.value === 'object' ? Object.keys(snapshot.value)[0] : snapshot.value;
      const isSignificantChange = ['playing', 'paused', 'stopped', 'voiceSwitching'].includes(stateValue);
      
      if (isSignificantChange) {
        audioLog('[STATE]', stateValue, snapshot.context.currentVoiceId, `track:${snapshot.context.currentTrackIndex}`);
      }
      
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
    audioLog('[COORDINATOR] Selecting playlist:', playlist.name);
    this.actor.send({ type: 'SELECT_PLAYLIST', playlist });
  }

  async startPlayback(playlist: Playlist, voiceId: VoiceId) {
    audioLog('[COORDINATOR] Starting playback:', playlist.name, voiceId);
    this.actor.send({ type: 'START_PLAYBACK', playlist, voiceId });
  }

  openVoiceModal() {
    audioLog('[COORDINATOR] Opening voice modal');
    this.actor.send({ type: 'OPEN_VOICE_MODAL' });
  }

  async closeVoiceModal() {
    audioLog('[COORDINATOR] Closing voice modal');
    this.actor.send({ type: 'CANCEL_VOICE_MODAL' });
  }

  async confirmVoiceSelection(voiceId: VoiceId) {
    audioLog('[COORDINATOR] Voice selected:', voiceId);
    this.actor.send({ type: 'CONFIRM_VOICE', voiceId });
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
      this.waitForIdleState(newPlaylist, voiceId, resolve);
      this.initiatePlaylistSwitch();
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

  /**
   * PLAYLIST SWITCH HELPER METHODS (Internal refactoring for better readability)
   * These methods break down the complex switchPlaylist coordination logic.
   */

  /**
   * Setup state machine monitoring for playlist switch completion
   */
  private waitForIdleState(newPlaylist: Playlist, voiceId: VoiceId, resolve: () => void) {
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
    
    return subscription;
  }

  /**
   * Initiate playlist switch by invalidating session and stopping current playback
   */
  private initiatePlaylistSwitch(): void {
    // Trigger the switch by stopping current playback
    console.log(`🔄 AudioCoordinator[${this.instanceId}].switchPlaylist: Stopping current playlist`);
    // Invalidate async tasks immediately so any queued work from the old session is dropped
    this.activeSessionId = null;
    this.actor.send({ type: 'STOP_PLAYBACK' });
  }

  /**
   * BOOTSTRAP HELPER METHODS (Internal refactoring for better readability)
   * These methods break down the complex bootstrapPlaylist logic into focused steps.
   */

  /**
   * Start a new playback session and invalidate previous async tasks
   */
  private startNewPlaybackSession(): string {
    const sessionId = Math.random().toString(36).slice(2);
    this.activeSessionId = sessionId;
    audioLog('[BOOTSTRAP] Started new playback session:', sessionId);
    return sessionId;
  }

  /**
   * Ensure complete audio cleanup before starting new playlist
   */
  private async performAudioCleanup(): Promise<void> {
    audioLog('[BOOTSTRAP] Ensuring complete audio cleanup before new playlist');
    try {
      await this.audioSystem.pauseAll();
      // The queue reset will happen in setupAffirmationsQueueWindowed which calls TrackPlayer.reset()
    } catch (error) {
      console.warn('⚠️ [BOOTSTRAP] Cleanup warning (non-fatal):', error);
    }
  }

  /**
   * Resolve and start background track playback
   */
  private async setupBackgroundTrack(playlist: Playlist): Promise<void> {
    const store = useAudioStore.getState();
    let backgroundUrl = playlist.backgroundTrackUrl;
    
    audioLog('[BOOTSTRAP] Original background URL:', backgroundUrl);
    
    // Handle special bundled:// scheme for API playlists
    if (typeof backgroundUrl === 'string' && backgroundUrl.startsWith('bundled://')) {
      const soundId = backgroundUrl.replace('bundled://', '');
      audioLog('[BOOTSTRAP] Resolving bundled background track:', soundId);
      backgroundUrl = this.urlResolver.resolveBackgroundTrack(soundId, playlist);
      audioLog('[BOOTSTRAP] Resolved background URL:', backgroundUrl);
    }
    
    audioLog('[BOOTSTRAP] Final background URL for playback:', backgroundUrl);
    await this.audioSystem.playBackground(backgroundUrl as any, store.backgroundVolume);
  }

  /**
   * Build and setup initial affirmations queue with URL resolution
   */
  private async setupInitialAffirmationsQueue(playlist: Playlist, voiceId: VoiceId): Promise<void> {
    const affirmations = playlist.affirmations.slice(0, AUDIO_CONFIG.INITIAL_TRACK_COUNT);
    
    // Use URL resolver to handle TTS placeholders and mixed URL types
    const resolvedUrls = this.resolveAffirmationUrls(affirmations, playlist, voiceId, 'BOOTSTRAP');
    const tracks = this.buildTracksWithResolvedUrls(affirmations, resolvedUrls);

    if (!tracks.length) {
      console.warn('⚠️ No tracks resolved for initial queue. Ensure playlist.cdnUrls uses require() or http(s) urls.');
    }
    
    await this.audioSystem.setupAffirmationsQueueWindowed(tracks);
  }

  /**
   * Start affirmations playback if session is still valid
   */
  private async startAffirmationsPlayback(sessionId: string): Promise<{ success: boolean }> {
    const store = useAudioStore.getState();
    
    // Ensure session is still valid before starting playback
    if (sessionId === this.activeSessionId) {
      await this.audioSystem.playAffirmations();
      await this.audioSystem.setAffirmationVolume(store.affirmationVolume);
      return { success: true };
    } else {
      audioLog('[BOOTSTRAP] Session changed before starting playback; aborting start');
      return { success: false };
    }
  }

  /**
   * Main playlist bootstrap orchestration - now using focused helper methods
   * Assumes playlist URLs are already local (file://, asset:/, or absolute path).
   */
  private bootstrapPlaylist = async (context: { playlist: Playlist; currentVoiceId: VoiceId; globalDelayMs: number }) => {
    const { playlist, currentVoiceId } = context;
    
    if (!playlist) throw new Error('No playlist selected');
    
    // Step 1: Start new session and invalidate previous async tasks
    const sessionId = this.startNewPlaybackSession();
    
    // Step 2: Ensure complete audio cleanup before starting new playlist
    await this.performAudioCleanup();
    
    // Step 3: Setup and start background track playback
    await this.setupBackgroundTrack(playlist);
    
    // Step 4: Start CDN prefetching for additional tracks (non-blocking)
    this.prefetchPlaylistTracks(playlist, currentVoiceId, sessionId).catch(error => {
      console.warn('⚠️ CDN prefetch failed (non-blocking):', error);
    });
    
    // Step 5: Build and setup initial affirmations queue
    await this.setupInitialAffirmationsQueue(playlist, currentVoiceId);
    
    // Step 6: Schedule adding prefetched tracks to queue (non-blocking)
    this.addPrefetchedTracksToQueue(playlist, currentVoiceId, sessionId).catch(error => {
      console.error('❌ Adding prefetched tracks failed (non-blocking):', error);
    });
    
    // Step 7: Start affirmations playback if session is still valid
    return await this.startAffirmationsPlayback(sessionId);
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
      // Step 1: Wait and validate session is still active
      const sessionValid = await this.validateSessionAndWait(sessionId);
      if (!sessionValid) return;
      
      // Step 2: Calculate prefetch range and slice affirmations
      const prefetchedAffirmations = this.calculatePrefetchRange(playlist);
      if (prefetchedAffirmations.length === 0) return;
      
      // Step 3: Resolve URLs and add tracks to queue
      await this.addResolvedTracksToQueue(prefetchedAffirmations, playlist, voiceId, sessionId);
      
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
      
      const trackIdsToPrefetch = this.generatePrefetchTrackIds(playlist, voiceId);
      if (trackIdsToPrefetch.length === 0) return;

      await this.executeCDNPrefetch(trackIdsToPrefetch, sessionId);
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
      PREFETCH_START_INDEX + AUDIO_CONFIG.PREFETCH_TRACK_COUNT,
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
      await new Promise(resolve => setTimeout(resolve, AUDIO_CONFIG.EXPANSION_DELAY_MS));
      if (sessionId !== this.activeSessionId) return;
      
      const queueStatus = await this.getCurrentQueueStatus();
      if (!queueStatus) {
        return;
      }
      
      const expansionStartIndex = queueStatus.estimatedNextTrackIndex;
      const expansionEndIndex = Math.min(
        expansionStartIndex + AUDIO_CONFIG.EXPANSION_PREFETCH_COUNT,
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
      startIndex + AUDIO_CONFIG.EXPANSION_PREFETCH_COUNT,
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

  /**
   * CDN PREFETCHING HELPER METHODS (Internal refactoring for better readability)
   * These methods break down complex CDN prefetching and queue management logic.
   */

  /**
   * Execute CDN prefetch operation with session validation
   */
  private async executeCDNPrefetch(trackIdsToPrefetch: CanonicalTrackId[], sessionId: string): Promise<void> {
    // Guard again before network work (best-effort)
    if (sessionId !== this.activeSessionId) return;
    
    const cdnClient = this.cdnFactory!.getDefaultClient();
    await cdnClient.prefetch(trackIdsToPrefetch);
  }

  /**
   * Wait for prefetch delay and validate session is still active
   */
  private async validateSessionAndWait(sessionId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, AUDIO_CONFIG.PREFETCH_DELAY_MS));
    
    // Abort if session changed (playlist switched)
    return sessionId === this.activeSessionId;
  }

  /**
   * Calculate prefetch range and return sliced affirmations
   */
  private calculatePrefetchRange(playlist: Playlist): { id: string; text: string }[] {
    const prefetchStartIndex = PREFETCH_START_INDEX;
    const prefetchEndIndex = Math.min(
      prefetchStartIndex + AUDIO_CONFIG.PREFETCH_TRACK_COUNT,
      playlist.affirmations.length
    );
    
    return playlist.affirmations.slice(prefetchStartIndex, prefetchEndIndex);
  }

  /**
   * Resolve URLs and add tracks to audio system queue
   */
  private async addResolvedTracksToQueue(
    affirmations: { id: string; text: string }[], 
    playlist: Playlist, 
    voiceId: VoiceId, 
    sessionId: string
  ): Promise<void> {
    const resolvedUrls = this.resolveAffirmationUrls(affirmations, playlist, voiceId, 'QUEUE-ADD');
    const tracks = this.buildTracksWithResolvedUrls(affirmations, resolvedUrls);
    
    if (tracks.length > 0) {
      // Guard again before mutating queue
      if (sessionId !== this.activeSessionId) return;
      await this.audioSystem.addTracksToQueue(tracks);
    }
  }

  /**
   * VOICE SWITCH HELPER METHODS (Internal refactoring for better readability)
   * These methods break down the complex voiceSwitchTransaction logic into focused steps.
   */

  /**
   * Validate voice switch input data and extract parameters
   */
  private validateVoiceSwitchData(data: {
    newVoiceId: VoiceId;
    pausedState: PausedState;
    playlist: Playlist;
    globalDelayMs: number;
  }) {
    console.log('🔄 [VOICE-SWITCH] Executing main voice switch operation');
    const { newVoiceId, pausedState, playlist } = data;
    if (!playlist || !pausedState) throw new Error('Missing required data for voice switch');
    
    return { newVoiceId, pausedState, playlist };
  }

  /**
   * Build tracks for voice switch from current position
   */
  private buildVoiceSwitchTracks(playlist: Playlist, newVoiceId: VoiceId, fromIndex: number) {
    console.log('🔄 [VOICE-SWITCH] Building tracks from index:', fromIndex);
    
    const remainingAffirmations = playlist.affirmations.slice(fromIndex);
    console.log('🔄 [VOICE-SWITCH] Remaining affirmations:', remainingAffirmations.length);
    
    // Use URL resolver for voice switching
    const resolvedUrls = this.resolveAffirmationUrls(remainingAffirmations, playlist, newVoiceId, 'VOICE-SWITCH');
    console.log('🔄 [VOICE-SWITCH] Resolved URLs for voice:', resolvedUrls.length);

    const tracks = this.buildTracksWithResolvedUrls(remainingAffirmations, resolvedUrls);
    console.log('🔄 [VOICE-SWITCH] Built tracks with resolved URLs:', tracks.length);
    
    return tracks;
  }

  /**
   * Update audio system with new voice tracks and resume playback
   */
  private async updateAudioSystemForVoiceSwitch(
    tracks: any[], 
    pausedState: PausedState, 
    fromIndex: number
  ): Promise<void> {
    // TODO - consider the perofrmance of this code - would this be too blocking for what we need? Could we update a quick few tracks and then
    // create a queue of tracks to play?
    console.log('🔄 [VOICE-SWITCH] Updating upcoming tracks...');
    await this.audioSystem.updateUpcomingTracks(tracks, fromIndex);
    
    console.log('🔄 [VOICE-SWITCH] Resuming affirmations with paused state...');
    await this.audioSystem.resumeAffirmations(pausedState);
  }

  /**
   * Log voice switch progress with consistent formatting
   */
  private logVoiceSwitchProgress(message: string, data?: any): void {
    if (data && typeof data === 'object' && 'newVoiceId' in data) {
      // Initial log with full details
      console.log(`🔄 [VOICE-SWITCH] ${message}:`, {
        newVoiceId: data.newVoiceId,
        fromIndex: data.pausedState?.trackIndex,
        positionMs: data.pausedState?.positionMs,
        globalDelayMs: data.globalDelayMs
      });
    } else {
      // Completion or simple progress log
      console.log(`✅ [VOICE-SWITCH] ${message}${data ? ':' : ''}`, data || '');
    }
  }

  // Switch to a new voice without downloads; assumes local files exist
  private voiceSwitchTransaction = async (data: {
    newVoiceId: VoiceId;
    pausedState: PausedState;
    playlist: Playlist;
    globalDelayMs: number;
  }) => {
    this.logVoiceSwitchProgress('Starting voice switch transaction', data);
    
    // Step 1: Validate input data and extract parameters
    const validatedData = this.validateVoiceSwitchData(data);
    const { newVoiceId, pausedState, playlist } = validatedData;
    const fromIndex = pausedState.trackIndex;
    
    // Step 2: Build tracks for the new voice from current position
    const tracks = this.buildVoiceSwitchTracks(playlist, newVoiceId, fromIndex);
    
    // Step 3: Update audio system with new tracks and resume playback
    await this.updateAudioSystemForVoiceSwitch(tracks, pausedState, fromIndex);
    
    this.logVoiceSwitchProgress('Voice switch completed successfully', { voiceId: newVoiceId });
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
    this.logResolutionStart(affirmations, playlist, voiceId, context);
    
    const results = affirmations.map((affirmation, index) => 
      this.resolveIndividualAffirmationUrl(affirmation, playlist, voiceId, context, index)
    );
    
    return this.logResolutionSummary(results, affirmations.length, context);
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
    const minLength = this.validateAndProcessArrays(affirmations, resolvedUrls);
    const tracks: Track[] = [];
    
    for (let index = 0; index < minLength; index++) {
      const track = this.buildIndividualTrack(affirmations[index], resolvedUrls[index], index);
      tracks.push(track);
    }

    this.logTrackBuildingSummary(tracks, affirmations.length);
    return tracks;
  }

  /**
   * URL RESOLUTION HELPER METHODS (Internal refactoring for better readability)
   * These methods break down the complex URL resolution and track building logic.
   */

  /**
   * Log the start of URL resolution with context and available CDN URLs
   */
  private logResolutionStart(
    affirmations: { id: string }[],
    playlist: Playlist,
    voiceId: VoiceId,
    context: string
  ): void {
    console.log(`🔍 [${context}] Resolving URLs for ${affirmations.length} affirmations with voice: ${voiceId}`);
    console.log(`🔍 [${context}] Playlist CDN URLs available for voice ${voiceId}:`, Object.keys(playlist.cdnUrls?.[voiceId] || {}));
  }

  /**
   * Resolve a single affirmation URL with validation and error handling
   */
  private resolveIndividualAffirmationUrl(
    affirmation: { id: string },
    playlist: Playlist,
    voiceId: VoiceId,
    context: string,
    index: number
  ): string | null {
    try {
      console.log(`🔍 [${context}] [${index}] Resolving affirmation ID: ${affirmation.id}`);
      const resolvedUrl = this.urlResolver.resolve(playlist, affirmation.id, voiceId);
      
      // Handle the case where urlResolver returns a Promise (for CDN downloads)
      if (resolvedUrl instanceof Promise) {
        console.warn(`⚠️ [${context}] [${index}] Async URL resolution not supported in batch mode for ${affirmation.id}`);
        return null;
      }
      
      console.log(`✅ [${context}] [${index}] Resolved to: ${typeof resolvedUrl} ${typeof resolvedUrl === 'number' ? `(require module ${resolvedUrl})` : `(${resolvedUrl})`}`);
      
      // Validate that resolved URL is playable
      if (!this.urlResolver.isPlayable(resolvedUrl)) {
        console.warn(`⚠️ [${context}] [${index}] Resolved URL not playable for ${affirmation.id}: ${resolvedUrl}`);
        return null;
      }
      
      console.log(`🎵 [${context}] [${index}] URL validation passed for ${affirmation.id}`);
      return resolvedUrl as string;
    } catch (error) {
      console.error(`❌ [${context}] [${index}] Failed to resolve URL for ${affirmation.id}:`, error);
      return null;
    }
  }

  /**
   * Filter results and log resolution summary
   */
  private logResolutionSummary(results: (string | null)[], totalCount: number, context: string): string[] {
    const filteredResults = results.filter(Boolean) as string[];
    console.log(`📊 [${context}] URL Resolution Summary: ${filteredResults.length}/${totalCount} URLs resolved successfully`);
    return filteredResults;
  }

  /**
   * Validate arrays and return minimum processing length
   */
  private validateAndProcessArrays(
    affirmations: { id: string; text?: string }[],
    resolvedUrls: string[]
  ): number {
    console.log(`🔧 [TRACK-BUILD] Building tracks from ${affirmations.length} affirmations and ${resolvedUrls.length} resolved URLs`);
    const minLength = Math.min(affirmations.length, resolvedUrls.length);
    console.log(`🔧 [TRACK-BUILD] Processing ${minLength} tracks (minimum of affirmations and URLs)`);
    return minLength;
  }

  /**
   * Build a single track with logging
   */
  private buildIndividualTrack(
    affirmation: { id: string; text?: string },
    url: string,
    index: number
  ): Track {
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
      artist: AUDIO_CONFIG.DEFAULT_ARTIST_NAME,
    };

    console.log(`✅ [TRACK-BUILD] [${index}] Track added to queue: ${track.id}`);
    
    // Delay insertion disabled until silence assets are bundled or a timer-based gap is implemented
    return track;
  }

  /**
   * Log track building completion summary
   */
  private logTrackBuildingSummary(tracks: Track[], totalAffirmations: number): void {
    console.log(`🎵 [TRACK-BUILD] Built ${tracks.length} tracks from ${totalAffirmations} affirmations`);
    console.log(`🎵 [TRACK-BUILD] Final tracks summary:`, tracks.map(t => ({ id: t.id, title: (t.title || '').substring(0, 20) + '...' })));
  }

  private getMachineActions() {
    return {
      pauseAffirmations: async () => { 
        console.log('🔇 [DELAY-PAUSE] pauseAffirmations action called - pausing for delay timer');
        await this.audioSystem.pauseAffirmations(); 
      },
      resumeAffirmations: async () => { 
        console.log('🔊 [DELAY-RESUME] resumeAffirmations action called - resuming after delay timer');
        await this.audioSystem.resumeAffirmations(); 
      },
      pauseAllPlayers: async () => { await this.audioSystem.pauseAll(); },
      resumeAllPlayers: async () => { await this.audioSystem.resumeAll(); },
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
      resumeFromPausedState: async (args: any) => {
        const { context } = args || {};
        if (context?.pausedState) {
          await this.audioSystem.resumeAffirmations(context.pausedState);
        } else {
          await this.audioSystem.resumeAffirmations();
        }
      },
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