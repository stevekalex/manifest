import type { Playlist } from '../types/audio';

export const SAMPLE_PLAYLIST: Playlist = {
  id: 'believe-in-yourself',
  name: 'Believe In Yourself',
  description: 'A collection of empowering affirmations to boost self-belief and confidence',
  backgroundTrackUrl: require('../ethereal-ambient-music-55115.mp3'),
  defaultVoiceId: 'serenity',
  voices: [
    {
      id: 'serenity',
      name: 'Serenity',
      gender: 'female',
      locale: 'en-US',
      sampleUrl: 'https://example.com/samples/serenity.mp3'
    },
    {
      id: 'titan',
      name: 'Titan',
      gender: 'male',
      locale: 'en-US',
      sampleUrl: 'https://example.com/samples/titan.mp3'
    }
  ],
  cdnUrls: {
    'serenity': {
      'affirmation-0': 'https://example.com/voices/serenity/affirmation-0.mp3',
      'affirmation-1': 'https://example.com/voices/serenity/affirmation-1.mp3',
      'affirmation-2': 'https://example.com/voices/serenity/affirmation-2.mp3',
      'affirmation-3': 'https://example.com/voices/serenity/affirmation-3.mp3',
      'affirmation-4': 'https://example.com/voices/serenity/affirmation-4.mp3',
      'affirmation-5': 'https://example.com/voices/serenity/affirmation-5.mp3',
      'affirmation-6': 'https://example.com/voices/serenity/affirmation-6.mp3',
      'affirmation-7': 'https://example.com/voices/serenity/affirmation-7.mp3',
      'affirmation-8': 'https://example.com/voices/serenity/affirmation-8.mp3',
      'affirmation-9': 'https://example.com/voices/serenity/affirmation-9.mp3',
    },
    'titan': {
      'affirmation-0': 'https://example.com/voices/titan/affirmation-0.mp3',
      'affirmation-1': 'https://example.com/voices/titan/affirmation-1.mp3',
      'affirmation-2': 'https://example.com/voices/titan/affirmation-2.mp3',
      'affirmation-3': 'https://example.com/voices/titan/affirmation-3.mp3',
      'affirmation-4': 'https://example.com/voices/titan/affirmation-4.mp3',
      'affirmation-5': 'https://example.com/voices/titan/affirmation-5.mp3',
      'affirmation-6': 'https://example.com/voices/titan/affirmation-6.mp3',
      'affirmation-7': 'https://example.com/voices/titan/affirmation-7.mp3',
      'affirmation-8': 'https://example.com/voices/titan/affirmation-8.mp3',
      'affirmation-9': 'https://example.com/voices/titan/affirmation-9.mp3',
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
};