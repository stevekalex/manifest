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
  backgroundTrackUrl: require('../ethereal-ambient-music-55115.mp3'),
  
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
  
  // CDN URLs for TTS system (using special tts:// protocol for now)
  cdnUrls: {
    'serenity': {
      'affirmation-0': require('../assets/voices/serenity/0-hq.mp3') as any,
      'affirmation-1': require('../assets/voices/serenity/1-hq.mp3') as any,
      'affirmation-2': require('../assets/voices/serenity/2-hq.mp3') as any,
      'affirmation-3': 'tts://serenity/affirmation-3',
      'affirmation-4': 'tts://serenity/affirmation-4',
      'affirmation-5': 'tts://serenity/affirmation-5',
      'affirmation-6': 'tts://serenity/affirmation-6',
      'affirmation-7': 'tts://serenity/affirmation-7',
      'affirmation-8': 'tts://serenity/affirmation-8',
      'affirmation-9': 'tts://serenity/affirmation-9',
    },
    'titan': {
      'affirmation-0': require('../assets/voices/titan/0-hq.mp3') as any,
      'affirmation-1': require('../assets/voices/titan/1-hq.mp3') as any,
      'affirmation-2': require('../assets/voices/titan/2-hq.mp3') as any,
      'affirmation-3': 'tts://titan/affirmation-3',
      'affirmation-4': 'tts://titan/affirmation-4',
      'affirmation-5': 'tts://titan/affirmation-5',
      'affirmation-6': 'tts://titan/affirmation-6',
      'affirmation-7': 'tts://titan/affirmation-7',
      'affirmation-8': 'tts://titan/affirmation-8',
      'affirmation-9': 'tts://titan/affirmation-9',
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
  ],

  // Manifest versioning for future cache invalidation
  manifestVersion: '1.0.0',
};