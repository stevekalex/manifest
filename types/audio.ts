export type VoiceId = 'serenity' | 'titan' | 'whisper' | 'sage' | 'aurora' | 'thunder' | 'crystal' | 'mystic' | 'harmony' | 'echo';

export type PlayerState = 'idle' | 'playing' | 'selecting_voice' | 'error_recovery';

export type BackgroundState = 'active' | 'error';
export type AffirmationState = 'active' | 'paused' | 'error';

export interface Affirmation {
  id: string;
  text: string;
  index: number;
}

export interface Playlist {
  id: string;
  title: string;
  backgroundTrackUrl: string;
  affirmations: Affirmation[];
}

export interface AudioAsset {
  affirmationId: string;
  voiceId: VoiceId;
  cdnUrl?: string;
  localPath?: string;
  checksum?: string;
  fileSize?: number;
  duration?: number;
}

export interface AudioSystemContext {
  currentVoiceId: VoiceId;
  currentTrackIndex: number;
  modalOpen: boolean;
  errorCounts: Record<string, number>;
  playlist?: Playlist;
}

export interface AudioSystemState {
  playerState: PlayerState;
  currentVoiceId: VoiceId;
  currentTrackIndex: number;
  modalOpen: boolean;
  isPlaying: boolean;
  backgroundPlaying: boolean;
  affirmationsPlaying: boolean;
  error?: string;
}

export interface AudioSystemEvents {
  START_PLAYBACK: { playlist: Playlist; voiceId: VoiceId };
  PAUSE_PLAYBACK: Record<string, never>;
  RESUME_PLAYBACK: Record<string, never>;
  STOP_PLAYBACK: Record<string, never>;
  OPEN_VOICE_MODAL: Record<string, never>;
  CLOSE_VOICE_MODAL: Record<string, never>;
  SET_VOICE: { voiceId: VoiceId };
  PLAYER_ERROR: { playerType: 'background' | 'affirmations'; error: Error };
  RETRY: Record<string, never>;
  SKIP: Record<string, never>;
  NEXT_TRACK: Record<string, never>;
  PREV_TRACK: Record<string, never>;
}

export interface PlayerInstance {
  setupPlayer(): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  setVolume(volume: number): Promise<void>;
  getStatus(): Promise<any>;
  unload(): Promise<void>;
}

export interface AudioSystemInterface {
  // Playback control
  playPlaylist(playlist: Playlist, voiceId: VoiceId): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  
  // Voice management
  openVoiceModal(): void;
  closeVoiceModal(): void;
  previewVoice(voiceId: VoiceId, affirmationIndex?: number): Promise<void>;
  setVoice(voiceId: VoiceId): Promise<void>;
  
  // State access
  getState(): AudioSystemState;
  subscribe(listener: (state: AudioSystemState) => void): () => void;
  
  // Cleanup
  destroy(): Promise<void>;
}

// Voice configuration from existing system
export interface VoiceConfig {
  id: VoiceId;
  name: string;
  gender: 'male' | 'female';
  locked: boolean;
  // For CDN phase - will map to file paths
  hqPath?: string;
  previewPath?: string;
}

export const VOICE_CONFIGS: VoiceConfig[] = [
  { id: 'serenity', name: 'Serenity', gender: 'female', locked: false },
  { id: 'titan', name: 'Titan', gender: 'male', locked: false },
  { id: 'whisper', name: 'Whisper', gender: 'female', locked: false },
  { id: 'sage', name: 'Sage', gender: 'male', locked: false },
  { id: 'aurora', name: 'Aurora', gender: 'female', locked: true },
  { id: 'thunder', name: 'Thunder', gender: 'male', locked: true },
  { id: 'crystal', name: 'Crystal', gender: 'female', locked: true },
  { id: 'mystic', name: 'Mystic', gender: 'male', locked: true },
  { id: 'harmony', name: 'Harmony', gender: 'female', locked: true },
  { id: 'echo', name: 'Echo', gender: 'male', locked: true },
];

// Helper functions
export const getVoiceConfig = (voiceId: VoiceId): VoiceConfig => {
  return VOICE_CONFIGS.find(config => config.id === voiceId) || VOICE_CONFIGS[0];
};

export const getVoiceAssetPath = (voiceId: VoiceId, affirmationIndex: number, quality: 'hq' | 'preview' = 'hq'): string => {
  return `assets/voices/${voiceId}/${affirmationIndex}-${quality}.mp3`;
};