import { DelayTimerManager, getDelayTimerManager } from '../services/delayTimerManager';
import { AppState } from 'react-native';

// Mock React Native modules
jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(),
  },
}));

describe('Phase 4: Delay Timer Manager with App State', () => {
  let mockAppStateListener: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Reset AppState mock
    mockAppStateListener = jest.fn();
    (AppState.addEventListener as jest.Mock).mockImplementation((event, callback) => {
      mockAppStateListener = callback;
      return { remove: jest.fn() };
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('App State Handling', () => {
    test('should pause timer when app goes to background', () => {
      const manager = new DelayTimerManager();
      const onComplete = jest.fn();
      
      const timer = manager.createManagedTimer(1000, onComplete);
      timer.start();
      
      // Advance 300ms
      jest.advanceTimersByTime(300);
      expect(timer.getState()).toBe('running');
      
      // App goes to background
      mockAppStateListener('background');
      expect(timer.getState()).toBe('paused');
      
      // Advance time while in background
      jest.advanceTimersByTime(500);
      expect(onComplete).not.toHaveBeenCalled();
      
      manager.cleanup();
    });

    test('should resume timer when app returns to foreground', () => {
      const manager = new DelayTimerManager();
      const onComplete = jest.fn();
      
      const timer = manager.createManagedTimer(1000, onComplete);
      timer.start();
      
      // Advance 300ms then background
      jest.advanceTimersByTime(300);
      mockAppStateListener('background');
      
      // App returns to foreground
      mockAppStateListener('active');
      expect(timer.getState()).toBe('running');
      
      // Complete remaining time
      jest.advanceTimersByTime(700);
      expect(onComplete).toHaveBeenCalledTimes(1);
      
      manager.cleanup();
    });

    test('should handle inactive state like background', () => {
      const manager = new DelayTimerManager();
      const onComplete = jest.fn();
      
      const timer = manager.createManagedTimer(1000, onComplete);
      timer.start();
      
      jest.advanceTimersByTime(400);
      
      // App goes inactive
      mockAppStateListener('inactive');
      expect(timer.getState()).toBe('paused');
      
      // App becomes active again
      mockAppStateListener('active');
      expect(timer.getState()).toBe('running');
      
      jest.advanceTimersByTime(600);
      expect(onComplete).toHaveBeenCalledTimes(1);
      
      manager.cleanup();
    });

    test('should not resume if timer was already paused before backgrounding', () => {
      const manager = new DelayTimerManager();
      const onComplete = jest.fn();
      
      const timer = manager.createManagedTimer(1000, onComplete);
      timer.start();
      
      // User pauses timer manually
      jest.advanceTimersByTime(300);
      timer.pause();
      
      // App goes to background
      mockAppStateListener('background');
      
      // App returns to foreground - should NOT resume
      mockAppStateListener('active');
      expect(timer.getState()).toBe('paused');
      
      manager.cleanup();
    });

    test('should handle multiple background/foreground cycles', () => {
      const manager = new DelayTimerManager();
      const onComplete = jest.fn();
      
      const timer = manager.createManagedTimer(1000, onComplete);
      timer.start();
      
      // First cycle: 200ms
      jest.advanceTimersByTime(200);
      mockAppStateListener('background');
      mockAppStateListener('active');
      
      // Second cycle: 300ms
      jest.advanceTimersByTime(300);
      mockAppStateListener('background');
      mockAppStateListener('active');
      
      // Complete remaining 500ms
      jest.advanceTimersByTime(500);
      
      expect(onComplete).toHaveBeenCalledTimes(1);
      manager.cleanup();
    });
  });

  describe('Timer Management', () => {
    test('should replace existing timer when creating new one', () => {
      const manager = new DelayTimerManager();
      const onComplete1 = jest.fn();
      const onComplete2 = jest.fn();
      
      // Create first timer
      const timer1 = manager.createManagedTimer(1000, onComplete1);
      timer1.start();
      
      jest.advanceTimersByTime(300);
      
      // Create second timer - should cancel first
      const timer2 = manager.createManagedTimer(500, onComplete2);
      timer2.start();
      
      // First timer should be cleaned up
      jest.advanceTimersByTime(700);
      expect(onComplete1).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(200);
      expect(onComplete2).toHaveBeenCalledTimes(1);
      
      manager.cleanup();
    });

    test('should clean up timer on completion', () => {
      const manager = new DelayTimerManager();
      const onComplete = jest.fn();
      
      const timer = manager.createManagedTimer(500, onComplete);
      timer.start();
      
      jest.advanceTimersByTime(500);
      expect(onComplete).toHaveBeenCalledTimes(1);
      
      // App state changes should not affect completed timer
      mockAppStateListener('background');
      mockAppStateListener('active');
      
      manager.cleanup();
    });

    test('should handle timer cancellation', () => {
      const manager = new DelayTimerManager();
      const onComplete = jest.fn();
      const onCancel = jest.fn();
      
      const timer = manager.createManagedTimer(1000, onComplete, {
        onCancel
      });
      timer.start();
      
      jest.advanceTimersByTime(400);
      timer.cancel();
      
      expect(onCancel).toHaveBeenCalledWith(400);
      expect(onComplete).not.toHaveBeenCalled();
      
      // App state changes should not affect cancelled timer
      mockAppStateListener('background');
      mockAppStateListener('active');
      
      manager.cleanup();
    });

    test('should cleanup all resources', () => {
      const manager = new DelayTimerManager();
      const onComplete = jest.fn();
      
      const timer = manager.createManagedTimer(1000, onComplete);
      timer.start();
      
      jest.advanceTimersByTime(300);
      
      manager.cleanup();
      
      // Timer should be cleaned up
      jest.advanceTimersByTime(700);
      expect(onComplete).not.toHaveBeenCalled();
      
      // App state listener should be removed
      expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  describe('Singleton Instance', () => {
    test('should return same instance from getDelayTimerManager', () => {
      const manager1 = getDelayTimerManager();
      const manager2 = getDelayTimerManager();
      
      expect(manager1).toBe(manager2);
      
      manager1.cleanup();
    });

    test('should handle multiple calls to singleton', () => {
      const onComplete = jest.fn();
      
      const manager1 = getDelayTimerManager();
      const timer1 = manager1.createManagedTimer(500, onComplete);
      timer1.start();
      
      const manager2 = getDelayTimerManager();
      expect(manager1).toBe(manager2);
      
      jest.advanceTimersByTime(500);
      expect(onComplete).toHaveBeenCalledTimes(1);
      
      manager1.cleanup();
    });
  });

  describe('Edge Cases', () => {
    test('should handle no current timer gracefully', () => {
      const manager = new DelayTimerManager();
      
      // App state change with no timer should not crash
      expect(() => {
        mockAppStateListener('background');
        mockAppStateListener('active');
      }).not.toThrow();
      
      manager.cleanup();
    });

    test('should handle rapid app state changes', () => {
      const manager = new DelayTimerManager();
      const onComplete = jest.fn();
      
      const timer = manager.createManagedTimer(1000, onComplete);
      timer.start();
      
      jest.advanceTimersByTime(200);
      
      // Rapid state changes
      mockAppStateListener('background');
      mockAppStateListener('active');
      mockAppStateListener('background');
      mockAppStateListener('active');
      
      // Timer should still work
      jest.advanceTimersByTime(800);
      expect(onComplete).toHaveBeenCalledTimes(1);
      
      manager.cleanup();
    });

    test('should handle timer completion during background', () => {
      const manager = new DelayTimerManager();
      const onComplete = jest.fn();
      
      const timer = manager.createManagedTimer(500, onComplete);
      timer.start();
      
      jest.advanceTimersByTime(300);
      mockAppStateListener('background');
      
      // Timer completes while app is backgrounded (shouldn't happen but edge case)
      jest.advanceTimersByTime(200);
      
      mockAppStateListener('active');
      expect(onComplete).toHaveBeenCalledTimes(1);
      
      manager.cleanup();
    });
  });
});