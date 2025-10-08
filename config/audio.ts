/**
 * Audio Configuration Constants - Track Player v2
 * 
 * Configuration following the v2 blueprint specifications:
 * - Gap-based timing with explicit silence tracks
 * - RNTP for affirmations + Expo AV for background beds
 * - SQLite caching with size limits
 * - Instant voice switching capability
 */

export const AUDIO_CONFIG = {
  // V2 Blueprint: Queue Management
  GAP_SECONDS_MIN: 1,
  GAP_SECONDS_MAX: 15,
  GAP_SECONDS_DEFAULT: 5,
  AVOID_REPEAT_WINDOW: 8,                   // Shuffle avoid-repeat window
  
  // V2 Blueprint: Prefetch Configuration  
  PREFETCH_TRACK_COUNT: 8,                  // "Next 8 affirmations or ~180s"
  PREFETCH_CONCURRENCY: 4,                  // "concurrency = 4"
  PREFETCH_TIME_THRESHOLD_SEC: 180,         // ~180 seconds worth of content
  
  // V2 Blueprint: Cache Limits (SQLite)
  CACHE_SIZE_BEDS_MB: 100,                  // "Beds ≈ 100 MB"
  CACHE_SIZE_AFFIRMATIONS_MB: 350,          // "Affirmations ≈ 350 MB"
  CACHE_PROTECTION_NEXT_TRACKS: 3,          // "protect current bed + next 3 affirmations"
  
  // V2 Blueprint: Audio Standards
  LUFS_AFFIRMATIONS: -16,                   // "−16 LUFS"
  LUFS_BEDS: -24,                          // "≈ −24 LUFS"
  SAMPLE_RATE: 44100,                      // "44.1 kHz"
  BITRATE_AFFIRMATIONS: 128,               // "96–128 kbps"
  BITRATE_BEDS: 96,                        // "~96 kbps"
  
  // V2 Blueprint: Timing & Behavior
  BREATHE_OVERLAY_DURATION_MS: 3000,       // "3s 'Breathe' overlay"
  CROSSFADE_DURATION_MS: 400,              // "400ms crossfade"
  FAILURE_TIMEOUT_MS: 3000,                // "1 load >3s → skip"
  CONSECUTIVE_FAILURE_LIMIT: 3,            // "3 consecutive failures → pause"
  VOICE_SWITCH_DEBOUNCE_MS: 200,           // "150–250ms debounce"
  
  // V2 Blueprint: Volume Defaults
  DEFAULT_AFFIRMATION_VOLUME: 1.0,         // No ducking in v2
  DEFAULT_BED_VOLUME: 1.0,
  
  // V2 Blueprint: Voice Configuration
  DEFAULT_VOICE: 'charlotte' as const,
  
  // V2 Blueprint: CDN & URLs
  SIGNED_URL_TTL_HOURS: 3,                 // "TTL ≥ 2–4h"
  
  // System Configuration
  DEFAULT_ARTIST_NAME: 'Manifestation App',
  INSTANCE_ID_LENGTH: 7,
} as const;

// V2 Blueprint: Voice types (to be expanded with server data)
export type VoiceId = typeof AUDIO_CONFIG.DEFAULT_VOICE | 'serenity' | 'titan';

// V2 Blueprint: Session item types for voice-agnostic planning
export type SessionItemKind = 'affirmation' | 'gap';

export interface SessionItem {
  kind: SessionItemKind;
  affirmationId?: string;  // Only for affirmation items
  seconds?: number;        // Only for gap items
}

export interface SessionPlan {
  items: SessionItem[];
  avoidRepeatWindow: number;
}