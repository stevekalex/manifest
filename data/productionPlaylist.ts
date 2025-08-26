import type { Playlist } from '../types/audio';

/**
 * Production playlist that exactly mirrors the current useSimpleTTS affirmations
 * This ensures zero change to user experience during migration
 */
export const PRODUCTION_PLAYLIST: Playlist = {
  id: 'production-affirmations',
  name: 'Daily Affirmations',
  description: 'Powerful affirmations for manifestation and abundance',
  
  // Use the current background music file
  backgroundTrackUrl: require('../assets/audio/background/ethereal.mp3'),
  
  // Default voice matches current system
  defaultVoiceId: 'serenity',
  
  // Voice definitions matching current TTS system exactly
  voices: [
    {
      id: 'serenity',
      name: 'Serenity',
      gender: 'female',
      locale: 'en-US',
      sampleUrl: 'tts://preview/serenity', // TTS preview identifier
    },
    {
      id: 'titan',
      name: 'Titan',
      gender: 'male', 
      locale: 'en-US',
      sampleUrl: 'tts://preview/titan',
    },
    {
      id: 'whisper',
      name: 'Whisper',
      gender: 'female',
      locale: 'en-US', 
      sampleUrl: 'tts://preview/whisper',
    },
    {
      id: 'sage',
      name: 'Sage',
      gender: 'male',
      locale: 'en-US',
      sampleUrl: 'tts://preview/sage',
    },
    {
      id: 'aurora',
      name: 'Aurora',
      gender: 'female',
      locale: 'en-US',
      sampleUrl: 'tts://preview/aurora',
    },
    {
      id: 'thunder',
      name: 'Thunder', 
      gender: 'male',
      locale: 'en-US',
      sampleUrl: 'tts://preview/thunder',
    },
    {
      id: 'crystal',
      name: 'Crystal',
      gender: 'female',
      locale: 'en-US',
      sampleUrl: 'tts://preview/crystal',
    },
    {
      id: 'mystic',
      name: 'Mystic',
      gender: 'male',
      locale: 'en-US',
      sampleUrl: 'tts://preview/mystic',
    },
    {
      id: 'harmony',
      name: 'Harmony',
      gender: 'female',
      locale: 'en-US',
      sampleUrl: 'tts://preview/harmony',
    }
  ],
  
  // CDN URLs for TTS system
  // IMPORTANT: TTS placeholders are resolved by URLResolver to CDN or live TTS generation
  // Fallback chain: CDN -> TTS generation (no more bundled assets)
  cdnUrls: {
    'serenity': {
      'affirmation-0': 'tts://serenity/affirmation-0',
      'affirmation-1': 'tts://serenity/affirmation-1',
      'affirmation-2': 'tts://serenity/affirmation-2',
      'affirmation-3': 'tts://serenity/affirmation-3',
      'affirmation-4': 'tts://serenity/affirmation-4',
      'affirmation-5': 'tts://serenity/affirmation-5',
      'affirmation-6': 'tts://serenity/affirmation-6',
      'affirmation-7': 'tts://serenity/affirmation-7',
      'affirmation-8': 'tts://serenity/affirmation-8',
      'affirmation-9': 'tts://serenity/affirmation-9',
      'affirmation-10': 'tts://serenity/affirmation-10',
      'affirmation-11': 'tts://serenity/affirmation-11',
      'affirmation-12': 'tts://serenity/affirmation-12',
      'affirmation-13': 'tts://serenity/affirmation-13',
      'affirmation-14': 'tts://serenity/affirmation-14',
    },
    'titan': {
      'affirmation-0': 'tts://titan/affirmation-0',
      'affirmation-1': 'tts://titan/affirmation-1',
      'affirmation-2': 'tts://titan/affirmation-2',
      'affirmation-3': 'tts://titan/affirmation-3',
      'affirmation-4': 'tts://titan/affirmation-4',
      'affirmation-5': 'tts://titan/affirmation-5',
      'affirmation-6': 'tts://titan/affirmation-6',
      'affirmation-7': 'tts://titan/affirmation-7',
      'affirmation-8': 'tts://titan/affirmation-8',
      'affirmation-9': 'tts://titan/affirmation-9',
      'affirmation-10': 'tts://titan/affirmation-10',
      'affirmation-11': 'tts://titan/affirmation-11',
      'affirmation-12': 'tts://titan/affirmation-12',
      'affirmation-13': 'tts://titan/affirmation-13',
      'affirmation-14': 'tts://titan/affirmation-14',
    },
    // Additional voices can be added as needed
  },
  
  // Exact affirmations from useSimpleTTS (in same order)
  affirmations: [
    {
      id: 'affirmation-0',
      text: 'I allow myself to be who I am meant to be',
      order: 0,
      durationMs: 5000, // Estimated based on TTS speed
    },
    {
      id: 'affirmation-1',
      text: 'I am worthy of all the abundance the universe has to offer',
      order: 1,
      durationMs: 6000,
    },
    {
      id: 'affirmation-2',
      text: 'Success flows to me effortlessly and naturally',
      order: 2,
      durationMs: 5500,
    },
    {
      id: 'affirmation-3',
      text: 'I attract positive opportunities into my life',
      order: 3,
      durationMs: 5000,
    },
    {
      id: 'affirmation-4',
      text: 'I am confident in my ability to achieve my dreams',
      order: 4,
      durationMs: 5500,
    },
    {
      id: 'affirmation-5',
      text: 'Money comes to me easily and frequently',
      order: 5,
      durationMs: 4500,
    },
    {
      id: 'affirmation-6',
      text: 'I am grateful for all the blessings in my life',
      order: 6,
      durationMs: 5000,
    },
    {
      id: 'affirmation-7',
      text: 'I radiate positive energy and attract positive people',
      order: 7,
      durationMs: 6000,
    },
    {
      id: 'affirmation-8',
      text: 'My mind is focused on success and prosperity',
      order: 8,
      durationMs: 5000,
    },
    {
      id: 'affirmation-9',
      text: 'Every day, I am becoming more successful',
      order: 9,
      durationMs: 4500,
    },
    {
      id: 'affirmation-10',
      text: 'I trust in the perfect timing of my life',
      order: 10,
      durationMs: 5000,
    },
    {
      id: 'affirmation-11',
      text: 'I am deserving of love, happiness, and fulfillment',
      order: 11,
      durationMs: 5500,
    },
    {
      id: 'affirmation-12',
      text: 'My potential is unlimited and I embrace it fully',
      order: 12,
      durationMs: 5500,
    },
    {
      id: 'affirmation-13',
      text: 'I release all fears and step into my power',
      order: 13,
      durationMs: 5000,
    },
    {
      id: 'affirmation-14',
      text: 'I create my reality with intention and purpose',
      order: 14,
      durationMs: 5500,
    },
  ],

  // Manifest versioning for future cache invalidation
  manifestVersion: '1.0.0',
};