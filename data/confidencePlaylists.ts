import type { Playlist } from '../types/audio';

// Base template for confidence playlists - all use same audio files but different themes
const createConfidencePlaylist = (
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
      text: 'I allow myself to be who I am meant to be',
      order: 0,
      durationMs: 5000,
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
});

export const CONFIDENCE_PLAYLISTS: Playlist[] = [
  createConfidencePlaylist(
    'believe-in-yourself',
    'Believe In Yourself', 
    'Powerful affirmations to boost self-confidence and inner strength',
    85000
  ),
  createConfidencePlaylist(
    'unshakeable-confidence',
    'Unshakeable Confidence',
    'Build rock-solid confidence and self-assurance in any situation',
    67000
  ),
  createConfidencePlaylist(
    'fearless-courage',
    'Fearless & Courageous',
    'Overcome fear and develop the courage to take bold action',
    54000
  ),
  createConfidencePlaylist(
    'self-worth-mastery',
    'Self-Worth Mastery',
    'Transform limiting beliefs and embrace your inherent worth',
    43000
  ),
  createConfidencePlaylist(
    'leadership-confidence',
    'Leadership & Authority',
    'Develop natural leadership qualities and command respect in any room',
    38000
  ),
  createConfidencePlaylist(
    'social-confidence',
    'Social Confidence',
    'Feel comfortable and charismatic in social situations and networking',
    32000
  ),
  createConfidencePlaylist(
    'body-confidence',
    'Body Confidence & Self-Image',
    'Love and appreciate your body while radiating confidence from within',
    29000
  ),
  createConfidencePlaylist(
    'public-speaking',
    'Public Speaking Mastery',
    'Overcome stage fright and become a confident, compelling speaker',
    25000
  ),
];