import type { Playlist } from '../types/audio';

// Base template for health & wellness playlists - all use same audio files but different themes
const createHealthPlaylist = (
  id: string,
  name: string,
  description: string,
  listensCount: number
): Playlist => ({
  id,
  name,
  description,
  backgroundTrackUrl: require('../assets/audio/background/ethereal.mp3'),
  defaultVoiceId: 'serenity',
  voices: [
    {
      id: 'serenity',
      name: 'Serenity',
      gender: 'female',
      locale: 'en-US',
      sampleUrl: 'tts://preview/serenity'
    },
    {
      id: 'titan',
      name: 'Titan',
      gender: 'male',
      locale: 'en-US',
      sampleUrl: 'tts://preview/titan'
    }
  ],
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
    }
  },
  affirmations: [
    {
      id: 'affirmation-0',
      text: 'My body is healthy, strong, and full of vitality',
      order: 0,
      durationMs: 5000,
    },
    {
      id: 'affirmation-1', 
      text: 'I nourish my body with healthy choices and self-care',
      order: 1,
      durationMs: 6000,
    },
    {
      id: 'affirmation-2',
      text: 'Every cell in my body radiates perfect health',
      order: 2,
      durationMs: 5500,
    },
    {
      id: 'affirmation-3',
      text: 'I am grateful for my body and treat it with respect',
      order: 3,
      durationMs: 5000,
    },
    {
      id: 'affirmation-4',
      text: 'My mind is calm and my stress melts away',
      order: 4,
      durationMs: 5500,
    },
    {
      id: 'affirmation-5',
      text: 'I sleep peacefully and wake up refreshed',
      order: 5,
      durationMs: 4500,
    },
    {
      id: 'affirmation-6',
      text: 'I have abundant energy for all I wish to accomplish',
      order: 6,
      durationMs: 5000,
    },
    {
      id: 'affirmation-7',
      text: 'My immune system is strong and protects me',
      order: 7,
      durationMs: 6000,
    },
    {
      id: 'affirmation-8',
      text: 'I choose thoughts that support my wellbeing',
      order: 8,
      durationMs: 5000,
    },
    {
      id: 'affirmation-9',
      text: 'I am in perfect harmony with my body and mind',
      order: 9,
      durationMs: 4500,
    },
  ],
});

export const HEALTH_WELLNESS_PLAYLISTS: Playlist[] = [
  createHealthPlaylist(
    'perfect-health',
    'Perfect Health & Vitality',
    'Program your mind for optimal health and vibrant energy throughout your body',
    89000
  ),
  createHealthPlaylist(
    'weight-loss-mindset',
    'Healthy Weight & Body Love',
    'Transform your relationship with food and embrace your ideal healthy body',
    73000
  ),
  createHealthPlaylist(
    'healing-recovery',
    'Healing & Recovery',
    'Support your body\'s natural healing process and accelerate recovery',
    61000
  ),
  createHealthPlaylist(
    'energy-vitality',
    'Energy & Vitality Boost',
    'Increase your natural energy levels and feel more vibrant every day',
    55000
  ),
  createHealthPlaylist(
    'immune-system',
    'Strong Immune System',
    'Strengthen your body\'s natural defenses and maintain optimal health',
    47000
  ),
  createHealthPlaylist(
    'pain-relief',
    'Pain Relief & Comfort',
    'Reduce physical discomfort and promote healing through positive mindset',
    39000
  ),
  createHealthPlaylist(
    'addiction-freedom',
    'Freedom from Habits',
    'Break free from unwanted habits and create healthy lifestyle patterns',
    33000
  ),
];