import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { useAudioSystem } from '../hooks/useAudioSystem';
import { CDNFactory } from '../services/cdn/CDNFactory';
import { getAudioCoordinator, resetAudioCoordinator } from '../services/audioCoordinator';

// Mock dependencies
jest.mock('../services/cdn/CDNFactory');
jest.mock('../services/audioCoordinator');
jest.mock('../store/audioStore', () => ({
  useAudioStore: () => ({
    isPlaying: false,
    playlist: null,
    currentVoiceId: 'charlotte'
  })
}));

const MockCDNFactory = CDNFactory as jest.MockedClass<typeof CDNFactory>;
const mockGetAudioCoordinator = getAudioCoordinator as jest.MockedFunction<typeof getAudioCoordinator>;
const mockResetAudioCoordinator = resetAudioCoordinator as jest.MockedFunction<typeof resetAudioCoordinator>;

describe('useAudioSystem Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResetAudioCoordinator();
    
    // Mock coordinator with required methods
    const mockCoordinator = {
      startPlayback: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      stop: jest.fn(),
      switchPlaylist: jest.fn(),
      openVoiceModal: jest.fn(),
      closeVoiceModal: jest.fn(),
      confirmVoiceSelection: jest.fn(),
      skipDelay: jest.fn(),
      updateDelay: jest.fn(),
      setBackgroundVolume: jest.fn(),
      setAffirmationVolume: jest.fn(),
      switchBackgroundTrack: jest.fn(),
    };
    
    mockGetAudioCoordinator.mockReturnValue(mockCoordinator as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Baseline Performance Tests - Current Implementation', () => {
    it('should track CDNFactory instantiation count during multiple renders', () => {
      const { rerender } = renderHook(() => useAudioSystem());
      
      // Initial render
      expect(MockCDNFactory).toHaveBeenCalledTimes(1);
      
      // Multiple re-renders
      rerender();
      expect(MockCDNFactory).toHaveBeenCalledTimes(2);
      
      rerender();
      expect(MockCDNFactory).toHaveBeenCalledTimes(3);
      
      rerender();
      expect(MockCDNFactory).toHaveBeenCalledTimes(4);
    });

    it('should track AudioCoordinator singleton behavior', () => {
      const { rerender } = renderHook(() => useAudioSystem());
      
      // Initial render
      expect(mockGetAudioCoordinator).toHaveBeenCalledTimes(1);
      
      // Multiple re-renders should still only create one coordinator due to singleton
      rerender();
      expect(mockGetAudioCoordinator).toHaveBeenCalledTimes(2); // Called but singleton reused
      
      rerender();
      expect(mockGetAudioCoordinator).toHaveBeenCalledTimes(3);
    });

    it('should measure instance creation performance', () => {
      const startTime = performance.now();
      
      // Simulate 10 rapid re-renders
      const { rerender } = renderHook(() => useAudioSystem());
      for (let i = 0; i < 9; i++) {
        rerender();
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Performance baseline: Should complete in reasonable time (< 100ms)
      expect(totalTime).toBeLessThan(100);
      
      // Should have created 10 CDNFactory instances (performance problem)
      expect(MockCDNFactory).toHaveBeenCalledTimes(10);
      
      console.log(`Baseline performance: ${totalTime.toFixed(2)}ms for 10 renders`);
      console.log(`CDNFactory instantiations: ${MockCDNFactory.mock.calls.length}`);
      console.log(`AudioCoordinator calls: ${mockGetAudioCoordinator.mock.calls.length}`);
    });

    it('should verify current hook behavior consistency', () => {
      const { result: result1 } = renderHook(() => useAudioSystem());
      const { result: result2 } = renderHook(() => useAudioSystem());
      
      // Both hooks should return the same coordinator methods (singleton)
      expect(typeof result1.current.playPlaylist).toBe('function');
      expect(typeof result2.current.playPlaylist).toBe('function');
      
      // Store state should be consistent
      expect(result1.current.isPlaying).toBe(result2.current.isPlaying);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect memory leak potential with CDNFactory creation', () => {
      // Track memory usage pattern simulation
      const instances = [];
      
      for (let i = 0; i < 5; i++) {
        const { result } = renderHook(() => useAudioSystem());
        instances.push(result.current);
      }
      
      // Each render creates a new CDNFactory (current problem)
      expect(MockCDNFactory).toHaveBeenCalledTimes(5);
      
      // This test documents the current problematic behavior
      // After memoization fix, this should be 1
    });
  });
});