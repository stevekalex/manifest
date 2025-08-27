/**
 * Development Configuration Constants
 * 
 * Centralized configuration for development-specific settings including:
 * - Logging controls
 * - Debug flags
 * - Test environment settings
 * - Mock configurations
 */

// Environment detection
const __DEV__ = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

export const DEV_CONFIG = {
  // Logging Configuration
  LOG_AUDIO: __DEV__ && process.env.LOG_AUDIO !== 'false',  // Audio system logging
  LOG_PREFIX: '🎵',                                         // Consistent prefix for audio logs
  
  // Development Flags
  USE_LOCAL_ASSETS: __DEV__,                               // Use local bundled assets in dev
  SHOW_TEST_BUTTONS: false,                                // Show debug/test UI elements
  
  // Mock/Test Configuration
  MOCK_API_DELAY: 0,                                       // Artificial delay for API calls (ms)
  
  // Environment Detection
  IS_DEVELOPMENT: __DEV__,
  IS_PRODUCTION: !__DEV__,
  
  // CDN Configuration  
  CDN_ENVIRONMENT: process.env.NODE_ENV === 'production' ? 'production' : 'development',
} as const;

// Helper functions for common environment checks
export const isDevelopment = () => DEV_CONFIG.IS_DEVELOPMENT;
export const isProduction = () => DEV_CONFIG.IS_PRODUCTION;
export const isLoggingEnabled = () => DEV_CONFIG.LOG_AUDIO;