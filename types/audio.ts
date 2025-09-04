// Core type definitions
export type VoiceId = string;
export type AffirmationId = string;
export type PlaylistId = string;


export interface Voice {
  id: VoiceId;
  name: string;
  gender?: string;
  locale?: string;
  sampleUrl: string;
}


export interface AudioAsset {
  affirmationId: AffirmationId | 'background';
  voiceId: VoiceId | 'background';
  cdnUrl: string;
  checksum?: string;
  fileSize?: number;
  duration?: number;
}

export interface PausedState {
  trackIndex: number;
  positionMs: number;
  timestamp: number;
}

export type PlayerState = 'idle' | 'buffering' | 'playing' | 'paused' | 'stopped';

// Delay steps in milliseconds
export const DELAY_STEPS = [0, 250, 500, 750, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000];

// Add manifest versioning and better error types
export interface Playlist {
  id: PlaylistId;
  name: string;
  description?: string;
  backgroundTrackUrl: string | number;
  backgroundTracks?: Record<string, string>; // Optional custom background tracks mapping
  affirmations: Affirmation[];
  voices: Voice[];
  defaultVoiceId: VoiceId;
  cdnUrls: Record<VoiceId, Record<AffirmationId, string>>;
  manifestVersion?: string; // For cache invalidation
  // Playlist screen specific properties
  coverImage?: any; // Image source (require() or URI)
  listensCount?: number; // Number of times playlist has been played
}

export interface Affirmation {
  id: AffirmationId;
  text: string;
  order: number;
  durationMs: number; // Make required - we'll measure on first play if not provided
}

// Typed errors for better retry logic
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
  | 'PLAYBACK_ERROR';

// Transaction gate types removed - functionality no longer needed
// Phase 1B: Snapshot system for RNTP state preservation
export interface PlaybackSnapshot {
  // Logical queue representation
  affirmationIds: AffirmationId[];
  
  // Current playback position
  currentIndex: number;
  positionMs: number;
  
  // Playback state before snapshot
  wasPlaying: boolean;
  
  // Hash of first N tracks for fast-path detection
  headHash: string;
  
  // Metadata for validation
  timestamp: number;
  voiceId: VoiceId;
  playlistId: PlaylistId;
}

// Helper type for snapshot validation results
export interface SnapshotValidation {
  isValid: boolean;
  canUseFastPath: boolean;
  reason?: string;
}

// Theme system for organizing playlists on home page
export interface Theme {
  id: string;
  name: string;
  description?: string;
  image?: string; // Theme image URL
  playlists: ThemePlaylist[];
  order?: number; // Optional for API responses
}

export interface ThemePlaylist {
  id: PlaylistId;
  name: string;
  description?: string;
  image_url?: string; // URL or local image reference (matches backend format)
  created_at?: string; // ISO timestamp from backend
}

// Backend API response types
export interface ThemesApiResponse {
  themes: Theme[];
}

// Search-optimized playlist metadata (lightweight for client-side filtering)
export interface PlaylistSearchResult {
  id: PlaylistId;
  name: string;
  description?: string;
  coverImage?: any;
  listensCount?: number;
  category?: string;
}

// Search functionality types
export interface SearchOptions {
  query: string;
  includeDescription?: boolean;
  caseSensitive?: boolean;
  limit?: number;
}