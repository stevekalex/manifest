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
  // IMPORTANT: These must be direct requires for React Native Track Player
  // The TTS URLs are resolved by our CDN system when using URLResolver
  cdnUrls: {
    'serenity': {
      'affirmation-0': require('../assets/voices/serenity/0-hq.mp3'),
      'affirmation-1': require('../assets/voices/serenity/1-hq.mp3'),
      'affirmation-2': require('../assets/voices/serenity/2-hq.mp3'),
      'affirmation-3': require('../assets/voices/serenity/3-hq.mp3'),
      'affirmation-4': require('../assets/voices/serenity/4-hq.mp3'),
      'affirmation-5': require('../assets/voices/serenity/5-hq.mp3'),
      'affirmation-6': require('../assets/voices/serenity/6-hq.mp3'),
      'affirmation-7': require('../assets/voices/serenity/7-hq.mp3'),
      'affirmation-8': require('../assets/voices/serenity/8-hq.mp3'),
      'affirmation-9': require('../assets/voices/serenity/9-hq.mp3'),
      'affirmation-10': require('../assets/voices/serenity/10-hq.mp3'),
      'affirmation-11': require('../assets/voices/serenity/11-hq.mp3'),
      'affirmation-12': require('../assets/voices/serenity/12-hq.mp3'),
      'affirmation-13': require('../assets/voices/serenity/13-hq.mp3'),
      'affirmation-14': require('../assets/voices/serenity/14-hq.mp3'),
    },
    'titan': {
      'affirmation-0': require('../assets/voices/titan/0-hq.mp3'),
      'affirmation-1': require('../assets/voices/titan/1-hq.mp3'),
      'affirmation-2': require('../assets/voices/titan/2-hq.mp3'),
      'affirmation-3': require('../assets/voices/titan/3-hq.mp3'),
      'affirmation-4': require('../assets/voices/titan/4-hq.mp3'),
      'affirmation-5': require('../assets/voices/titan/5-hq.mp3'),
      'affirmation-6': require('../assets/voices/titan/6-hq.mp3'),
      'affirmation-7': require('../assets/voices/titan/7-hq.mp3'),
      'affirmation-8': require('../assets/voices/titan/8-hq.mp3'),
      'affirmation-9': require('../assets/voices/titan/9-hq.mp3'),
      'affirmation-10': require('../assets/voices/titan/10-hq.mp3'),
      'affirmation-11': require('../assets/voices/titan/11-hq.mp3'),
      'affirmation-12': require('../assets/voices/titan/12-hq.mp3'),
      'affirmation-13': require('../assets/voices/titan/13-hq.mp3'),
      'affirmation-14': require('../assets/voices/titan/14-hq.mp3'),
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