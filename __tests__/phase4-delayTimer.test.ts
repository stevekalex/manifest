import { createDelayTimer, DelayTimer } from '../services/delayTimer';

// Mock React Native modules
jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(),
  },
}));

describe('Phase 4: Delay Timer Robustness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic Timer Functionality', () => {
    test('should complete after specified delay', async () => {
      const onComplete = jest.fn();
      const timer = createDelayTimer(1000, onComplete);
      
      timer.start();
      
      // Advance time by 1000ms
      jest.advanceTimersByTime(1000);
      
      expect(onComplete).toHaveBeenCalledTimes(1);
      timer.cleanup();
    });

    test('should cancel timer before completion', () => {
      const onComplete = jest.fn();
      const timer = createDelayTimer(1000, onComplete);
      
      timer.start();
      
      // Advance time by 500ms then cancel
      jest.advanceTimersByTime(500);
      timer.cancel();
      
      // Advance remaining time
      jest.advanceTimersByTime(500);
      
      expect(onComplete).not.toHaveBeenCalled();
      timer.cleanup();
    });

    test('should track elapsed time accurately', () => {
      const onComplete = jest.fn();
      const timer = createDelayTimer(1000, onComplete);
      
      timer.start();
      
      // Advance time by 300ms
      jest.advanceTimersByTime(300);
      
      expect(timer.getElapsedTime()).toBe(300);
      expect(timer.getRemainingTime()).toBe(700);
      
      timer.cleanup();
    });
  });

  describe('Pause and Resume', () => {
    test('should pause and resume timer', () => {
      const onComplete = jest.fn();
      const timer = createDelayTimer(1000, onComplete);
      
      timer.start();
      
      // Advance 300ms then pause
      jest.advanceTimersByTime(300);
      timer.pause();
      
      // Advance 500ms while paused
      jest.advanceTimersByTime(500);
      expect(onComplete).not.toHaveBeenCalled();
      
      // Resume and advance remaining time
      timer.resume();
      jest.advanceTimersByTime(700);
      
      expect(onComplete).toHaveBeenCalledTimes(1);
      timer.cleanup();
    });

    test('should handle multiple pause/resume cycles', () => {
      const onComplete = jest.fn();
      const timer = createDelayTimer(1000, onComplete);
      
      timer.start();
      
      // First cycle: 200ms
      jest.advanceTimersByTime(200);
      timer.pause();
      jest.advanceTimersByTime(100); // Time while paused
      timer.resume();
      
      // Second cycle: 300ms
      jest.advanceTimersByTime(300);
      timer.pause();
      jest.advanceTimersByTime(200); // Time while paused
      timer.resume();
      
      // Complete remaining 500ms
      jest.advanceTimersByTime(500);
      
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(timer.getElapsedTime()).toBe(1000);
      timer.cleanup();
    });
  });

  describe('Timer State Management', () => {
    test('should track timer state correctly', () => {
      const onComplete = jest.fn();
      const timer = createDelayTimer(1000, onComplete);
      
      expect(timer.getState()).toBe('idle');
      
      timer.start();
      expect(timer.getState()).toBe('running');
      
      timer.pause();
      expect(timer.getState()).toBe('paused');
      
      timer.resume();
      expect(timer.getState()).toBe('running');
      
      timer.cancel();
      expect(timer.getState()).toBe('cancelled');
      
      timer.cleanup();
    });

    test('should prevent invalid state transitions', () => {
      const onComplete = jest.fn();
      const timer = createDelayTimer(1000, onComplete);
      
      // Can't pause before starting
      timer.pause();
      expect(timer.getState()).toBe('idle');
      
      timer.start();
      timer.cancel();
      
      // Can't resume after cancelling
      timer.resume();
      expect(timer.getState()).toBe('cancelled');
      
      timer.cleanup();
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero delay', () => {
      const onComplete = jest.fn();
      const timer = createDelayTimer(0, onComplete);
      
      timer.start();
      jest.advanceTimersByTime(0);
      
      expect(onComplete).toHaveBeenCalledTimes(1);
      timer.cleanup();
    });

    test('should handle restart', () => {
      const onComplete = jest.fn();
      const timer = createDelayTimer(1000, onComplete);
      
      timer.start();
      jest.advanceTimersByTime(500);
      
      // Restart should reset timer
      timer.restart();
      expect(timer.getElapsedTime()).toBe(0);
      
      jest.advanceTimersByTime(1000);
      expect(onComplete).toHaveBeenCalledTimes(1);
      
      timer.cleanup();
    });

    test('should cleanup all resources', () => {
      const onComplete = jest.fn();
      const timer = createDelayTimer(1000, onComplete);
      
      timer.start();
      timer.cleanup();
      
      // Advancing time after cleanup should not trigger callback
      jest.advanceTimersByTime(1000);
      expect(onComplete).not.toHaveBeenCalled();
    });
  });
});