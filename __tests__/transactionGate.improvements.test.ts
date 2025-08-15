// DISABLED: Transaction gate removed in Phase 5
describe.skip('Transaction Gate Improvements (DISABLED)', () => {
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

  describe('clearTimeout Fix', () => {
    it('should not produce stray timeout errors after operation completes', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Fast operation that completes before timeout
      const fastOperation = jest.fn().mockResolvedValue('fast');
      
      const promise = gate.exec('test:fast', Priority.Background, fastOperation, 5000);
      
      // Complete the operation quickly
      jest.runAllTimers();
      await promise;
      
      // Advance time past when timeout would have fired
      jest.advanceTimersByTime(6000);
      
      // Should not have any timeout errors
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('timed out')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Parameterized Operation Keys', () => {
    it('should handle parameterized keys for voice operations', async () => {
      const operation1 = jest.fn().mockResolvedValue('voice1-result');
      const operation2 = jest.fn().mockResolvedValue('voice2-result');
      
      // Test parameterized accept keys
      const key1 = 'accept:serenity:0';
      const key2 = 'accept:whisper:1';
      
      const promise1 = gate.exec(key1, Priority.Accept, operation1);
      const promise2 = gate.exec(key2, Priority.Accept, operation2);
      
      jest.runAllTimers();
      
      const [result1, result2] = await Promise.all([promise1, promise2]);
      
      expect(result1).toBe('voice1-result');
      expect(result2).toBe('voice2-result');
      expect(operation1).toHaveBeenCalledTimes(1);
      expect(operation2).toHaveBeenCalledTimes(1);
    });

    it('should supersede operations with same parameterized key', async () => {
      const operation1 = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('first'), 100))
      );
      const operation2 = jest.fn().mockResolvedValue('second');
      
      const sameKey = 'accept:serenity:0';
      
      // Start first operation
      const promise1 = gate.exec(sameKey, Priority.Accept, operation1);
      
      // Start second operation with same key (should supersede first)
      const promise2 = gate.exec(sameKey, Priority.Accept, operation2);
      
      jest.runAllTimers();
      
      const [result1, result2] = await Promise.all([promise1, promise2]);
      
      expect(result1).toBeNull(); // Superseded
      expect(result2).toBe('second'); // Current
      
      const stats = gate.getOperationStats();
      expect(stats.preempted).toBe(1);
      expect(stats.succeeded).toBe(1);
    });

    it('should allow different parameterized keys to run concurrently', async () => {
      const operation1 = jest.fn().mockResolvedValue('voice1');
      const operation2 = jest.fn().mockResolvedValue('voice2');
      
      const key1 = 'accept:serenity:0';
      const key2 = 'accept:whisper:0'; // Different voice, same index
      
      const promise1 = gate.exec(key1, Priority.Accept, operation1);
      const promise2 = gate.exec(key2, Priority.Accept, operation2);
      
      jest.runAllTimers();
      
      const [result1, result2] = await Promise.all([promise1, promise2]);
      
      expect(result1).toBe('voice1');
      expect(result2).toBe('voice2');
      
      const stats = gate.getOperationStats();
      expect(stats.succeeded).toBe(2);
      expect(stats.preempted).toBe(0);
    });
  });

  describe('Combined Improvements', () => {
    it('should work correctly with parameterized keys and timeout cleanup', async () => {
      const slowOperation = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('slow'), 2000))
      );
      const fastOperation = jest.fn().mockResolvedValue('fast');
      
      // Start slow operation
      const slowPromise = gate.exec('accept:serenity:0', Priority.Accept, slowOperation, 1000);
      
      // Start fast operation with different key
      const fastPromise = gate.exec('accept:whisper:1', Priority.Accept, fastOperation);
      
      // Advance time to trigger timeout for slow operation
      jest.advanceTimersByTime(1500);
      
      await expect(slowPromise).rejects.toThrow('timed out');
      await expect(fastPromise).resolves.toBe('fast');
      
      const stats = gate.getOperationStats();
      expect(stats.timedOut).toBe(1);
      expect(stats.succeeded).toBe(1);
    });
  });
});