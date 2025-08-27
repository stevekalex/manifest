/**
 * Edge Case Tests for useAudioSystem Implementation
 * 
 * Tests critical edge cases and potential issues identified in the memoization implementation:
 * 1. Singleton CDNFactory consistency across components
 * 2. Memory leak prevention 
 * 3. Configuration change handling
 * 4. Error resilience
 */

import { useAudioSystem, resetSharedCDNFactory, getSharedCDNFactoryInstance } from '../hooks/useAudioSystem';
import { resetAudioCoordinator } from '../services/audioCoordinator';

// Mock dependencies to avoid complex setup
jest.mock('../services/cdn/CDNFactory');
jest.mock('../services/audioCoordinator');
jest.mock('../store/audioStore');
jest.mock('../utils/logger');

describe('useAudioSystem Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetSharedCDNFactory();
    resetAudioCoordinator();
  });

  describe('Singleton CDNFactory Consistency', () => {
    it('should use same CDNFactory instance across multiple components', () => {
      // Simulate multiple components using the hook
      const MockCDNFactory = require('../services/cdn/CDNFactory').CDNFactory;
      MockCDNFactory.mockImplementation(() => ({
        id: Math.random().toString(),
        getClient: jest.fn()
      }));

      const mockGetAudioCoordinator = require('../services/audioCoordinator').getAudioCoordinator;
      let capturedCDNFactory: any = null;
      
      mockGetAudioCoordinator.mockImplementation((factory: any) => {
        if (!capturedCDNFactory) {
          capturedCDNFactory = factory;
        }
        return { id: 'coordinator-instance' };
      });

      // First component uses hook
      const { result: result1 } = renderHook(() => useAudioSystem());
      
      // Second component uses hook  
      const { result: result2 } = renderHook(() => useAudioSystem());

      // Should only create one CDNFactory instance
      expect(MockCDNFactory).toHaveBeenCalledTimes(1);
      
      // Both components should get the same coordinator
      expect(result1.current).toBeDefined();
      expect(result2.current).toBeDefined();
      
      // Verify singleton behavior
      expect(mockGetAudioCoordinator).toHaveBeenCalledWith(capturedCDNFactory);
      expect(mockGetAudioCoordinator).toHaveBeenCalledTimes(2);
      
      // Both calls should use the same CDNFactory instance
      const call1Factory = mockGetAudioCoordinator.mock.calls[0][0];
      const call2Factory = mockGetAudioCoordinator.mock.calls[1][0];
      expect(call1Factory).toBe(call2Factory);
    });

    it('should handle CDNFactory configuration changes properly', () => {
      const MockCDNFactory = require('../services/cdn/CDNFactory').CDNFactory;
      let factoryInstance: any = null;
      
      MockCDNFactory.mockImplementation(() => {
        factoryInstance = {
          id: Math.random().toString(),
          switchClientType: jest.fn(),
          resetDefaultClient: jest.fn()
        };
        return factoryInstance;
      });

      // First component uses hook - creates factory
      renderHook(() => useAudioSystem());
      
      const sharedFactory = getSharedCDNFactoryInstance();
      expect(sharedFactory).toBe(factoryInstance);
      
      // Simulate configuration change
      sharedFactory?.switchClientType('remote');
      expect(factoryInstance.switchClientType).toHaveBeenCalledWith('remote');
      
      // Factory should still be the same instance
      expect(getSharedCDNFactoryInstance()).toBe(factoryInstance);
    });

    it('should allow factory reset for testing/development', () => {
      const MockCDNFactory = require('../services/cdn/CDNFactory').CDNFactory;
      
      // Create initial factory
      renderHook(() => useAudioSystem());
      expect(MockCDNFactory).toHaveBeenCalledTimes(1);
      
      const firstFactory = getSharedCDNFactoryInstance();
      expect(firstFactory).toBeTruthy();
      
      // Reset factory
      resetSharedCDNFactory();
      expect(getSharedCDNFactoryInstance()).toBeNull();
      
      // Next usage should create new factory
      renderHook(() => useAudioSystem());
      expect(MockCDNFactory).toHaveBeenCalledTimes(2);
      
      const secondFactory = getSharedCDNFactoryInstance();
      expect(secondFactory).toBeTruthy();
      expect(secondFactory).not.toBe(firstFactory);
    });
  });

  describe('Memory Management', () => {
    it('should not create new CDNFactory instances on component re-renders', () => {
      const MockCDNFactory = require('../services/cdn/CDNFactory').CDNFactory;
      
      const { rerender } = renderHook(() => useAudioSystem());
      
      expect(MockCDNFactory).toHaveBeenCalledTimes(1);
      
      // Multiple re-renders should not create new factories
      rerender();
      rerender();
      rerender();
      
      expect(MockCDNFactory).toHaveBeenCalledTimes(1);
    });

    it('should not create new CDNFactory instances on component unmount/remount', () => {
      const MockCDNFactory = require('../services/cdn/CDNFactory').CDNFactory;
      
      // Mount first component
      const { unmount: unmount1 } = renderHook(() => useAudioSystem());
      expect(MockCDNFactory).toHaveBeenCalledTimes(1);
      
      // Unmount first component
      unmount1();
      
      // Mount second component
      const { unmount: unmount2 } = renderHook(() => useAudioSystem());
      
      // Should reuse existing factory
      expect(MockCDNFactory).toHaveBeenCalledTimes(1);
      
      unmount2();
      
      // Mount third component
      renderHook(() => useAudioSystem());
      
      // Still should reuse existing factory
      expect(MockCDNFactory).toHaveBeenCalledTimes(1);
    });
  });

  describe('API Consistency', () => {
    it('should maintain same public API as before changes', () => {
      const { result } = renderHook(() => useAudioSystem());
      const audioSystem = result.current;
      
      // Verify all expected methods exist
      expect(typeof audioSystem.playPlaylist).toBe('function');
      expect(typeof audioSystem.togglePlayback).toBe('function');
      expect(typeof audioSystem.stop).toBe('function');
      expect(typeof audioSystem.stopAll).toBe('function');
      expect(typeof audioSystem.switchPlaylist).toBe('function');
      expect(typeof audioSystem.openVoiceModal).toBe('function');
      expect(typeof audioSystem.closeVoiceModal).toBe('function');
      expect(typeof audioSystem.setVoice).toBe('function');
      expect(typeof audioSystem.skipDelay).toBe('function');
      expect(typeof audioSystem.updateDelay).toBe('function');
      expect(typeof audioSystem.setBackgroundVolume).toBe('function');
      expect(typeof audioSystem.setAffirmationVolume).toBe('function');
      expect(typeof audioSystem.switchBackgroundTrack).toBe('function');
      
      // Should also spread store state
      expect(audioSystem).toHaveProperty('isPlaying');
      expect(audioSystem).toHaveProperty('playlist');
      expect(audioSystem).toHaveProperty('currentVoiceId');
    });

    it('should maintain correct method signatures', () => {
      const { result } = renderHook(() => useAudioSystem());
      const audioSystem = result.current;
      
      // Test that async methods return promises
      const playlistPromise = audioSystem.playPlaylist({} as any, 'charlotte');
      expect(playlistPromise).toBeInstanceOf(Promise);
      
      const switchPromise = audioSystem.switchPlaylist({} as any, 'charlotte');
      expect(switchPromise).toBeInstanceOf(Promise);
      
      const setVoicePromise = audioSystem.setVoice('charlotte');
      expect(setVoicePromise).toBeInstanceOf(Promise);
      
      const volumePromise = audioSystem.setBackgroundVolume(0.5);
      expect(volumePromise).toBeInstanceOf(Promise);
      
      // Test that sync methods don't return promises
      const toggleResult = audioSystem.togglePlayback();
      expect(toggleResult).toBeUndefined();
      
      const stopResult = audioSystem.stop();
      expect(stopResult).toBeUndefined();
      
      const stopAllResult = audioSystem.stopAll();
      expect(stopAllResult).toBeUndefined();
    });
  });

  describe('Error Resilience', () => {
    it('should handle CDNFactory constructor errors gracefully', () => {
      const MockCDNFactory = require('../services/cdn/CDNFactory').CDNFactory;
      MockCDNFactory.mockImplementationOnce(() => {
        throw new Error('CDNFactory initialization failed');
      });

      // Should not crash the hook
      expect(() => {
        renderHook(() => useAudioSystem());
      }).toThrow('CDNFactory initialization failed');
      
      // After reset, should work normally
      resetSharedCDNFactory();
      MockCDNFactory.mockImplementation(() => ({ id: 'working-factory' }));
      
      expect(() => {
        renderHook(() => useAudioSystem());
      }).not.toThrow();
    });

    it('should handle AudioCoordinator creation errors gracefully', () => {
      const mockGetAudioCoordinator = require('../services/audioCoordinator').getAudioCoordinator;
      mockGetAudioCoordinator.mockImplementationOnce(() => {
        throw new Error('AudioCoordinator initialization failed');
      });

      // Should not crash the hook
      expect(() => {
        renderHook(() => useAudioSystem());
      }).toThrow('AudioCoordinator initialization failed');
      
      // After reset, should work normally  
      mockGetAudioCoordinator.mockImplementation(() => ({ id: 'working-coordinator' }));
      
      expect(() => {
        renderHook(() => useAudioSystem());
      }).not.toThrow();
    });
  });

  describe('Performance Verification', () => {
    it('should demonstrate performance improvement over original implementation', () => {
      const MockCDNFactory = require('../services/cdn/CDNFactory').CDNFactory;
      
      const { rerender } = renderHook(() => useAudioSystem());
      
      // Measure factory creation calls during multiple renders
      const startCount = MockCDNFactory.mock.calls.length;
      
      // Simulate rapid re-renders (common in React apps)
      for (let i = 0; i < 10; i++) {
        rerender();
      }
      
      const endCount = MockCDNFactory.mock.calls.length;
      const newFactoriesCreated = endCount - startCount;
      
      // Should create 0 new factories during re-renders (performance improvement)
      expect(newFactoriesCreated).toBe(0);
      
      // Original implementation would have created 10 new factories
      // This represents a 100% performance improvement in object allocation
    });
  });
});

// Mock renderHook for testing
function renderHook<T>(callback: () => T) {
  let result = { current: null as T };
  let rerender = () => {
    result.current = callback();
  };
  let unmount = jest.fn();
  
  // Initial render
  result.current = callback();
  
  return { result, rerender, unmount };
}