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
  backgroundTrackUrl: string;
  affirmations: Affirmation[];
  voices: Voice[];
  defaultVoiceId: VoiceId;
  cdnUrls: Record<VoiceId, Record<AffirmationId, string>>;
  manifestVersion?: string; // For cache invalidation
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

// Transaction Gate operation types
export type OperationType = 
  | 'accept'
  | 'preview'
  | 'background'
  | 'critical';

export type OperationKey =
  | 'accept:voice-switch'
  | 'preview:voice-sample'
  | 'background:volume-change'
  | 'background:track-switch'
  | 'critical:emergency-stop'
  | `accept:${string}:${number}` // Parameterized accept operations
  | `preview:${string}` // Parameterized preview operations
  | string; // Allow other parameterized keys

// Transaction gate priorities (exported from Priority enum)
export interface TransactionOperation {
  key: OperationKey;
  priority: number;
  timeoutMs?: number;
}
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