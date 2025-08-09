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
  
  constructor() {
    this.services = new AudioServices();

    const provided = audioMachine.provide({
      actors: {
        bootstrapPlaylist: fromPromise(({ input }) => this.services.bootstrapPlaylist(input)),
        voiceSwitchTransaction: fromPromise(({ input }) => this.services.voiceSwitchTransaction(input)),
        // Add more invoked services here as you implement them
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
      const store = useAudioStore.getState();
      store.setModalOpen(!!snapshot.context.modalOpen);
      store.setPausedState(snapshot.context.pausedState);
      store.setVoiceId(snapshot.context.currentVoiceId);
      store.setIsPlaying(snapshot.matches('playing'));
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
    this.actor.send({ type: 'SELECT_PLAYLIST', playlist });
  }

  openVoiceModal() {
    this.actor.send({ type: 'OPEN_VOICE_MODAL' });
  }

  closeVoiceModal() {
    this.actor.send({ type: 'CANCEL_VOICE_MODAL' });
  }

  previewVoice(voiceId: VoiceId) {
    this.actor.send({ type: 'PREVIEW_VOICE', voiceId });
  }

  async confirmVoiceSelection(voiceId: VoiceId) {
    this.actor.send({ type: 'CONFIRM_VOICE', voiceId });
  }

  updateDelay(delayMs: number) {
    this.actor.send({ type: 'UPDATE_DELAY', delayMs });
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