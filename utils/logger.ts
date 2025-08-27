/**
 * Environment-aware Logger Utility
 * 
 * Provides centralized logging with automatic production disabling.
 * Replaces direct console.log usage throughout the codebase.
 */

// Environment detection
const __DEV__ = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

// Configuration from environment
const LOG_ENABLED = __DEV__ && process.env.LOG_AUDIO !== 'false';
const LOG_PREFIX = '🎵'; // Consistent prefix for all audio-related logs

/**
 * Development logging - disabled in production builds
 */
export const log = (...args: any[]): void => {
  if (LOG_ENABLED) {
    console.log(...args);
  }
};

/**
 * Warning logging - disabled in production builds
 */
export const warn = (...args: any[]): void => {
  if (LOG_ENABLED) {
    console.warn(...args);
  }
};

/**
 * Error logging - always enabled (critical for debugging production issues)
 */
export const error = (...args: any[]): void => {
  console.error(...args);
};

/**
 * Audio-specific logging with consistent prefix
 */
export const audioLog = (...args: any[]): void => {
  if (LOG_ENABLED) {
    console.log(LOG_PREFIX, ...args);
  }
};

/**
 * Audio-specific warning logging
 */
export const audioWarn = (...args: any[]): void => {
  if (LOG_ENABLED) {
    console.warn(LOG_PREFIX, ...args);
  }
};

/**
 * Audio-specific error logging - always enabled
 */
export const audioError = (...args: any[]): void => {
  console.error(LOG_PREFIX, ...args);
};

/**
 * Debug logging with caller context
 * Usage: debug('ComponentName', 'operation', data)
 */
export const debug = (component: string, operation: string, ...args: any[]): void => {
  if (LOG_ENABLED) {
    console.log(`🐛 [${component}] ${operation}:`, ...args);
  }
};

/**
 * Performance timing utility
 * Usage: const timer = startTimer('operation'); ... timer.end();
 */
export const startTimer = (label: string) => {
  if (!LOG_ENABLED) return { end: () => {} };
  
  const startTime = Date.now();
  return {
    end: () => {
      const endTime = Date.now();
      console.log(`⏱️ [PERF] ${label}: ${endTime - startTime}ms`);
    }
  };
};

/**
 * Configuration info
 */
export const LOGGER_CONFIG = {
  enabled: LOG_ENABLED,
  isDev: __DEV__,
  prefix: LOG_PREFIX,
} as const;