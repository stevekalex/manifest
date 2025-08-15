/**
 * Tests for AudioCoordinator CDN Integration
 * Tests CDN client injection and URLResolver integration in AudioCoordinator
 */

import { AudioCoordinator } from '../services/audioCoordinator';
import { CDNFactory } from '../services/cdn/CDNFactory';
import type { ICDNClient } from '../services/cdn/types';

// Mock dependencies
jest.mock('xstate', () => ({
  createActor: jest.fn(() => ({
    send: jest.fn(),
    getSnapshot: jest.fn(() => ({
      matches: jest.fn(() => false),
      value: 'idle',
      context: {}
    })),
    start: jest.fn(),
    stop: jest.fn(),
    subscribe: jest.fn(() => ({ unsubscribe: jest.fn() }))
  })),
  fromPromise: jest.fn()
}));

jest.mock('../services/audioMachine', () => ({
  audioMachine: {
    provide: jest.fn(() => ({
      // Mock machine
    }))
  }
}));

jest.mock('../services/audioPlaybackService');
jest.mock('../services/bundledAssets');
jest.mock('../services/urlResolver');
jest.mock('../services/delayTimerManager', () => ({
  getDelayTimerManager: () => ({
    createManagedTimer: jest.fn()
  })
}));
jest.mock('../store/audioStore', () => ({
  useAudioStore: {
    getState: jest.fn(() => ({
      playlist: null,
      currentVoiceId: 'serenity'
    }))
  }
}));

// Mock React Native dependencies
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    currentState: 'active'
  }
}));

// Mock CDNFactory
class MockCDNFactory extends CDNFactory {
  createClient() {
    return {
      loadManifest: jest.fn().mockResolvedValue({
        version: '1.0.0',
        voices: []
      }),
      getPlayableUrl: jest.fn().mockResolvedValue('mock-cdn-url'),
      isAvailable: jest.fn().mockReturnValue(true),
      prefetch: jest.fn().mockResolvedValue(undefined),
      getStats: jest.fn().mockReturnValue({
        manifestLoaded: true,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0
      }),
      reset: jest.fn()
    } as ICDNClient;
  }

  getDefaultClient() {
    return this.createClient();
  }
}

