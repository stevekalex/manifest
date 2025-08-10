import { AudioCoordinator } from '../services/audioCoordinator';
import { gate } from '../services/transactionGate';

// Integration test to ensure transaction gate works with audio coordinator
describe('Transaction Gate Integration', () => {
  let coordinator: AudioCoordinator;

  beforeEach(() => {
    coordinator = new AudioCoordinator();
    gate.resetStats();
  });

  afterEach(async () => {
    await coordinator.cleanup();
    gate.emergencyStop();
  });

  test('should enable and disable transaction gate', () => {
    const stats = coordinator.getTransactionStats();
    expect(stats.enabled).toBe(false);
    
    coordinator.enableTransactionGate(true);
    const enabledStats = coordinator.getTransactionStats();
    expect(enabledStats.enabled).toBe(true);
    
    coordinator.enableTransactionGate(false);
    const disabledStats = coordinator.getTransactionStats();
    expect(disabledStats.enabled).toBe(false);
  });

  test('should provide transaction statistics', () => {
    const stats = coordinator.getTransactionStats();
    
    expect(stats).toHaveProperty('enabled');
    expect(stats).toHaveProperty('stats');
    expect(stats).toHaveProperty('activeOperations');
    expect(stats).toHaveProperty('previewActive');
    
    expect(stats.stats).toHaveProperty('total');
    expect(stats.stats).toHaveProperty('succeeded');
    expect(stats.stats).toHaveProperty('preempted');
    expect(stats.stats).toHaveProperty('failed');
    expect(stats.stats).toHaveProperty('timedOut');
    
    expect(Array.isArray(stats.activeOperations)).toBe(true);
    expect(typeof stats.previewActive).toBe('boolean');
  });

  test('should call preview voice without errors when gate is disabled', () => {
    coordinator.enableTransactionGate(false);
    
    // This should not throw an error
    expect(() => {
      coordinator.previewVoice('test-voice');
    }).not.toThrow();
  });

  test('should call preview voice without errors when gate is enabled', () => {
    coordinator.enableTransactionGate(true);
    
    // This should not throw an error
    expect(() => {
      coordinator.previewVoice('test-voice');
    }).not.toThrow();
  });

  test('should handle voice confirmation without errors', async () => {
    coordinator.enableTransactionGate(false);
    
    // This should not throw an error
    await expect(
      coordinator.confirmVoiceSelection('test-voice')
    ).resolves.not.toThrow();
  });

  test('should clean up gate operations on cleanup', async () => {
    coordinator.enableTransactionGate(true);
    
    // Start some preview
    coordinator.previewVoice('test-voice');
    
    // Should have some activity
    const statsBeforeCleanup = coordinator.getTransactionStats();
    
    // Clean up
    await coordinator.cleanup();
    
    // Gate should be cleaned
    expect(gate.getActiveOperations()).toHaveLength(0);
    expect(gate.isPreviewActive()).toBe(false);
  });
});