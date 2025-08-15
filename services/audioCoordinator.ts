import { createActor, fromPromise } from 'xstate';
import type { ActorRefFrom } from 'xstate';
import { AppState, AppStateStatus } from 'react-native';
import { audioMachine } from './audioMachine';
import { AudioPlaybackService } from './audioPlaybackService';
import { URLResolver } from './urlResolver';
import { BundledAssets } from './bundledAssets';
import { useAudioStore } from '../store/audioStore';
import type { Playlist, VoiceId, PausedState, PlaybackSnapshot } from '../types/audio';
import { Track } from 'react-native-track-player';

// Constants
const INITIAL_TRACK_COUNT = 3; // Phase 1B: Reduced from 5 to 3 for better performance
const DEFAULT_ARTIST_NAME = 'Manifestation App';

export class AudioCoordinator {
  private actor: ActorRefFrom<typeof audioMachine>;
  private audioSystem: AudioPlaybackService;
  private urlResolver: URLResolver;
  private bundledAssets: BundledAssets;
  private appStateSubscription: any;
  private instanceId: string;
  
  constructor() {
    this.instanceId = Math.random().toString(36).substring(2, 9);
    console.log('🎮 AudioCoordinator instance created with ID:', this.instanceId);
    
    // Initialize dependencies directly
    this.audioSystem = new AudioPlaybackService();
    this.bundledAssets = new BundledAssets();
    this.urlResolver = new URLResolver(this.bundledAssets);
    
    console.log('🔧 [AUDIO-COORDINATOR] Initialized with direct dependencies');

    // Wire track advancement events
    this.audioSystem.onTrackAdvanced = (trackIndex: number) => {
      this.actor.send({ type: 'TRACK_ADVANCED', trackIndex });
    };

    const machineServices = this.getMachineServices();
    
    const provided = audioMachine.provide({
      actors: {
        bootstrapPlaylist: fromPromise(({ input }) => machineServices.bootstrapPlaylist(input)),
        voiceSwitchTransaction: fromPromise(({ input }) => machineServices.voiceSwitchTransaction(input)),
        pauseAndSnapshot: fromPromise(() => machineServices.pauseAndSnapshot()),
        createDelay: fromPromise(({ input }: { input: { delayMs: number } }) => {
          console.log('⏱️ [DELAY-TIMER] Starting delay timer for', input.delayMs, 'ms');
          const startTime = Date.now();
          let cancelled = false;
          
          return new Promise<void>((resolve) => {
            const timeoutId = setTimeout(() => {
              if (!cancelled) {
                const actualDelay = Date.now() - startTime;
                console.log('⏱️ [DELAY-TIMER] Delay timer completed after', actualDelay, 'ms (expected:', input.delayMs, 'ms)');
                resolve();
              }
            }, input.delayMs);
            
            // Handle cancellation
            return () => {
              cancelled = true;
              clearTimeout(timeoutId);
              const cancelledAfter = Date.now() - startTime;
              console.log('⏱️ [DELAY-TIMER-CANCEL] Delay timer cancelled after', cancelledAfter, 'ms (expected:', input.delayMs, 'ms)');
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
    this.actor.stop();
    await this.audioSystem.cleanup();
  }

  // === PRIVATE BUSINESS LOGIC (moved from AudioServices) ===

  // Assumes playlist URLs are already local (file://, asset:/, or absolute path).
  private bootstrapPlaylist = async (context: { playlist: Playlist; currentVoiceId: VoiceId; globalDelayMs: number }) => {
    const { playlist, currentVoiceId, globalDelayMs } = context;
    console.log('🚀 [BOOTSTRAP] Starting playlist bootstrap for:', playlist.name, 'voice:', currentVoiceId);
    
    if (!playlist) throw new Error('No playlist selected');

    // 1) Play background directly (accept require module or uri string)
    const store = useAudioStore.getState();
    console.log('🎵 [BOOTSTRAP] Step 1: Starting background music');
    console.log('🎵 [BOOTSTRAP] Background URL:', playlist.backgroundTrackUrl, 'volume:', store.backgroundVolume);
    await this.audioSystem.playBackground(playlist.backgroundTrackUrl as any, store.backgroundVolume);
    console.log('✅ [BOOTSTRAP] Background playback initiated');

    // 2) Build initial queue with URL resolution
    console.log('🎵 [BOOTSTRAP] Step 2: Building initial affirmation queue');
    const affirmations = playlist.affirmations.slice(0, INITIAL_TRACK_COUNT);
    console.log('🎵 [BOOTSTRAP] Initial affirmations count:', affirmations.length);
    
    // Use URL resolver to handle TTS placeholders and mixed URL types
    const resolvedUrls = this.resolveAffirmationUrls(affirmations, playlist, currentVoiceId, 'BOOTSTRAP');
    
    console.log('🎵 [BOOTSTRAP] Resolved URLs for voice', currentVoiceId, ':', resolvedUrls.length, 'out of', affirmations.length);

    const tracks = this.buildTracksWithResolvedUrls(affirmations, resolvedUrls);
    console.log('🎵 [BOOTSTRAP] Built tracks with resolved URLs:', tracks.length, 'globalDelayMs:', globalDelayMs);

    if (!tracks.length) {
      console.warn('⚠️ [BOOTSTRAP] No tracks resolved for initial queue. Ensure playlist.cdnUrls uses require() or http(s) urls.');
    }
    
    console.log('🎵 [BOOTSTRAP] Step 3: Setting up affirmations queue');
    await this.audioSystem.setupAffirmationsQueue(tracks);
    
    console.log('🎵 [BOOTSTRAP] Step 4: Starting affirmations playback');
    await this.audioSystem.playAffirmations();
    
    // Set initial affirmation volume from store
    console.log('🎵 [BOOTSTRAP] Step 5: Setting initial volumes');
    console.log('🎵 [BOOTSTRAP] Affirmation volume:', store.affirmationVolume);
    await this.audioSystem.setAffirmationVolume(store.affirmationVolume);

    console.log('🎉 [BOOTSTRAP] Playlist bootstrap completed successfully');
    return { success: true };
  };

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
    return affirmations.map(affirmation => {
      try {
        const resolvedUrl = this.urlResolver.resolve(playlist, affirmation.id, voiceId);
        
        // Validate that resolved URL is playable
        if (!this.urlResolver.isPlayable(resolvedUrl)) {
          console.warn(`⚠️ [${context}] Resolved URL not playable for ${affirmation.id}: ${resolvedUrl}`);
          return null;
        }
        
        return resolvedUrl;
      } catch (error) {
        console.error(`❌ [${context}] Failed to resolve URL for ${affirmation.id}:`, error);
        return null;
      }
    }).filter(Boolean) as string[];
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
    const tracks: Track[] = [];

    // Ensure we have matching arrays
    const minLength = Math.min(affirmations.length, resolvedUrls.length);
    
    for (let index = 0; index < minLength; index++) {
      const affirmation = affirmations[index];
      const url = resolvedUrls[index];
      
      // URLs are already validated in resolveAffirmationUrls

      tracks.push({
        id: affirmation.id,
        url: url as any,
        title: affirmation.text || `Affirmation ${index + 1}`,
        artist: DEFAULT_ARTIST_NAME,
      });

      // Delay insertion disabled until silence assets are bundled or a timer-based gap is implemented
    }

    console.log(`🎵 [TRACK-BUILD] Built ${tracks.length} tracks from ${affirmations.length} affirmations`);
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
}

// Singleton instance
let coordinatorInstance: AudioCoordinator | null = null;

export function getAudioCoordinator(): AudioCoordinator {
  if (!coordinatorInstance) {
    coordinatorInstance = new AudioCoordinator();
  }
  return coordinatorInstance;
}