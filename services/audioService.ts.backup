import { AudioPlaybackService } from './audioPlaybackService';
import { Playlist, VoiceId, PausedState, PlaybackSnapshot } from '../types/audio';
import { Track } from 'react-native-track-player';
import { useAudioStore } from '../store/audioStore';
import { URLResolver } from './urlResolver';
import { BundledAssets } from './bundledAssets';

// Constants
const INITIAL_TRACK_COUNT = 3; // Phase 1B: Reduced from 5 to 3 for better performance

// Background track mappings
type BackgroundTrackMap = Record<string, any>;
const BACKGROUND_TRACKS: BackgroundTrackMap = {
  'ethereal': require('../ethereal-ambient-music-55115.mp3'),
  'atmospheric': require('../lst-atmospheric-ambient-310691.mp3'),
};

export class AudioServices {
  private audioSystem: AudioPlaybackService;
  private urlResolver: URLResolver;
  
  constructor() {
    this.audioSystem = new AudioPlaybackService();
    
    // Initialize URL resolver with bundled assets
    const bundledAssets = new BundledAssets();
    this.urlResolver = new URLResolver(bundledAssets);
    
    console.log('🔧 [AUDIO-SERVICES] Initialized with URL resolver');
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

    // 2) Build initial queue with URL resolution
    console.log('🎵 [BOOTSTRAP] Step 2: Building initial affirmation queue');
    const affirmations = playlist.affirmations.slice(0, INITIAL_TRACK_COUNT);
    console.log('🎵 [BOOTSTRAP] Initial affirmations count:', affirmations.length);
    
    // Use URL resolver to handle TTS placeholders and mixed URL types
    const resolvedUrls = this.resolveAffirmationUrls(affirmations, playlist, currentVoiceId, 'BOOTSTRAP');
    
    console.log('🎵 [BOOTSTRAP] Resolved URLs for voice', currentVoiceId, ':', resolvedUrls.length, 'out of', affirmations.length);

    const tracks = this.buildTracksWithResolvedUrls(affirmations, resolvedUrls, globalDelayMs);
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
    
    console.log('🔄 [VOICE-SWITCH] Executing main voice switch operation');
    const { newVoiceId, pausedState, playlist, globalDelayMs } = data;
    if (!playlist || !pausedState) throw new Error('Missing required data for voice switch');

    const fromIndex = pausedState.trackIndex;
    console.log('🔄 [VOICE-SWITCH] Building tracks from index:', fromIndex);
    
    const remainingAffirmations = playlist.affirmations.slice(fromIndex);
    console.log('🔄 [VOICE-SWITCH] Remaining affirmations:', remainingAffirmations.length);
    
    // Use URL resolver for voice switching
    const resolvedUrls = this.resolveAffirmationUrls(remainingAffirmations, playlist, newVoiceId, 'VOICE-SWITCH');
    
    console.log('🔄 [VOICE-SWITCH] Resolved URLs for voice:', resolvedUrls.length);

    const tracks = this.buildTracksWithResolvedUrls(remainingAffirmations, resolvedUrls, globalDelayMs);
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
        return this.urlResolver.resolve(playlist, affirmation.id, voiceId);
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
   * @param globalDelayMs Global delay between tracks
   * @returns Array of Track objects ready for RNTP
   */
  private buildTracksWithResolvedUrls(
    affirmations: { id: string; text?: string }[], 
    resolvedUrls: string[], 
    globalDelayMs: number
  ): Track[] {
    const tracks: Track[] = [];

    // Ensure we have matching arrays
    const minLength = Math.min(affirmations.length, resolvedUrls.length);
    
    for (let index = 0; index < minLength; index++) {
      const affirmation = affirmations[index];
      const url = resolvedUrls[index];
      
      // URLs should already be validated by resolver, but double-check
      if (!this.urlResolver.isPlayable(url)) {
        console.error(`❌ [TRACK-BUILD] URL not playable: ${url} for ${affirmation.id}`);
        continue;
      }

      tracks.push({
        id: affirmation.id,
        url: url as any,
        title: affirmation.text || `Affirmation ${index + 1}`,
        artist: 'Manifestation App',
      });

      // Delay insertion disabled until silence assets are bundled or a timer-based gap is implemented
    }

    console.log(`🎵 [TRACK-BUILD] Built ${tracks.length} tracks from ${affirmations.length} affirmations`);
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



  getMachineServices() {
    return {
      bootstrapPlaylist: this.bootstrapPlaylist,
      voiceSwitchTransaction: this.voiceSwitchTransaction,
      pauseAndSnapshot: this.pauseAndSnapshot,
      // Phase 1B: New snapshot-based services
      capturePlaybackSnapshot: this.capturePlaybackSnapshot,
      restoreFromSnapshot: this.restoreFromSnapshot,
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
    
    // Get track URL from available tracks or fallback to current playlist track
    const trackUrl = BACKGROUND_TRACKS[soundId] || playlist.backgroundTrackUrl;
    
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