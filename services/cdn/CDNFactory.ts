import type { ICDNClient, CDNClientConfig } from './types';
import { LocalLibraryClient } from './LocalLibraryClient';
import { RemoteCDNClient } from './RemoteCDNClient';

/**
 * CDN Client Factory
 * 
 * Factory pattern for creating appropriate CDN clients based on configuration.
 * Supports swappable client types with environment-specific defaults.
 */

export type CDNClientType = 'local' | 'remote' | 'mock';

interface CDNFactoryConfig {
  clientType: CDNClientType;
  enableCache: boolean;
  requestTimeout: number;
  retryAttempts: number;
  manifestPath: string;
  cacheMaxSize: number;
  // Remote CDN configuration
  cloudflare?: {
    baseUrl: string;
    key: string;
    concurrency?: number;
  };
  features: {
    cdnEnabled: boolean;
    debugLogging: boolean;
    prefetchEnabled: boolean;
  };
  environment: {
    development: {
      debugLogging: boolean;
      requestTimeout: number;
    };
    production: {
      debugLogging: boolean;
      requestTimeout: number;
    };
  };
}

export class CDNFactory {
  private config: CDNFactoryConfig;
  private defaultClient: ICDNClient | null = null;
  private readonly environment: 'development' | 'production';

  constructor() {
    this.environment = this.detectEnvironment();
    this.config = this.loadConfiguration();
  }

  /**
   * Get current factory configuration
   */
  getConfig(): CDNFactoryConfig {
    return { ...this.config };
  }

  /**
   * Create a CDN client of specified type
   */
  createClient(type?: CDNClientType, customConfig?: Partial<CDNClientConfig>): ICDNClient {
    const clientType = type || this.config.clientType;
    
    // Validate client type
    if (!this.getAvailableClientTypes().includes(clientType)) {
      throw new Error(`Unsupported CDN client type: ${clientType}`);
    }

    // Merge configuration
    const finalConfig = this.mergeConfig(customConfig);

    switch (clientType) {
      case 'local':
        return new LocalLibraryClient(finalConfig);
      
      case 'remote':
        return this.createRemoteClient(finalConfig);
      
      case 'mock':
        // Future implementation for testing
        console.warn('🔄 [CDN-FACTORY] Mock client not implemented, falling back to local');
        return new LocalLibraryClient(finalConfig);
      
      default:
        throw new Error(`Unsupported CDN client type: ${clientType}`);
    }
  }

  /**
   * Get or create default client instance
   */
  getDefaultClient(): ICDNClient {
    if (!this.defaultClient) {
      this.defaultClient = this.createClient();
      console.log(`📦 [CDN-FACTORY] Created default ${this.config.clientType} client`);
    }
    
    return this.defaultClient;
  }

  /**
   * Reset default client (forces recreation on next access)
   */
  resetDefaultClient(): void {
    this.defaultClient = null;
    console.log(`🔄 [CDN-FACTORY] Default client reset`);
  }

  /**
   * Switch client type and reset default client
   */
  switchClientType(newType: CDNClientType): void {
    if (!this.getAvailableClientTypes().includes(newType)) {
      throw new Error(`Unsupported CDN client type: ${newType}`);
    }

    this.config.clientType = newType;
    this.resetDefaultClient();
    
    console.log(`🔄 [CDN-FACTORY] Switched to ${newType} client type`);
  }

  /**
   * Check if running in development environment
   */
  isDevelopment(): boolean {
    return this.environment === 'development';
  }

  /**
   * Get list of available client types
   */
  getAvailableClientTypes(): CDNClientType[] {
    return ['local', 'remote', 'mock'];
  }

  /**
   * Validate client configuration
   */
  validateConfig(config: Partial<CDNFactoryConfig>): void {
    if (config.clientType && !this.getAvailableClientTypes().includes(config.clientType)) {
      throw new Error(`Invalid client type: ${config.clientType}`);
    }
    
    if (config.requestTimeout !== undefined && config.requestTimeout <= 0) {
      throw new Error('Request timeout must be positive');
    }
    
    if (config.retryAttempts !== undefined && config.retryAttempts < 0) {
      throw new Error('Retry attempts must be non-negative');
    }
  }

  /**
   * Get client statistics from default client
   */
  getClientStats() {
    if (!this.defaultClient) {
      return null;
    }
    
    return this.defaultClient.getStats();
  }

