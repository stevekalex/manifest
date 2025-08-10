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

// Suppress console.error for cleaner test output
global.console = {
  ...console,
  error: jest.fn(),
};