// DISABLED: Transaction gate removed in Phase 5
describe.skip('Transaction Gate Integration (DISABLED)', () => {
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
    // previewActive property removed with preview functionality
    
    expect(stats.stats).toHaveProperty('total');
    expect(stats.stats).toHaveProperty('succeeded');
    expect(stats.stats).toHaveProperty('preempted');
    expect(stats.stats).toHaveProperty('failed');
    expect(stats.stats).toHaveProperty('timedOut');
    
    expect(Array.isArray(stats.activeOperations)).toBe(true);
  });

  test.skip('Preview voice tests disabled - functionality removed', () => {
    // These tests are disabled as previewVoice was removed in Phase 2
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
    
    // Clean up
    await coordinator.cleanup();
    
    // Gate should be cleaned
    expect(gate.getActiveOperations()).toHaveLength(0);
    // isPreviewActive method will be removed with transaction gate
  });
});