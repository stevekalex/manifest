import type { Playlist } from '../types/audio';

// Base template for relationship playlists - all use same audio files but different themes
const createRelationshipPlaylist = (
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
      text: 'I attract loving and supportive relationships into my life',
      order: 0,
      durationMs: 5000,
    },
    {
      id: 'affirmation-1', 
      text: 'I am worthy of deep love and meaningful connections',
      order: 1,
      durationMs: 6000,
    },
    {
      id: 'affirmation-2',
      text: 'I communicate with kindness and understanding',
      order: 2,
      durationMs: 5500,
    },
    {
      id: 'affirmation-3',
      text: 'My relationships are built on trust and mutual respect',
      order: 3,
      durationMs: 5000,
    },
    {
      id: 'affirmation-4',
      text: 'I forgive easily and love unconditionally',
      order: 4,
      durationMs: 5500,
    },
    {
      id: 'affirmation-5',
      text: 'I set healthy boundaries with love and compassion',
      order: 5,
      durationMs: 4500,
    },
    {
      id: 'affirmation-6',
      text: 'I am grateful for the love that surrounds me',
      order: 6,
      durationMs: 5000,
    },
    {
      id: 'affirmation-7',
      text: 'I radiate love and attract loving people',
      order: 7,
      durationMs: 6000,
    },
    {
      id: 'affirmation-8',
      text: 'My heart is open to giving and receiving love',
      order: 8,
      durationMs: 5000,
    },
    {
      id: 'affirmation-9',
      text: 'I create harmony and peace in all my relationships',
      order: 9,
      durationMs: 4500,
    },
  ],
});

export const RELATIONSHIP_PLAYLISTS: Playlist[] = [
  createRelationshipPlaylist(
    'soulmate-attraction',
    'Attract Your Soulmate',
    'Open your heart to attract your perfect romantic partner and deep connection',
    72000
  ),
  createRelationshipPlaylist(
    'marriage-harmony',
    'Marriage & Partnership Bliss',
    'Strengthen your committed relationship and create lasting love and harmony',
    59000
  ),
  createRelationshipPlaylist(
    'family-healing',
    'Family Relationships & Healing',
    'Heal family wounds and create loving, supportive family connections',
    46000
  ),
  createRelationshipPlaylist(
    'friendship-magnetism',
    'Friendship & Social Connections',
    'Attract genuine friendships and build meaningful social relationships',
    38000
  ),
  createRelationshipPlaylist(
    'forgiveness-healing',
    'Forgiveness & Relationship Healing',
    'Release past hurts and create space for love and healing in relationships',
    31000
  ),
  createRelationshipPlaylist(
    'communication-mastery',
    'Communication & Understanding',
    'Improve your ability to communicate with love, clarity, and empathy',
    27000
  ),
];