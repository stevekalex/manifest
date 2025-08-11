import { AudioPlaybackService } from './audioPlaybackService';
import { Playlist, VoiceId, PausedState, OperationKey, PlaybackSnapshot } from '../types/audio';
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
    console.log('🚀 [BOOTSTRAP] Starting playlist bootstrap for:', playlist.name, 'voice:', currentVoiceId);
    
    if (!playlist) throw new Error('No playlist selected');

    // 1) Play background directly (accept require module or uri string)
    const store = useAudioStore.getState();
    console.log('🎵 [BOOTSTRAP] Step 1: Starting background music');
    console.log('🎵 [BOOTSTRAP] Background URL:', playlist.backgroundTrackUrl, 'volume:', store.backgroundVolume);
    await this.audioSystem.playBackground(playlist.backgroundTrackUrl as any, store.backgroundVolume);
    console.log('✅ [BOOTSTRAP] Background playback initiated');

    // 2) Build initial queue from local paths (no downloads)
    console.log('🎵 [BOOTSTRAP] Step 2: Building initial affirmation queue');
    // Phase 1B: Reduced from 5 to 3 for better performance with snapshot/restore system
    const INITIAL_COUNT = 3;
    const affirmations = playlist.affirmations.slice(0, INITIAL_COUNT);
    console.log('🎵 [BOOTSTRAP] Initial affirmations count:', affirmations.length);
    
    const paths = affirmations.map(a => playlist.cdnUrls[currentVoiceId][a.id]).filter(Boolean) as any[];
    console.log('🎵 [BOOTSTRAP] Resolved paths for voice', currentVoiceId, ':', paths.length, 'out of', affirmations.length);

    const tracks = this.buildTracksWithDelays(affirmations, paths, globalDelayMs);
    console.log('🎵 [BOOTSTRAP] Built tracks with delays:', tracks.length, 'globalDelayMs:', globalDelayMs);

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
  voiceSwitchTransaction = async (data: {
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
    
    return this.executeWithGate(
      `accept:${data.newVoiceId}:${data.pausedState.trackIndex}`,
      Priority.Accept,
      async () => {
        console.log('🔄 [VOICE-SWITCH] Executing main voice switch operation');
        const { newVoiceId, pausedState, playlist, globalDelayMs } = data;
        if (!playlist || !pausedState) throw new Error('Missing required data for voice switch');

        const fromIndex = pausedState.trackIndex;
        console.log('🔄 [VOICE-SWITCH] Building tracks from index:', fromIndex);
        
        const remainingAffirmations = playlist.affirmations.slice(fromIndex);
        console.log('🔄 [VOICE-SWITCH] Remaining affirmations:', remainingAffirmations.length);
        
        const paths = remainingAffirmations
          .map(a => playlist.cdnUrls[newVoiceId][a.id])
          .filter(Boolean) as string[];
        console.log('🔄 [VOICE-SWITCH] Found paths for voice:', paths.length);

        const tracks = this.buildTracksWithDelays(remainingAffirmations, paths, globalDelayMs);
        console.log('🔄 [VOICE-SWITCH] Built tracks with delays:', tracks.length);

        // TODO - consider the perofrmance of this code - would this be too blocking for what we need? Could we update a quick few tracks and then
        // create a queue of tracks to play?
        console.log('🔄 [VOICE-SWITCH] Updating upcoming tracks...');
        await this.audioSystem.updateUpcomingTracks(tracks, fromIndex);
        
        console.log('🔄 [VOICE-SWITCH] Resuming affirmations with paused state...');
        await this.audioSystem.resumeAffirmations(pausedState);

        console.log('✅ [VOICE-SWITCH] Voice switch completed successfully to:', newVoiceId);
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
      previewVoice: async (args: any) => {
        console.log('🎤 [VOICE] Preview voice action called');
        const { context, event } = args || {};
        console.log('🎤 [VOICE] Preview event details:', { 
          eventType: event?.type, 
          voiceId: event?.voiceId,
          hasPlaylist: !!context?.playlist 
        });
        
        if (event?.type !== 'PREVIEW_VOICE') return;
        const voice = context?.playlist?.voices?.find((v: any) => v.id === event.voiceId);
        
        if (voice) {
          console.log('🎤 [VOICE] Found voice for preview:', voice.id, 'sampleUrl:', voice.sampleUrl);
          
          // Phase 1B: RNTP preview with transaction gate
          await this.executeWithGate(
            `preview:${event.voiceId}`,
            Priority.Preview,
            async () => {
              console.log('🎤 [VOICE] Starting RNTP preview via transaction gate');
              // Use RNTP preview (Phase 1B) instead of Expo AV
              const success = await this.audioSystem.previewVoiceRNTP(voice.sampleUrl, 5000);
              console.log('🎤 [VOICE] RNTP preview completed, success:', success);
              return { success };
            },
            async () => {
              console.log('🎤 [VOICE] Using fallback Expo AV preview');
              // Fallback: Use legacy Expo AV preview
              await this.audioSystem.previewVoice(voice.sampleUrl);
              return { success: true };
            }
          );
        } else {
          console.warn('⚠️ [VOICE] No voice found for preview:', event.voiceId);
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
      logPreviewError: (args: any) => console.error('Voice preview failed:', args?.event?.data),
    };
  }

  // Phase 1B: Enhanced pause and snapshot for voice switching
  pauseAndSnapshot = async (): Promise<PausedState> => {
    // Legacy method for backward compatibility - still returns PausedState
    return await this.audioSystem.pauseAffirmations();
  };

  // Phase 1B: New snapshot-based pause for voice switching
  capturePlaybackSnapshot = async (): Promise<PlaybackSnapshot> => {
    console.log('📸 AudioServices: Capturing playback snapshot');
    await this.audioSystem.pauseAffirmations();
    return await this.audioSystem.captureSnapshot();
  };

  // Phase 1B: Restore from snapshot with optional new tracks
  restoreFromSnapshot = async (
    snapshot: PlaybackSnapshot, 
    newTracks?: Track[]
  ): Promise<boolean> => {
    console.log('🔄 AudioServices: Restoring from snapshot');
    return await this.audioSystem.restoreFromSnapshot(snapshot, newTracks);
  };

  // Phase 1B: Play a preview voice sample via RNTP with snapshot/restore and gate  
  playPreviewService = async (context: { event: { voiceId: VoiceId; affirmationIndex?: number }; playlist?: Playlist; context: { currentTrackIndex: number } }) => {
    const { event, playlist } = context;
    if (!playlist) throw new Error('No playlist for voice preview');
    
    console.log('🎤 Starting voice preview for:', event.voiceId);
    
    // For simplicity, always preview the first affirmation (affirmation-0) 
    const previewAffirmation = playlist.affirmations[0];
    if (!previewAffirmation) throw new Error('No first affirmation available for preview');
    
    // Get the URL for the first affirmation in the selected voice
    let affirmationUrl = playlist.cdnUrls[event.voiceId]?.[previewAffirmation.id]
      ?? playlist.cdnUrls['serenity']?.[previewAffirmation.id];
    
    if (!affirmationUrl) throw new Error('No audio available for preview');
    
    // Handle both require() modules (numbers) and string URLs
    if (typeof affirmationUrl === 'string' && affirmationUrl.startsWith('tts://')) {
      console.log(`🎤 Skipping preview for TTS placeholder: ${event.voiceId}`);
      return { success: true };
    }
    
    const previewUrl: any = affirmationUrl; // require() number or http(s) string is fine
    
    // 1) Snapshot current RNTP state
    const snapshot = await this.audioSystem.captureSnapshot();
    
    try {
      // 2) Gate + RNTP preview (5s timeout inside)
      const opKey = `preview:${event.voiceId}` as const;
      await this.executeWithGate(
        opKey,
        Priority.Preview,
        async () => { 
          await this.audioSystem.previewVoiceRNTP(previewUrl, 5000);
          return { success: true };
        },
        async () => { 
          await this.audioSystem.previewVoiceRNTP(previewUrl, 5000);
          return { success: true };
        }
      );
    } finally {
      // 3) Only restore if preview wasn't cancelled (cancel path handles its own restore)
      if (!this.audioSystem.isPreviewCancelled) {
        console.log('🔄 Restoring snapshot after preview');
        await this.audioSystem.restoreFromSnapshot(snapshot);
      } else {
        console.log('🔄 Skipping restore - preview was cancelled');
      }
    }
    
    console.log('🎤 Voice preview completed for:', event.voiceId);
    return { success: true };
  };

  // Cancel preview and restore the main queue
  cancelPreviewAndRestore = async () => {
    console.log('🔄 [RESTORE] cancelPreviewAndRestore service starting');
    
    // Check if there's actually a snapshot to restore (meaning preview was active)
    const hasSnapshot = this.audioSystem.hasSnapshotForRestore();
    console.log('🔄 [RESTORE] Has snapshot to restore:', hasSnapshot);
    
    if (hasSnapshot) {
      console.log('🛑 [RESTORE] Step 1: Stopping RNTP preview...');
      await this.audioSystem.stopRNTPPreview();
      console.log('✅ [RESTORE] RNTP preview stopped');
      
      console.log('🔄 [RESTORE] Step 2: Restoring last snapshot...');
      await this.audioSystem.restoreLastSnapshot();
      console.log('✅ [RESTORE] Last snapshot restored');
    } else {
      console.log('ℹ️ [RESTORE] No preview was active, skipping restoration');
    }
    
    console.log('🎉 [RESTORE] cancelPreviewAndRestore service completed successfully');
    return { cancelled: true };
  }

  getMachineServices() {
    return {
      bootstrapPlaylist: this.bootstrapPlaylist,
      voiceSwitchTransaction: this.voiceSwitchTransaction,
      pauseAndSnapshot: this.pauseAndSnapshot,
      playPreviewService: this.playPreviewService,
      // Phase 1B: New snapshot-based services
      capturePlaybackSnapshot: this.capturePlaybackSnapshot,
      restoreFromSnapshot: this.restoreFromSnapshot,
      cancelPreviewAndRestore: this.cancelPreviewAndRestore,
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