  /**
   * Load configuration from settings.json with defaults
   */
  private loadConfiguration(): CDNFactoryConfig {
    try {
      const settings = require('../../settings.json');
      const envConfig = settings.environment?.[this.environment] || {};
      
      const config: CDNFactoryConfig = {
        clientType: settings.cdn?.clientType || 'local',
        enableCache: settings.cdn?.enableCache ?? true,
        requestTimeout: envConfig.requestTimeout || settings.cdn?.requestTimeout || 5000,
        retryAttempts: settings.cdn?.retryAttempts || 3,
        manifestPath: settings.cdn?.manifestPath || '../assets/voices/manifest.json',
        cacheMaxSize: settings.cdn?.cacheMaxSize || 100,
        cloudflare: settings.cdn?.cloudflare ? {
          baseUrl: settings.cdn.cloudflare.baseUrl || 'https://gentle-poetry-33dd.stevekalex.workers.dev',
          key: settings.cdn.cloudflare.key || '',
          concurrency: settings.cdn.cloudflare.concurrency || 4,
        } : undefined,
        features: {
          cdnEnabled: settings.features?.cdnEnabled ?? true,
          debugLogging: envConfig.debugLogging ?? settings.features?.debugLogging ?? false,
          prefetchEnabled: settings.features?.prefetchEnabled ?? true,
        },
        environment: settings.environment || {
          development: {
            debugLogging: true,
            requestTimeout: 10000
          },
          production: {
            debugLogging: false,
            requestTimeout: 3000
          }
        }
      };

      this.validateConfig(config);
      
      console.log(`⚙️ [CDN-FACTORY] Loaded ${this.environment} configuration: ${config.clientType} client`);
      return config;
    } catch (error) {
      console.warn(`⚠️ [CDN-FACTORY] Failed to load settings, using defaults: ${error}`);
      return this.getDefaultConfiguration();
    }
  }

  /**
   * Get default configuration when settings.json is missing or invalid
   */
  private getDefaultConfiguration(): CDNFactoryConfig {
    const isDev = this.environment === 'development';
    
    return {
      clientType: 'local',
      enableCache: true,
      requestTimeout: isDev ? 10000 : 3000,
      retryAttempts: 3,
      manifestPath: '../assets/voices/manifest.json',
      cacheMaxSize: 100,
      cloudflare: undefined,
      features: {
        cdnEnabled: true,
        debugLogging: isDev,
        prefetchEnabled: true,
      },
      environment: {
        development: {
          debugLogging: true,
          requestTimeout: 10000
        },
        production: {
          debugLogging: false,
          requestTimeout: 3000
        }
      }
    };
  }

  /**
   * Detect current environment
   */
  private detectEnvironment(): 'development' | 'production' {
    return process.env.NODE_ENV === 'production' ? 'production' : 'development';
  }

  /**
   * Create remote CDN client with Cloudflare configuration
   */
  private createRemoteClient(baseConfig: CDNClientConfig): ICDNClient {
    const cloudflareConfig = this.config.cloudflare;
    
    if (!cloudflareConfig || !cloudflareConfig.baseUrl) {
      throw new Error('Remote client requires Cloudflare configuration');
    }
    
    // Get Cloudflare key from environment variable or config
    const cloudflareKey = process.env.CLOUDFLARE_KEY || cloudflareConfig.key;
    
    if (!cloudflareKey) {
      throw new Error('CLOUDFLARE_KEY environment variable or config.cloudflare.key is required for remote client');
    }
    
    const remoteConfig = {
      ...baseConfig,
      baseUrl: cloudflareConfig.baseUrl,
      cloudflareKey,
      concurrency: cloudflareConfig.concurrency || 4,
    };
    
    console.log('📡 [CDN-FACTORY] Creating remote client with baseUrl:', cloudflareConfig.baseUrl);
    return new RemoteCDNClient(remoteConfig);
  }

  /**
   * Merge custom config with current configuration
   */
  private mergeConfig(customConfig?: Partial<CDNClientConfig>): CDNClientConfig {
    const baseConfig: CDNClientConfig = {
      manifestPath: this.config.manifestPath,
      enableCache: this.config.enableCache,
      cacheMaxSize: this.config.cacheMaxSize,
      requestTimeout: this.config.requestTimeout,
      retryAttempts: this.config.retryAttempts,
    };

    if (!customConfig) {
      return baseConfig;
    }

    return {
      ...baseConfig,
      ...customConfig,
    };
  }
}