describe('AudioCoordinator CDN Integration', () => {
  let originalConsoleLog: typeof console.log;
  let mockCDNFactory: MockCDNFactory;

  beforeEach(() => {
    jest.clearAllMocks();
    originalConsoleLog = console.log;
    console.log = jest.fn(); // Suppress logging during tests
    
    mockCDNFactory = new MockCDNFactory();
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  describe('constructor dependency injection', () => {
    test('should work without CDN factory (backward compatibility)', () => {
      expect(() => {
        new AudioCoordinator();
      }).not.toThrow();
    });

    test('should accept CDN factory in constructor', () => {
      expect(() => {
        new AudioCoordinator(mockCDNFactory);
      }).not.toThrow();
    });

    test('should create URLResolver with CDN client when factory provided', () => {
      const coordinator = new AudioCoordinator(mockCDNFactory);
      expect(coordinator).toBeDefined();
      
      // Verify logging indicates CDN integration
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('CDN-enabled URLResolver')
      );
    });

    test('should create URLResolver without CDN when no factory provided', () => {
      const coordinator = new AudioCoordinator();
      expect(coordinator).toBeDefined();
      
      // Should use standard logging
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Initialized with direct dependencies')
      );
    });
  });

  describe('URLResolver integration', () => {
    test('should pass URLResolver with CDN to AudioPlaybackService', () => {
      const { AudioPlaybackService } = require('../services/audioPlaybackService');
      
      new AudioCoordinator(mockCDNFactory);
      
      // Verify AudioPlaybackService was called with URLResolver
      expect(AudioPlaybackService).toHaveBeenCalledWith(
        undefined, // queue config
        expect.any(Object) // URLResolver
      );
    });

    test('should pass URLResolver without CDN when no factory provided', () => {
      const { AudioPlaybackService } = require('../services/audioPlaybackService');
      
      new AudioCoordinator();
      
      // Should still pass URLResolver, just without CDN
      expect(AudioPlaybackService).toHaveBeenCalledWith(
        undefined,
        expect.any(Object)
      );
    });
  });

  describe('CDN configuration', () => {
    test('should use CDN factory settings', () => {
      const customFactory = new MockCDNFactory();
      const mockGetDefaultClient = jest.spyOn(customFactory, 'getDefaultClient');
      
      new AudioCoordinator(customFactory);
      
      expect(mockGetDefaultClient).toHaveBeenCalled();
    });

    test('should handle CDN factory errors gracefully', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const failingFactory = {
        getDefaultClient: jest.fn().mockImplementation(() => {
          throw new Error('CDN initialization failed');
        })
      } as any;
      
      expect(() => {
        new AudioCoordinator(failingFactory);
      }).not.toThrow();
      
      // Should warn about CDN failure
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize CDN client'),
        expect.any(Error)
      );
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('error handling and fallback', () => {
    test('should continue working if CDN client creation fails', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const unstableFactory = {
        getDefaultClient: jest.fn()
          .mockImplementationOnce(() => {
            throw new Error('CDN service unavailable');
          })
      } as any;
      
      const coordinator = new AudioCoordinator(unstableFactory);
      expect(coordinator).toBeDefined();
      
      // Should have warned about the error and continued
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize CDN client'),
        expect.any(Error)
      );
      
      consoleWarnSpy.mockRestore();
    });

    test('should gracefully handle null CDN factory', () => {
      expect(() => {
        new AudioCoordinator(null as any);
      }).not.toThrow();
    });

    test('should gracefully handle undefined CDN factory', () => {
      expect(() => {
        new AudioCoordinator(undefined as any);
      }).not.toThrow();
    });
  });

  describe('logging and debugging', () => {
    test('should log CDN integration status', () => {
      new AudioCoordinator(mockCDNFactory);
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('CDN-enabled URLResolver created')
      );
    });

    test('should log when CDN is not available', () => {
      new AudioCoordinator();
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Initialized with direct dependencies')
      );
    });

    test('should log CDN client statistics', () => {
      const mockClient = {
        getStats: jest.fn().mockReturnValue({
          manifestLoaded: true,
          totalRequests: 5,
          successfulRequests: 4,
          failedRequests: 1
        })
      } as any;
      
      const statsFactory = {
        getDefaultClient: jest.fn().mockReturnValue(mockClient)
      } as any;
      
      new AudioCoordinator(statsFactory);
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('CDN client stats:'),
        expect.objectContaining({
          manifestLoaded: true,
          totalRequests: 5,
          successfulRequests: 4,
          failedRequests: 1
        })
      );
    });
  });

  describe('configuration validation', () => {
    test('should validate CDN factory has required methods', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const invalidFactory = {
        // Missing getDefaultClient method
      } as any;
      
      expect(() => {
        new AudioCoordinator(invalidFactory);
      }).not.toThrow();
      
      // Should warn about invalid factory
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid CDN factory')
      );
      
      consoleWarnSpy.mockRestore();
    });

    test('should handle CDN client missing required methods', () => {
      const invalidClientFactory = {
        getDefaultClient: jest.fn().mockReturnValue({
          // Missing required ICDNClient methods
        })
      } as any;
      
      expect(() => {
        new AudioCoordinator(invalidClientFactory);
      }).not.toThrow();
    });
  });

  describe('backward compatibility', () => {
    test('should maintain identical behavior when no CDN factory provided', () => {
      const { AudioPlaybackService } = require('../services/audioPlaybackService');
      const { URLResolver } = require('../services/urlResolver');
      const { BundledAssets } = require('../services/bundledAssets');
      
      new AudioCoordinator();
      
      // Should create all dependencies as before
      expect(AudioPlaybackService).toHaveBeenCalled();
      expect(URLResolver).toHaveBeenCalled();
      expect(BundledAssets).toHaveBeenCalled();
    });

    test('should not break existing AudioCoordinator usage patterns', () => {
      // Test that existing instantiation patterns continue to work
      const coordinator1 = new AudioCoordinator();
      const coordinator2 = new AudioCoordinator();
      
      expect(coordinator1).toBeDefined();
      expect(coordinator2).toBeDefined();
      expect(coordinator1).not.toBe(coordinator2);
    });
  });

  describe('performance considerations', () => {
    test('should not significantly impact initialization time', () => {
      const startTime = Date.now();
      new AudioCoordinator(mockCDNFactory);
      const duration = Date.now() - startTime;
      
      // Initialization should be fast (arbitrary threshold for test environment)
      expect(duration).toBeLessThan(100);
    });

    test('should initialize CDN client asynchronously when possible', () => {
      // This tests that CDN initialization doesn't block constructor
      const slowFactory = {
        getDefaultClient: jest.fn().mockImplementation(() => {
          // Simulate slow CDN initialization
          const client = mockCDNFactory.getDefaultClient();
          client.loadManifest = jest.fn().mockImplementation(
            () => new Promise(resolve => setTimeout(resolve, 50))
          );
          return client;
        })
      } as any;
      
      const startTime = Date.now();
      new AudioCoordinator(slowFactory);
      const duration = Date.now() - startTime;
      
      // Constructor should not wait for manifest loading
      expect(duration).toBeLessThan(50);
    });
  });
});