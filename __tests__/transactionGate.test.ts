import { TransactionGate, Priority } from '../services/transactionGate';

describe('TransactionGate', () => {
  let gate: TransactionGate;

  beforeEach(() => {
    gate = new TransactionGate();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    gate.removeAllListeners();
    gate.emergencyStop();
  });

  describe('Basic Operation Management', () => {
    it('should execute operations and return results', async () => {
      const mockFn = jest.fn().mockResolvedValue('test-result');
      
      const promise = gate.exec('test:operation', Priority.Background, mockFn);
      jest.runAllTimers();
      const result = await promise;

      expect(result).toBe('test-result');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(gate.getCurrentVersion()).toBe(1);
    });

    it('should handle operation failures properly', async () => {
      const error = new Error('Test error');
      const mockFn = jest.fn().mockRejectedValue(error);
      
      const promise = gate.exec('test:operation', Priority.Background, mockFn);
      jest.runAllTimers();
      
      await expect(promise).rejects.toThrow('Test error');
      expect(gate.getActiveOperations()).toHaveLength(0);
    });

    it('should track operation statistics', async () => {
      const mockSuccess = jest.fn().mockResolvedValue('success');
      const mockError = jest.fn().mockRejectedValue(new Error('fail'));
      
      // Successful operation
      const promise1 = gate.exec('test:success', Priority.Background, mockSuccess);
      jest.runAllTimers();
      await promise1;
      
      // Failed operation
      const promise2 = gate.exec('test:fail', Priority.Background, mockError);
      jest.runAllTimers();
      await expect(promise2).rejects.toThrow();
      
      const stats = gate.getOperationStats();
      expect(stats.total).toBe(2);
      expect(stats.succeeded).toBe(1);
      expect(stats.failed).toBe(1);
    });
  });

  describe('Version Management and Superseding', () => {
    it('should supersede operations with newer versions', async () => {
      const mockFn1 = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('result1'), 100))
      );
      const mockFn2 = jest.fn().mockResolvedValue('result2');
      
      // Start first operation
      const promise1 = gate.exec('test:operation', Priority.Background, mockFn1);
      
      // Start second operation before first completes
      const promise2 = gate.exec('test:operation', Priority.Background, mockFn2);
      jest.runAllTimers();
      
      const result1 = await promise1;
      const result2 = await promise2;
      
      expect(result1).toBeNull(); // Superseded
      expect(result2).toBe('result2'); // Current
      
      const stats = gate.getOperationStats();
      expect(stats.preempted).toBe(1);
      expect(stats.succeeded).toBe(1);
    });

    it('should handle concurrent operations on different keys', async () => {
      const mockFn1 = jest.fn().mockResolvedValue('result1');
      const mockFn2 = jest.fn().mockResolvedValue('result2');
      
      const promise1 = gate.exec('test:operation1', Priority.Background, mockFn1);
      const promise2 = gate.exec('test:operation2', Priority.Background, mockFn2);
      
      jest.runAllTimers();
      
      const [result1, result2] = await Promise.all([promise1, promise2]);
      
      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
      expect(gate.getOperationStats().succeeded).toBe(2);
    });
  });

  describe('Preview Preemption Logic', () => {
    it('should mark preview as active during preview operations', async () => {
      const mockFn = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('preview'), 50))
      );
      
      expect(gate.isPreviewActive()).toBe(false);
      
      const promise = gate.exec('preview:voice-sample', Priority.Preview, mockFn);
      
      // Should be active during execution
      expect(gate.isPreviewActive()).toBe(true);
      
      jest.runAllTimers();
      await promise;
      
      // Should be inactive after completion
      expect(gate.isPreviewActive()).toBe(false);
    });

    it('should emit preview-preempted event when accept preempts preview', async () => {
      const previewFn = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('preview'), 100))
      );
      const acceptFn = jest.fn().mockResolvedValue('accept');
      
      const preemptedSpy = jest.fn();
      gate.on('preview-preempted', preemptedSpy);
      
      // Start preview
      const previewPromise = gate.exec('preview:voice-sample', Priority.Preview, previewFn);
      expect(gate.isPreviewActive()).toBe(true);
      
      // Start accept (should preempt)
      const acceptPromise = gate.exec('accept:voice-switch', Priority.Accept, acceptFn);
      
      expect(preemptedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          version: 2,
          key: 'accept:voice-switch'
        })
      );
      expect(gate.isPreviewActive()).toBe(false);
      
      jest.runAllTimers();
      await Promise.all([previewPromise, acceptPromise]);
    });

    it('should not preempt preview for non-accept operations', async () => {
      const previewFn = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('preview'), 50))
      );
      const backgroundFn = jest.fn().mockResolvedValue('background');
      
      const preemptedSpy = jest.fn();
      gate.on('preview-preempted', preemptedSpy);
      
      // Start preview
      gate.exec('preview:voice-sample', Priority.Preview, previewFn);
      expect(gate.isPreviewActive()).toBe(true);
      
      // Start background operation (should not preempt)
      gate.exec('background:volume-change', Priority.Background, backgroundFn);
      
      expect(preemptedSpy).not.toHaveBeenCalled();
      expect(gate.isPreviewActive()).toBe(true);
      
      jest.runAllTimers();
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout operations that exceed time limit', async () => {
      const slowFn = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('slow'), 10000))
      );
      
      const promise = gate.exec('test:slow', Priority.Background, slowFn, 1000);
      
      // Advance time past timeout
      jest.advanceTimersByTime(1500);
      
      await expect(promise).rejects.toThrow('Operation test:slow timed out after 1000ms');
      
      const stats = gate.getOperationStats();
      expect(stats.timedOut).toBe(1);
    });

    it('should use default timeout when not specified', async () => {
      const slowFn = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('slow'), 10000))
      );
      
      const promise = gate.exec('test:slow', Priority.Background, slowFn);
      
      // Advance time past default timeout (5000ms)
      jest.advanceTimersByTime(5500);
      
      await expect(promise).rejects.toThrow('timed out after 5000ms');
    });
  });

  describe('Utility Methods', () => {
    it('should track active operations', async () => {
      const longRunningFn = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('done'), 1000))
      );
      
      expect(gate.getActiveOperations()).toHaveLength(0);
      
      const promise1 = gate.exec('test:op1', Priority.Background, longRunningFn);
      const promise2 = gate.exec('test:op2', Priority.Background, longRunningFn);
      
      const activeOps = gate.getActiveOperations();
      expect(activeOps).toContain('test:op1');
      expect(activeOps).toContain('test:op2');
      expect(activeOps).toHaveLength(2);
      
      jest.runAllTimers();
      await Promise.all([promise1, promise2]);
      
      expect(gate.getActiveOperations()).toHaveLength(0);
    });

    it('should reset statistics', async () => {
      const mockFn = jest.fn().mockResolvedValue('test');
      
      const promise = gate.exec('test:operation', Priority.Background, mockFn);
      jest.runAllTimers();
      await promise;
      
      expect(gate.getOperationStats().total).toBe(1);
      
      gate.resetStats();
      
      const stats = gate.getOperationStats();
      expect(stats.total).toBe(0);
      expect(stats.succeeded).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.preempted).toBe(0);
      expect(stats.timedOut).toBe(0);
    });

    it('should handle emergency stop', () => {
      const stopSpy = jest.fn();
      gate.on('emergency-stop', stopSpy);
      
      // Start some operations
      gate.exec('test:op1', Priority.Background, () => Promise.resolve('1'));
      gate.exec('preview:sample', Priority.Preview, () => Promise.resolve('2'));
      
      expect(gate.getActiveOperations().length).toBeGreaterThan(0);
      expect(gate.isPreviewActive()).toBe(true);
      
      gate.emergencyStop();
      
      expect(gate.getActiveOperations()).toHaveLength(0);
      expect(gate.isPreviewActive()).toBe(false);
      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('Error Edge Cases', () => {
    it('should handle operations that throw synchronously', async () => {
      const throwingFn = jest.fn().mockImplementation(() => {
        throw new Error('Synchronous error');
      });
      
      const promise = gate.exec('test:sync-error', Priority.Background, throwingFn);
      jest.runAllTimers();
      
      await expect(promise).rejects.toThrow('Synchronous error');
      expect(gate.getActiveOperations()).toHaveLength(0);
    });

    it('should clean up properly when operations are superseded during error handling', async () => {
      const errorFn = jest.fn().mockImplementation(() => 
        new Promise((_, reject) => setTimeout(() => reject(new Error('Async error')), 100))
      );
      const successFn = jest.fn().mockResolvedValue('success');
      
      // Start failing operation
      const promise1 = gate.exec('test:operation', Priority.Background, errorFn);
      
      // Supersede with successful operation
      const promise2 = gate.exec('test:operation', Priority.Background, successFn);
      
      jest.runAllTimers();
      
      const result1 = await promise1;
      const result2 = await promise2;
      
      expect(result1).toBeNull(); // Superseded, no error thrown
      expect(result2).toBe('success');
      expect(gate.getActiveOperations()).toHaveLength(0);
    });
  });
});