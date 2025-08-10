import { AudioCoordinator } from '../services/audioCoordinator';

// Mock the dependencies to avoid React Native errors
jest.mock('react-native-track-player', () => ({
  setupPlayer: jest.fn(),
  addEventListener: jest.fn(),
  play: jest.fn(),
  pause: jest.fn(),
  stop: jest.fn(),
  reset: jest.fn(),
}));

jest.mock('../services/audioMachine', () => ({
  audioMachine: {
    provide: jest.fn(() => ({ 
      createActor: jest.fn(() => ({
        start: jest.fn(),
        stop: jest.fn(),
        send: jest.fn(),
        getSnapshot: jest.fn(() => ({ context: { currentTrackIndex: 0 } })),
        subscribe: jest.fn(),
      }))
    }))
  }
}));

jest.mock('../store/audioStore', () => ({
  useAudioStore: {
    getState: jest.fn(() => ({
      playlist: null,
      setModalOpen: jest.fn(),
      setPausedState: jest.fn(),
      setVoiceId: jest.fn(),
      setIsPlaying: jest.fn(),
      setCurrentTrackIndex: jest.fn(),
      setGlobalDelay: jest.fn(),
    }))
  }
}));

describe('AudioCoordinator Phase 1A Scaffolding', () => {
  let coordinator: AudioCoordinator;

  beforeEach(() => {
    coordinator = new AudioCoordinator();
  });

  afterEach(async () => {
    await coordinator.cleanup();
  });

  describe('Coordinator Flag Management', () => {
    test('should initialize with flags cleared', () => {
      expect(coordinator.isPreviewMode()).toBe(false);
      expect(coordinator.isStructuralOpInFlight()).toBe(false);
    });

    test('should set and clear preview mode flag', () => {
      coordinator.setPreviewMode(true);
      expect(coordinator.isPreviewMode()).toBe(true);
      
      coordinator.setPreviewMode(false);
      expect(coordinator.isPreviewMode()).toBe(false);
    });

    test('should set and clear structural operation flag', () => {
      coordinator.setStructuralOpInFlight(true);
      expect(coordinator.isStructuralOpInFlight()).toBe(true);
      
      coordinator.setStructuralOpInFlight(false);
      expect(coordinator.isStructuralOpInFlight()).toBe(false);
    });

    test('should clear all flags at once', () => {
      coordinator.setPreviewMode(true);
      coordinator.setStructuralOpInFlight(true);
      
      expect(coordinator.isPreviewMode()).toBe(true);
      expect(coordinator.isStructuralOpInFlight()).toBe(true);
      
      coordinator.clearCoordinatorFlags();
      
      expect(coordinator.isPreviewMode()).toBe(false);
      expect(coordinator.isStructuralOpInFlight()).toBe(false);
    });

    test('should clear flags on cleanup', async () => {
      coordinator.setPreviewMode(true);
      coordinator.setStructuralOpInFlight(true);
      
      await coordinator.cleanup();
      
      expect(coordinator.isPreviewMode()).toBe(false);
      expect(coordinator.isStructuralOpInFlight()).toBe(false);
    });
  });

  describe('Event Suppression Logic', () => {
    test('should wire event suppression function to audio system', () => {
      const audioSystem = coordinator.getAudioSystem();
      
      // Should have suppression function wired
      expect(audioSystem.shouldSuppressEvents).toBeDefined();
      expect(typeof audioSystem.shouldSuppressEvents).toBe('function');
    });

    test('should suppress events when preview mode is active', () => {
      const audioSystem = coordinator.getAudioSystem();
      
      // Initially should not suppress
      expect(audioSystem.shouldSuppressEvents?.()).toBe(false);
      
      // Should suppress when preview mode is active
      coordinator.setPreviewMode(true);
      expect(audioSystem.shouldSuppressEvents?.()).toBe(true);
      
      // Should not suppress when cleared
      coordinator.setPreviewMode(false);
      expect(audioSystem.shouldSuppressEvents?.()).toBe(false);
    });

    test('should suppress events when structural operation is in flight', () => {
      const audioSystem = coordinator.getAudioSystem();
      
      // Initially should not suppress
      expect(audioSystem.shouldSuppressEvents?.()).toBe(false);
      
      // Should suppress when structural op is in flight
      coordinator.setStructuralOpInFlight(true);
      expect(audioSystem.shouldSuppressEvents?.()).toBe(true);
      
      // Should not suppress when cleared
      coordinator.setStructuralOpInFlight(false);
      expect(audioSystem.shouldSuppressEvents?.()).toBe(false);
    });

    test('should suppress events when either flag is active', () => {
      const audioSystem = coordinator.getAudioSystem();
      
      // Preview mode only
      coordinator.setPreviewMode(true);
      expect(audioSystem.shouldSuppressEvents?.()).toBe(true);
      
      // Both flags
      coordinator.setStructuralOpInFlight(true);
      expect(audioSystem.shouldSuppressEvents?.()).toBe(true);
      
      // Structural op only
      coordinator.setPreviewMode(false);
      expect(audioSystem.shouldSuppressEvents?.()).toBe(true);
      
      // Neither flag
      coordinator.setStructuralOpInFlight(false);
      expect(audioSystem.shouldSuppressEvents?.()).toBe(false);
    });
  });

  describe('Transaction Gate Integration', () => {
    test('should include coordinator flag state in transaction stats', () => {
      const stats = coordinator.getTransactionStats();
      
      expect(stats).toHaveProperty('enabled');
      expect(stats).toHaveProperty('stats');
      expect(stats).toHaveProperty('activeOperations');
      expect(stats).toHaveProperty('previewActive');
    });

    test('should maintain flag state independent of transaction gate', () => {
      // Flags should work regardless of gate state
      coordinator.enableTransactionGate(false);
      
      coordinator.setPreviewMode(true);
      expect(coordinator.isPreviewMode()).toBe(true);
      
      coordinator.enableTransactionGate(true);
      expect(coordinator.isPreviewMode()).toBe(true);
    });
  });

  describe('Flag Behavior with Operations', () => {
    test('should not modify flags when gate is disabled', () => {
      coordinator.enableTransactionGate(false);
      
      // These should not throw or modify flags when gate is disabled
      coordinator.previewVoice('test-voice');
      expect(coordinator.isPreviewMode()).toBe(false);
    });

    test('should enable transaction gate and verify integration', () => {
      coordinator.enableTransactionGate(true);
      
      // Test that gate is enabled
      const stats = coordinator.getTransactionStats();
      expect(stats.enabled).toBe(true);
    });
  });
});