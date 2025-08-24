import type { Playlist } from '../types/audio';

export const SAMPLE_PLAYLIST: Playlist = {
  id: 'believe-in-yourself',
  name: 'Believe In Yourself',
  description: 'A collection of empowering affirmations to boost self-belief and confidence',
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