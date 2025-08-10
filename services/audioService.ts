import { AudioPlaybackService } from './audioPlaybackService';
import { Playlist, VoiceId, PausedState, OperationKey } from '../types/audio';
import { Track } from 'react-native-track-player';
import { useAudioStore } from '../store/audioStore';
import { gate, Priority } from './transactionGate';

export class AudioServices {
  private audioSystem: AudioPlaybackService;
  private transactionGateEnabled = false; // Feature flag

  constructor() {
    this.audioSystem = new AudioPlaybackService();
  }

  // Enable transaction gate for this service
  enableTransactionGate(enabled: boolean = true) {
    this.transactionGateEnabled = enabled;
    console.log(`🔧 AudioServices transaction gate ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Helper to execute operations through gate when enabled
  private async executeWithGate<T>(
    operationKey: OperationKey,
    priority: Priority,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    if (!this.transactionGateEnabled) {
      return operation();
    }

    const result = await gate.exec(operationKey, priority, operation);
    if (result === null && fallback) {
      console.log(`⚠️ Operation ${operationKey} superseded, using fallback`);
      return fallback();
    }
    return result || (undefined as any); // Type assertion for now
  }

  // Assumes playlist URLs are already local (file://, asset:/, or absolute path).
  bootstrapPlaylist = async (context: { playlist: Playlist; currentVoiceId: VoiceId; globalDelayMs: number }) => {
    const { playlist, currentVoiceId, globalDelayMs } = context;
    console.log('🚀 AudioServices.bootstrapPlaylist started for:', playlist.name);
    
    if (!playlist) throw new Error('No playlist selected');

    // 1) Play background directly (accept require module or uri string)
    const store = useAudioStore.getState();
    console.log('🎵 AudioServices: Starting background with URL:', playlist.backgroundTrackUrl, 'at volume:', store.backgroundVolume);
    await this.audioSystem.playBackground(playlist.backgroundTrackUrl as any, store.backgroundVolume);
    console.log('✅ AudioServices: Background playback initiated');

    // 2) Build initial queue from local paths (no downloads)
    const INITIAL_COUNT = 5;
    const affirmations = playlist.affirmations.slice(0, INITIAL_COUNT);
    const paths = affirmations.map(a => playlist.cdnUrls[currentVoiceId][a.id]).filter(Boolean) as any[];

    const tracks = this.buildTracksWithDelays(affirmations, paths, globalDelayMs);

    if (!tracks.length) {
      console.warn('No tracks resolved for initial queue. Ensure playlist.cdnUrls uses require() or http(s) urls.');
    }
    await this.audioSystem.setupAffirmationsQueue(tracks);
    await this.audioSystem.playAffirmations();
    // Set initial affirmation volume from store
    await this.audioSystem.setAffirmationVolume(store.affirmationVolume);

    return { success: true };
  };

  // Switch to a new voice without downloads; assumes local files exist
  voiceSwitchTransaction = async (data: {
    newVoiceId: VoiceId;
    pausedState: PausedState;
    playlist: Playlist;
    globalDelayMs: number;
  }) => {
    return this.executeWithGate(
      `accept:${data.newVoiceId}:${data.pausedState.trackIndex}`,
      Priority.Accept,
      async () => {
        const { newVoiceId, pausedState, playlist, globalDelayMs } = data;
        if (!playlist || !pausedState) throw new Error('Missing required data for voice switch');

        const fromIndex = pausedState.trackIndex;
        const remainingAffirmations = playlist.affirmations.slice(fromIndex);
        const paths = remainingAffirmations
          .map(a => playlist.cdnUrls[newVoiceId][a.id])
          .filter(Boolean) as string[];

        const tracks = this.buildTracksWithDelays(remainingAffirmations, paths, globalDelayMs);

        // TODO - consider the perofrmance of this code - would this be too blocking for what we need? Could we update a quick few tracks and then
        // create a queue of tracks to play?
        await this.audioSystem.updateUpcomingTracks(tracks, fromIndex);
        await this.audioSystem.resumeAffirmations(pausedState);

        return { voiceId: newVoiceId };
      },
      // Fallback: try the operation anyway if gate is superseded
      async () => {
        const { newVoiceId, pausedState, playlist, globalDelayMs } = data;
        console.log(`⚠️ Voice switch superseded; fallback for accept:${newVoiceId}:${pausedState.trackIndex}`);
        
        const fromIndex = pausedState.trackIndex;
        const remainingAffirmations = playlist.affirmations.slice(fromIndex);
        const paths = remainingAffirmations
          .map(a => playlist.cdnUrls[newVoiceId][a.id])
          .filter(Boolean) as string[];

        const tracks = this.buildTracksWithDelays(remainingAffirmations, paths, globalDelayMs);
        await this.audioSystem.updateUpcomingTracks(tracks, fromIndex);
        await this.audioSystem.resumeAffirmations(pausedState);

        return { voiceId: newVoiceId };
      }
    );
  };

  private buildTracksWithDelays(affirmations: { id: string; text?: string }[], localPaths: any[], globalDelayMs: number): Track[] {
    const tracks: Track[] = [];

    const isPlayable = (p: any) => typeof p === 'number' || (typeof p === 'string' && /^https?:\/\//.test(p));

    affirmations.forEach((affirmation, index) => {
      const path = localPaths[index];
      if (!isPlayable(path)) return;

      tracks.push({
        id: affirmation.id,
        url: path as any,
        title: affirmation.text || `Affirmation ${index + 1}`,
        artist: 'Manifestation App',
      });

      // Delay insertion disabled until silence assets are bundled or a timer-based gap is implemented
    });

    return tracks;
  }

  getMachineActions() {
    return {
      pauseAffirmations: async () => { 
        console.log('🔇 pauseAffirmations action called');
        await this.audioSystem.pauseAffirmations(); 
      },
      savePausedState: async () => await this.audioSystem.pauseAffirmations(),
      resumeAffirmations: async () => { 
        console.log('🔊 resumeAffirmations action called');
        await this.audioSystem.resumeAffirmations(); 
      },
      skipToNextTrack: async () => { await this.audioSystem.skipToNextTrack(); },
      pauseAllPlayers: async () => { await this.audioSystem.pauseAll(); },
      resumeAllPlayers: async () => { await this.audioSystem.resumeAll(); },
      pauseBackground: async () => { await this.audioSystem.pauseBackground(); },
      resumeBackground: async () => { await this.audioSystem.resumeBackground(); },
      previewVoice: async (args: any) => {
        const { context, event } = args || {};
        if (event?.type !== 'PREVIEW_VOICE') return;
        const voice = context?.playlist?.voices?.find((v: any) => v.id === event.voiceId);
        if (voice) {
          // Phase 1A: Gate preview at service boundary
          await this.executeWithGate(
            `preview:${event.voiceId}`,
            Priority.Preview,
            async () => {
              await this.audioSystem.previewVoice(voice.sampleUrl);
              return { success: true };
            },
            async () => {
              // Fallback: execute anyway
              await this.audioSystem.previewVoice(voice.sampleUrl);
              return { success: true };
            }
          );
        }
      },
      updateGlobalDelay: (args: any) => {
        const { context, event } = args || {};
        if (event?.type !== 'UPDATE_DELAY') return;
        if (context) context.globalDelayMs = event.delayMs;
      },
      updateUpcomingTracks: async (args: any) => {
        const { context } = args || {};
        console.log('Update upcoming tracks with new delay:', context?.globalDelayMs);
      },
      logBootstrapSuccess: () => console.log('Playlist bootstrap successful'),
      logVoiceSwitchSuccess: () => console.log('Voice switch successful'),
      logVoiceSwitchError: (args: any) => console.error('Voice switch failed:', args?.event?.data),
      resumeWithOldVoice: async () => { await this.audioSystem.resumeAffirmations(); },
      logPreviewError: (args: any) => console.error('Voice preview failed:', args?.event?.data),
    };
  }

  // Pause playback and capture current state atomically
  pauseAndSnapshot = async (): Promise<PausedState> => {
    // pauseAffirmations already returns the paused state
    return await this.audioSystem.pauseAffirmations();
  };

  // Play a preview voice sample
  playPreviewService = async (context: { event: { voiceId: VoiceId; affirmationIndex?: number }; playlist?: Playlist; context: { currentTrackIndex: number } }) => {
    return this.executeWithGate(
      'preview:voice-sample',
      Priority.Preview,
      async () => {
        const { event, playlist } = context;
        if (!playlist) throw new Error('No playlist for voice preview');
        
        console.log('🎤 Starting voice preview for:', event.voiceId);
        
        // Note: State machine handles pausing/resuming affirmations via entry/exit actions
        
        // For simplicity, always preview the first affirmation (affirmation-0) 
        // regardless of current track index
        const previewAffirmation = playlist.affirmations[0]; // Always use first affirmation for preview
        
        if (!previewAffirmation) throw new Error('No first affirmation available for preview');
        
        // Get the URL for the first affirmation in the selected voice
        let affirmationUrl = playlist.cdnUrls[event.voiceId]?.[previewAffirmation.id];
        
        // If no specific voice URL, fallback to serenity voice (which has audio files)
        if (!affirmationUrl) {
          console.warn(`No audio for voice ${event.voiceId}, using serenity voice as demo`);
          affirmationUrl = playlist.cdnUrls['serenity']?.[previewAffirmation.id];
          
          if (!affirmationUrl) {
            throw new Error(`No audio available for preview`);
          }
        }
        
        // Handle both require() modules (numbers) and string URLs
        let previewUrl: any;
        if (typeof affirmationUrl === 'number') {
          // This is a require() module - use it directly
          previewUrl = affirmationUrl;
          console.log('🎤 Playing require() module for preview');
        } else if (typeof affirmationUrl === 'string' && affirmationUrl.startsWith('tts://')) {
          // TTS placeholder - skip preview
          console.log(`🎤 Skipping preview for TTS placeholder: ${event.voiceId}`);
          return { success: true };
        } else {
          // Regular URL string
          previewUrl = affirmationUrl;
        }
        
        // Play the preview (main affirmations continue in background)
        await this.audioSystem.previewVoice(previewUrl);
        
        console.log('🎤 Voice preview completed for:', event.voiceId);
        return { success: true };
      }
    );
  };

  getMachineServices() {
    return {
      bootstrapPlaylist: this.bootstrapPlaylist,
      voiceSwitchTransaction: this.voiceSwitchTransaction,
      pauseAndSnapshot: this.pauseAndSnapshot,
      playPreviewService: this.playPreviewService,
    };
  }

  async setBackgroundVolume(volume: number) {
    console.log('🎵 AudioServices.setBackgroundVolume called with:', volume);
    await this.audioSystem.setBackgroundVolume(volume);
    console.log('✅ AudioServices.setBackgroundVolume completed');
  }

  async setAffirmationVolume(volume: number) {
    await this.audioSystem.setAffirmationVolume(volume);
  }

  async switchBackgroundTrack(soundId: string, playlist: Playlist) {
    console.log('🔄 AudioServices.switchBackgroundTrack called:', { soundId, playlistName: playlist.name });
    
    // Map sound IDs to actual background music files
    const backgroundTracks: Record<string, any> = {
      'ethereal': require('../ethereal-ambient-music-55115.mp3'),
      'atmospheric': require('../lst-atmospheric-ambient-310691.mp3'),
      // Fallback to current track for locked options
      'amazonian': playlist.backgroundTrackUrl,
      'blue-beings': playlist.backgroundTrackUrl,
    };
    
    const trackUrl = backgroundTracks[soundId];
    
    if (!trackUrl) {
      console.warn('⚠️ AudioServices: No background track found for sound ID:', soundId);
      throw new Error(`Background track not found: ${soundId}`);
    }
    
    console.log('🎵 AudioServices: Switching to background track:', { soundId, trackUrl });
    await this.audioSystem.switchBackground(trackUrl);
    console.log('✅ AudioServices.switchBackgroundTrack completed');
  }

  getAudioSystem() {
    return this.audioSystem;
  }
}