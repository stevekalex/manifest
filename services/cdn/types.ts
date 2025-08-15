import type { VoiceId, AffirmationId } from '../../types/audio';

/**
 * CDN Client Types
 * 
 * Defines interfaces for a swappable CDN client system that can work with
 * both local bundled assets and remote CDN resources.
 */

// Canonical track identifier: voiceId:affirmationId
export type CanonicalTrackId = `${VoiceId}:${AffirmationId}`;

export interface CDNTrack {
  id: CanonicalTrackId;
  file: string;
  bundledPath?: string; // For local assets, path to require()
  durationMs?: number;
  fileSize?: number;
  note?: string; // For documentation (e.g., "Fallback to affirmation-0")
}

export interface CDNVoice {
  id: VoiceId;
  name: string;
  tracks: CDNTrack[];
}

export interface CDNManifest {
  version: string;
  updatedAt: string;
  voices: CDNVoice[];
}

export interface CDNStats {
  manifestLoaded: boolean;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cacheHits?: number;
  cacheMisses?: number;
  lastError?: string;
  lastRequestTime?: number;
}

/**
 * CDN Client Interface
 * 
 * Provides a unified interface for accessing audio tracks from different sources
 * (local bundled assets, remote CDN, cached files, etc.)
 */
export interface ICDNClient {
  /**
   * Load the CDN manifest (voices and available tracks)
   * Should be called once and cached
   */
  loadManifest(): Promise<CDNManifest>;

  /**
   * Get a playable URL/path for a track
   * @param trackId Canonical track ID (voiceId:affirmationId)
   * @returns Playable URL string or require() module number
   */
  getPlayableUrl(trackId: CanonicalTrackId): Promise<string | number>;

  /**
   * Check if a track is available without loading it
   * @param trackId Canonical track ID
   * @returns True if track exists in manifest
   */
  isAvailable(trackId: CanonicalTrackId): boolean;

  /**
   * Prefetch tracks for better performance (no-op for local client)
   * @param trackIds Array of track IDs to prefetch
   */
  prefetch(trackIds: CanonicalTrackId[]): Promise<void>;

  /**
   * Get client statistics and performance metrics
   */
  getStats(): CDNStats;

  /**
   * Clear any cached data and reset client state
   */
  reset(): void;
}

// Client configuration options
export interface CDNClientConfig {
  manifestPath?: string;
  enableCache?: boolean;
  cacheMaxSize?: number;
  requestTimeout?: number;
  retryAttempts?: number;
}

// Error types for better error handling
export class CDNError extends Error {
  constructor(
    message: string,
    public code: string,
    public trackId?: CanonicalTrackId
  ) {
    super(message);
    this.name = 'CDNError';
  }
}

export class ManifestError extends CDNError {
  constructor(message: string, cause?: Error) {
    super(message, 'MANIFEST_ERROR');
    this.cause = cause;
  }
}

export class TrackNotFoundError extends CDNError {
  constructor(trackId: CanonicalTrackId) {
    super(`Track not found: ${trackId}`, 'TRACK_NOT_FOUND', trackId);
  }
}