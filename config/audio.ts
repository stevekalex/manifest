/**
 * Audio Configuration Constants
 * 
 * Centralized configuration for all audio-related settings including:
 * - Track loading and prefetching parameters
 * - Volume defaults
 * - Timing delays
 * - Voice settings
 * - Player behavior
 */

export const AUDIO_CONFIG = {
  // Track Loading Configuration
  INITIAL_TRACK_COUNT: 3,                // Phase 1B: Reduced from 5 to 3 for better performance
  PREFETCH_TRACK_COUNT: 3,               // Reduced for testing (was 12)
  EXPANSION_PREFETCH_COUNT: 3,           // Reduced for testing (was 8)
  
  // Timing Configuration
  PREFETCH_DELAY_MS: 2000,               // Delay before starting prefetch operations
  EXPANSION_DELAY_MS: 1500,              // Delay before queue expansion prefetching
  DEFAULT_DELAY_MS: 3000,                // Default global delay between affirmations
  
  // Volume Configuration  
  DEFAULT_BACKGROUND_VOLUME: 0.7,        // Default background music volume (0.0 - 1.0)
  DEFAULT_AFFIRMATION_VOLUME: 1.0,       // Default affirmation/TTS volume (0.0 - 1.0)
  
  // Voice Configuration
  DEFAULT_VOICE: 'rachel' as const,   // Default voice for TTS generation
  
  // System Configuration
  DEFAULT_ARTIST_NAME: 'Manifestation App',
  INSTANCE_ID_LENGTH: 7,                 // Length of coordinator instance IDs
  
  // Critical States (where event suppression is required)
  CRITICAL_STATES: [
    'preparing',
    'loading',
    'buffering',
  ] as const,
} as const;

// Type exports for better TypeScript integration
export type VoiceId = typeof AUDIO_CONFIG.DEFAULT_VOICE | 'serenity' | 'titan';
export type CriticalState = typeof AUDIO_CONFIG.CRITICAL_STATES[number];