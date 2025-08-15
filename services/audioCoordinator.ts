import { createActor, fromPromise } from 'xstate';
import type { ActorRefFrom } from 'xstate';
import { AppState, AppStateStatus } from 'react-native';
import { audioMachine } from './audioMachine';
import { AudioServices } from './audioService';
import { useAudioStore } from '../store/audioStore';
import type { Playlist, VoiceId } from '../types/audio';

export class AudioCoordinator {
  private actor: ActorRefFrom<typeof audioMachine>;
  private services: AudioServices;
  private appStateSubscription: any;
  private instanceId: string;
  
  
  constructor() {
    this.instanceId = Math.random().toString(36).substring(2, 9);
    console.log('🎮 AudioCoordinator instance created with ID:', this.instanceId);
    this.services = new AudioServices();

    // Wire track advancement events
    this.services.getAudioSystem().onTrackAdvanced = (trackIndex: number) => {
      this.actor.send({ type: 'TRACK_ADVANCED', trackIndex });
    };


    const machineServices = this.services.getMachineServices();
    
    const provided = audioMachine.provide({
      actors: {
        bootstrapPlaylist: fromPromise(({ input }) => machineServices.bootstrapPlaylist(input)),
        voiceSwitchTransaction: fromPromise(({ input }) => machineServices.voiceSwitchTransaction(input)),
        pauseAndSnapshot: fromPromise(() => machineServices.pauseAndSnapshot()),
        createDelay: fromPromise(({ input }: { input: { delayMs: number } }) => {
          console.log('⏱️ [DELAY-TIMER] Starting delay timer for', input.delayMs, 'ms');
          const startTime = Date.now();
          let cancelled = false;
          
          return new Promise<void>((resolve, reject) => {
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
      actions: this.services.getMachineActions(),
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
  }

  openVoiceModal() {
    console.log('🔓 [MODAL] Opening voice modal - sending OPEN_VOICE_MODAL event');
    this.actor.send({ type: 'OPEN_VOICE_MODAL' });
  }

  async closeVoiceModal() {
    // Let the state machine handle preview cleanup and restoration
    console.log('🔒 [MODAL] Closing voice modal via state machine - sending CANCEL_VOICE_MODAL event');
    this.actor.send({ type: 'CANCEL_VOICE_MODAL' });
  }


  async confirmVoiceSelection(voiceId: VoiceId) {
    // Phase 1A: Let machine state drive flags, don't manually manage them
    console.log('✅ [MODAL] Confirming voice selection:', voiceId, '- sending CONFIRM_VOICE event');
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
    this.actor.send({ type: 'SKIP_DELAY' });
  }

  pause() {
    this.actor.send({ type: 'PAUSE_PLAYBACK' });
  }

  resume() {
    this.actor.send({ type: 'RESUME_PLAYBACK' });
  }

  stop() {
    this.actor.send({ type: 'STOP_PLAYBACK' });
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
    await this.services.setBackgroundVolume(volume);
    console.log('📋 AudioCoordinator: Updating store with volume:', volume);
    // Update store to reflect volume change
    const store = useAudioStore.getState();
    store.setBackgroundVolume(volume);
    console.log('✅ AudioCoordinator.setBackgroundVolume completed');
  }

  async setAffirmationVolume(volume: number) {
    console.log('🎤 AudioCoordinator.setAffirmationVolume called with:', volume);
    await this.services.setAffirmationVolume(volume);
    console.log('📋 AudioCoordinator: Updating store with volume:', volume);
    // Update store to reflect volume change
    const store = useAudioStore.getState();
    store.setAffirmationVolume(volume);
    console.log('✅ AudioCoordinator.setAffirmationVolume completed');
  }

  async switchBackgroundTrack(soundId: string) {
    console.log(`🔄 AudioCoordinator[${this.instanceId}].switchBackgroundTrack called with:`, soundId);
    const store = useAudioStore.getState();
    if (!store.playlist) {
      console.warn('⚠️ AudioCoordinator: No playlist available for background track switching');
      return;
    }
    
    await this.services.switchBackgroundTrack(soundId, store.playlist);
    console.log(`✅ AudioCoordinator[${this.instanceId}].switchBackgroundTrack completed`);
  }

  getAudioSystem() {
    return this.services.getAudioSystem();
  }




  async cleanup() {
    if (this.appStateSubscription) this.appStateSubscription.remove();
    this.actor.stop();
    await this.services.getAudioSystem().cleanup();
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