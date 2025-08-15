/**
 * Tests for CDNFactory
 * Tests factory creation, configuration loading, and client switching
 */

import type { ICDNClient } from '../services/cdn/types';

// Mock the settings file
jest.mock('../settings.json', () => ({
  cdn: {
    clientType: 'local',
    enableCache: true,
    requestTimeout: 5000,
    retryAttempts: 3,
    manifestPath: '../assets/voices/manifest.json'
  },
  features: {
    cdnEnabled: true,
    debugLogging: false
  }
}), { virtual: true });

// Mock LocalLibraryClient
jest.mock('../services/cdn/LocalLibraryClient', () => ({
  LocalLibraryClient: jest.fn().mockImplementation((config) => ({
    loadManifest: jest.fn().mockResolvedValue({
      version: '1.0.0',
      voices: []
    }),
    getPlayableUrl: jest.fn().mockResolvedValue('mock-asset'),
    isAvailable: jest.fn().mockReturnValue(true),
    prefetch: jest.fn().mockResolvedValue(undefined),
    getStats: jest.fn().mockReturnValue({
      manifestLoaded: true,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0
    }),
    reset: jest.fn(),
    config
  }))
}));

describe('CDNFactory', () => {
  let factory: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Import here to ensure mocks are applied
    const { CDNFactory } = require('../services/cdn/CDNFactory');
    factory = new CDNFactory();
  });

  describe('configuration loading', () => {
    test('should load configuration from settings.json', () => {
      const config = factory.getConfig();
      
      expect(config).toHaveProperty('clientType', 'local');
      expect(config).toHaveProperty('enableCache', true);
      expect(config).toHaveProperty('requestTimeout', 5000);
      expect(config).toHaveProperty('retryAttempts', 3);
      expect(config).toHaveProperty('manifestPath', '../assets/voices/manifest.json');
    });

    test('should include feature flags', () => {
      const config = factory.getConfig();
      
      expect(config).toHaveProperty('features');
      expect(config.features).toHaveProperty('cdnEnabled', true);
      expect(config.features).toHaveProperty('debugLogging', false);
    });

    test('should provide default configuration when settings missing', () => {
      // Test with missing settings
      jest.doMock('../settings.json', () => ({}), { virtual: true });
      
      const { CDNFactory } = require('../services/cdn/CDNFactory');
      const factoryWithDefaults = new CDNFactory();
      const config = factoryWithDefaults.getConfig();
      
      expect(config.clientType).toBe('local'); // Default
      expect(config.enableCache).toBe(true); // Default
      expect(config.requestTimeout).toBeGreaterThan(0); // Has default
    });
  });

  describe('client creation', () => {
    test('should create LocalLibraryClient by default', () => {
      const client = factory.createClient();
      
      expect(client).toBeDefined();
      expect(client.loadManifest).toBeDefined();
      expect(client.getPlayableUrl).toBeDefined();
      expect(client.isAvailable).toBeDefined();
      
      // Check that LocalLibraryClient was instantiated with config
      const { LocalLibraryClient } = require('../services/cdn/LocalLibraryClient');
      expect(LocalLibraryClient).toHaveBeenCalledWith({
        enableCache: true,
        requestTimeout: 5000,
        retryAttempts: 3,
        manifestPath: '../assets/voices/manifest.json',
        cacheMaxSize: 100
      });
    });

    test('should create client with specified type', () => {
      const client = factory.createClient('local');
      
      expect(client).toBeDefined();
      
      const { LocalLibraryClient } = require('../services/cdn/LocalLibraryClient');
      expect(LocalLibraryClient).toHaveBeenCalled();
    });

    test('should pass configuration to client', () => {
      const customConfig = {
        enableCache: false,
        requestTimeout: 10000,
        manifestPath: 'custom/path.json'
      };
      
      const client = factory.createClient('local', customConfig);
      
      const { LocalLibraryClient } = require('../services/cdn/LocalLibraryClient');
      expect(LocalLibraryClient).toHaveBeenCalledWith(
        expect.objectContaining(customConfig)
      );
    });

    test('should throw error for unsupported client type', () => {
      expect(() => {
        factory.createClient('unsupported');
      }).toThrow('Unsupported CDN client type: unsupported');
    });
  });

  describe('default client management', () => {
    test('should return same default client instance', () => {
      const client1 = factory.getDefaultClient();
      const client2 = factory.getDefaultClient();
      
      expect(client1).toBe(client2);
    });

    test('should create new default client after reset', () => {
      const client1 = factory.getDefaultClient();
      factory.resetDefaultClient();
      const client2 = factory.getDefaultClient();
      
      expect(client1).not.toBe(client2);
    });

    test('should use configured client type for default', () => {
      const client = factory.getDefaultClient();
      
      expect(client).toBeDefined();
      
      const { LocalLibraryClient } = require('../services/cdn/LocalLibraryClient');
      expect(LocalLibraryClient).toHaveBeenCalled();
    });
  });

  describe('client switching', () => {
    test('should switch client type and recreate default', () => {
      const client1 = factory.getDefaultClient();
      
      factory.switchClientType('local');
      const client2 = factory.getDefaultClient();
      
      expect(client1).not.toBe(client2);
    });

    test('should update configuration when switching', () => {
      factory.switchClientType('local');
      
      const config = factory.getConfig();
      expect(config.clientType).toBe('local');
    });

    test('should throw error when switching to unsupported type', () => {
      expect(() => {
        factory.switchClientType('invalid');
      }).toThrow('Unsupported CDN client type: invalid');
    });
  });

  describe('environment detection', () => {
    test('should detect development environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const { CDNFactory } = require('../services/cdn/CDNFactory');
      const devFactory = new CDNFactory();
      
      expect(devFactory.isDevelopment()).toBe(true);
      
      process.env.NODE_ENV = originalEnv;
    });

    test('should detect production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const { CDNFactory } = require('../services/cdn/CDNFactory');
      const prodFactory = new CDNFactory();
      
      expect(prodFactory.isDevelopment()).toBe(false);
      
      process.env.NODE_ENV = originalEnv;
    });

    test('should adjust defaults based on environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      // Test that development mode might have different defaults
      const { CDNFactory } = require('../services/cdn/CDNFactory');
      const devFactory = new CDNFactory();
      const config = devFactory.getConfig();
      
      // In development, might enable debug logging by default
      expect(config).toBeDefined();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('utility methods', () => {
    test('should list available client types', () => {
      const types = factory.getAvailableClientTypes();
      
      expect(Array.isArray(types)).toBe(true);
      expect(types).toContain('local');
      expect(types.length).toBeGreaterThan(0);
    });

    test('should validate client configuration', () => {
      const validConfig = {
        clientType: 'local',
        enableCache: true,
        requestTimeout: 5000
      };
      
      expect(() => factory.validateConfig(validConfig)).not.toThrow();
    });

    test('should reject invalid configuration', () => {
      const invalidConfig = {
        clientType: 'invalid',
        requestTimeout: -1
      };
      
      expect(() => factory.validateConfig(invalidConfig)).toThrow();
    });

    test('should get client statistics through factory', () => {
      const client = factory.getDefaultClient();
      const stats = factory.getClientStats();
      
      expect(stats).toHaveProperty('manifestLoaded');
      expect(stats).toHaveProperty('totalRequests');
    });
  });

  describe('error handling', () => {
    test('should handle missing settings.json gracefully', () => {
      // Mock missing settings file
      jest.doMock('../settings.json', () => {
        throw new Error('Module not found');
      }, { virtual: true });
      
      expect(() => {
        const { CDNFactory } = require('../services/cdn/CDNFactory');
        new CDNFactory();
      }).not.toThrow();
    });

    test('should handle malformed settings.json gracefully', () => {
      // Mock invalid JSON
      jest.doMock('../settings.json', () => null, { virtual: true });
      
      expect(() => {
        const { CDNFactory } = require('../services/cdn/CDNFactory');
        new CDNFactory();
      }).not.toThrow();
    });

    test('should provide helpful error messages', () => {
      expect(() => {
        factory.createClient('nonexistent');
      }).toThrow('Unsupported CDN client type: nonexistent');
    });
  });

  describe('configuration merging', () => {
    test('should merge custom config with defaults', () => {
      const customConfig = {
        requestTimeout: 10000,
        customOption: 'test'
      };
      
      const client = factory.createClient('local', customConfig);
      
      const { LocalLibraryClient } = require('../services/cdn/LocalLibraryClient');
      const lastCall = LocalLibraryClient.mock.calls[LocalLibraryClient.mock.calls.length - 1];
      const finalConfig = lastCall[0];
      
      expect(finalConfig.requestTimeout).toBe(10000); // Custom value
      expect(finalConfig.enableCache).toBe(true); // Default value
      expect(finalConfig.customOption).toBe('test'); // Custom option
    });

    test('should override defaults with custom values', () => {
      const customConfig = {
        enableCache: false, // Override default true
        retryAttempts: 1 // Override default 3
      };
      
      factory.createClient('local', customConfig);
      
      const { LocalLibraryClient } = require('../services/cdn/LocalLibraryClient');
      const lastCall = LocalLibraryClient.mock.calls[LocalLibraryClient.mock.calls.length - 1];
      const finalConfig = lastCall[0];
      
      expect(finalConfig.enableCache).toBe(false);
      expect(finalConfig.retryAttempts).toBe(1);
    });
  });
});