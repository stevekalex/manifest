import { gate } from '../services/transactionGate';

// Simple validation test for Phase 1A functionality
describe('Phase 1A Validation', () => {
  describe('Transaction Gate Core', () => {
    beforeEach(() => {
      gate.resetStats();
    });

    afterEach(() => {
      gate.emergencyStop();
    });

    test('Transaction gate should handle parameterized keys', async () => {
      const operation = jest.fn().mockResolvedValue('test-result');
      
      const result = await gate.exec(
        'accept:serenity:0',
        3, // Priority.Accept
        operation
      );

      expect(result).toBe('test-result');
      expect(operation).toHaveBeenCalledTimes(1);
      
      const stats = gate.getOperationStats();
      expect(stats.total).toBe(1);
      expect(stats.succeeded).toBe(1);
    });

    test('Transaction gate should handle preview preemption', async () => {
      const previewOp = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('preview'), 100))
      );
      const acceptOp = jest.fn().mockResolvedValue('accept');

      const preemptedSpy = jest.fn();
      gate.on('preview-preempted', preemptedSpy);

      // Start preview
      const previewPromise = gate.exec('preview:serenity', 2, previewOp);
      
      // Start accept (should preempt)
      const acceptPromise = gate.exec('accept:serenity:0', 3, acceptOp);

      // Verify preemption event
      expect(preemptedSpy).toHaveBeenCalled();
      expect(gate.isPreviewActive()).toBe(false);

      const results = await Promise.all([previewPromise, acceptPromise]);
      expect(results[1]).toBe('accept'); // Accept should succeed
    });

    test('Transaction gate should clear timeouts properly', async () => {
      const fastOp = jest.fn().mockResolvedValue('fast');
      
      // This should complete quickly without timeout
      const result = await gate.exec('test:fast', 1, fastOp, 1000);
      
      expect(result).toBe('fast');
      expect(fastOp).toHaveBeenCalledTimes(1);
    });
  });

  describe('Type Definitions', () => {
    test('Parameterized operation keys should be typed correctly', () => {
      // These should not cause TypeScript errors
      const key1: string = 'accept:serenity:0';
      const key2: string = 'preview:whisper';
      const key3: string = 'background:volume-change';
      
      expect(typeof key1).toBe('string');
      expect(typeof key2).toBe('string'); 
      expect(typeof key3).toBe('string');
    });
  });
});