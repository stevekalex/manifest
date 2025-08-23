// Global setup for tests
global.__DEV__ = true;

// Mock AsyncStorage - only if package is installed
try {
  require.resolve('@react-native-async-storage/async-storage');
  jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
  );
} catch (e) {
  // Package not installed, skip mock
}

// Mock React Native core modules
jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({
      remove: jest.fn(),
    })),
    removeEventListener: jest.fn(),
  },
  Platform: {
    OS: 'ios',
    select: jest.fn((options) => options.ios),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 667 })),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  StyleSheet: {
    create: jest.fn((styles) => styles),
    compose: jest.fn(),
    flatten: jest.fn(),
  },
  View: 'View',
  Text: 'Text',
  Image: 'Image',
  ScrollView: 'ScrollView',
  Pressable: 'Pressable',
  RefreshControl: 'RefreshControl',
}));

// Mock Expo modules
jest.mock('expo-font');
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      name: 'manifest',
    },
  },
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
  };
});

// Mock expo-av for audio system tests
jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
    Sound: {
      createAsync: jest.fn(() => Promise.resolve({
        sound: {
          playAsync: jest.fn(() => Promise.resolve()),
          pauseAsync: jest.fn(() => Promise.resolve()),
          stopAsync: jest.fn(() => Promise.resolve()),
          setVolumeAsync: jest.fn(() => Promise.resolve()),
          getStatusAsync: jest.fn(() => Promise.resolve({ isLoaded: true })),
          unloadAsync: jest.fn(() => Promise.resolve()),
        }
      })),
    },
  },
}));

// Mock React Native Track Player
jest.mock('react-native-track-player', () => ({
  setupPlayer: jest.fn(() => Promise.resolve()),
  add: jest.fn(() => Promise.resolve()),
  play: jest.fn(() => Promise.resolve()),
  pause: jest.fn(() => Promise.resolve()),
  stop: jest.fn(() => Promise.resolve()),
  reset: jest.fn(() => Promise.resolve()),
  skip: jest.fn(() => Promise.resolve()),
  skipToNext: jest.fn(() => Promise.resolve()),
  skipToPrevious: jest.fn(() => Promise.resolve()),
  setVolume: jest.fn(() => Promise.resolve()),
  getState: jest.fn(() => Promise.resolve('idle')),
  getPosition: jest.fn(() => Promise.resolve(0)),
  getDuration: jest.fn(() => Promise.resolve(0)),
  getQueue: jest.fn(() => Promise.resolve([])),
  getCurrentTrack: jest.fn(() => Promise.resolve(0)),
  updateMetadataForTrack: jest.fn(() => Promise.resolve()),
  addEventListener: jest.fn(() => jest.fn()), // Returns unsubscribe function
  removeEventListener: jest.fn(),
  State: {
    None: 'none',
    Stopped: 'stopped',
    Paused: 'paused',
    Playing: 'playing',
    Ready: 'ready',
    Buffering: 'buffering',
  },
  Event: {
    PlaybackState: 'playback-state',
    PlaybackTrackChanged: 'playback-track-changed',
    PlaybackQueueEnded: 'playback-queue-ended',
    PlaybackError: 'playback-error',
  },
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaConsumer: ({ children }) => children(inset),
    SafeAreaView: ({ children }) => children,
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

// Mock @testing-library/react-native
jest.mock('@testing-library/react-native', () => ({
  render: jest.fn(),
  screen: {
    getByText: jest.fn(),
    queryByText: jest.fn(),
    getByTestId: jest.fn(),
    queryByTestId: jest.fn(),
  },
  fireEvent: {
    press: jest.fn(),
    changeText: jest.fn(),
  },
}));

// Suppress console.error for cleaner test output
global.console = {
  ...console,
  error: jest.fn(),
};