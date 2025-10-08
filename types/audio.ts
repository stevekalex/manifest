// Track Player v2 - Core Type Definitions
// Following v2 blueprint data model specifications

// Basic ID types
export type VoiceId = string;
export type AffirmationId = string;
export type PlaylistId = string;
export type BackgroundSoundId = string;

// V2 Blueprint: Server Data Model Types
export interface Affirmation {
  id: AffirmationId;
  text: string;
  language: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Voice {
  id: VoiceId;
  name: string;
  provider: string;
  style: string;
  sampleRate: number;
  bitrate: number;
  isDefault: boolean;
}

export interface AudioVariant {
  id: string;
  affirmationId: AffirmationId;
  voiceId: VoiceId;
  url: string;
  durationSec: number;
  hash: string;
  loudnessLUFS: number;
  sampleRate: number;
  bitrate: number;
  status: string;
}

export interface Playlist {
  id: PlaylistId;
  title: string;
  description?: string;
  isPublic: boolean;
  coverImageUrl?: string;
  ownerId?: string;
  // Client-side extensions
  name: string; // Alias for title for compatibility
  affirmations: Affirmation[];
  voices: Voice[];
  defaultVoiceId: VoiceId;
  backgroundTrackUrl: string | number;
  cdnUrls?: Record<VoiceId, Record<AffirmationId, string>>;
}

export interface PlaylistAffirmation {
  playlistId: PlaylistId;
  affirmationId: AffirmationId;
  order: number;
  weight?: number;
}

export interface BackgroundSound {
  id: BackgroundSoundId;
  title: string;
  type: 'loopSafe' | 'longForm';
  url: string;
  durationSec: number;
  hash: string;
  loudnessLUFS: number;
  sampleRate: number;
  bitrate: number;
  loopCrossfadeMsDefault: number;
}

export interface UserSettings {
  userId: string;
  defaultVoiceId?: VoiceId;
  backgroundSoundId: BackgroundSoundId;
  gapSeconds: number; // 1..15
  affirmVolume: number; // 0..1
  bedVolume: number; // 0..1
  shuffle: boolean;
  loop: boolean;
}

// V2 Blueprint: API Response Types
export interface SessionResolveRequest {
  playlistId: PlaylistId;
  voiceId?: VoiceId;
  shuffle?: boolean;
  avoidLastN?: number;
}

export interface SessionResolveResponse {
  items: Array<{
    affirmationId: AffirmationId;
    audioUrl: string;
    durationSec: number;
    hash: string;
    loudnessLUFS: number;
  }>;
  backgroundSound: {
    id: BackgroundSoundId;
    url: string;
    type: 'loopSafe' | 'longForm';
  };
}

// V2 Blueprint: SQLite Cache Schema Types
export interface AudioCacheEntry {
  remote_url: string;
  local_uri: string;
  file_size: number;
  last_used_at: number;
  hash?: string;
  protected: number; // 0 or 1 (SQLite boolean)
}

// Client State Types
export interface PlayerState {
  isPlaying: boolean;
  currentIndex: number;
  gapSeconds: number; // 1|2|...|15
  shuffle: boolean;
  loop: boolean;
  affirmVolume: number; // 0..1
  bedVolume: number; // 0..1
  backgroundSoundId: BackgroundSoundId;
  voiceId: VoiceId;
}

// Error handling
export class AudioError extends Error {
  constructor(
    message: string,
    public code: AudioErrorCode,
    public retryable: boolean = true
  ) {
    super(message);
  }
}

export type AudioErrorCode = 
  | 'FILE_NOT_FOUND'
  | 'AUDIO_FOCUS_LOSS'
  | 'NETWORK_ERROR'
  | 'CORRUPTED_FILE'
  | 'INSUFFICIENT_STORAGE'
  | 'PLAYBACK_ERROR'
  | 'CACHE_FULL'
  | 'URL_EXPIRED';

// Legacy compatibility types (to be removed after UI migration)
export interface PausedState {
  trackIndex: number;
  positionMs: number;
  timestamp: number;
}

// UI/Theme Types (keep for UI components)
export interface Theme {
  id: string;
  name: string;
  description?: string;
  image?: string;
  playlists: ThemePlaylist[];
  order?: number;
}

export interface ThemePlaylist {
  id: PlaylistId;
  name: string;
  description?: string;
  image_url?: string;
  created_at?: string;
}

export interface ThemesApiResponse {
  themes: Theme[];
}

export interface PlaylistSearchResult {
  id: PlaylistId;
  name: string;
  description?: string;
  coverImage?: number | { uri: string };
  listensCount?: number;
  category?: string;
}

export interface SearchOptions {
  query: string;
  includeDescription?: boolean;
  caseSensitive?: boolean;
  limit?: number;
}

export interface PlaylistSharingResult {
  success: boolean;
  error?: string;
}

export interface PlaylistSharingOptions {
  includeDescription?: boolean;
  customMessage?: string;
}

export interface DeepLinkData {
  playlistId?: string;
  path?: string;
}