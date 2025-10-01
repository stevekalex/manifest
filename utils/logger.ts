/**
 * Environment-aware Logger Utility
 * 
 * Provides centralized logging with automatic production disabling.
 * Replaces direct console.log usage throughout the codebase.
 */

import { DEV_CONFIG } from '../config/development';

// Configuration from centralized config
const LOG_ENABLED = DEV_CONFIG.LOG_AUDIO;
const LOG_PREFIX = DEV_CONFIG.LOG_PREFIX;

/**
 * Development logging - disabled in production builds
 */
export const log = (...args: unknown[]): void => {
  if (LOG_ENABLED) {
    console.log(...args);
  }
};

/**
 * Warning logging - disabled in production builds
 */
export const warn = (...args: unknown[]): void => {
  if (LOG_ENABLED) {
    console.warn(...args);
  }
};

/**
 * Error logging - always enabled (critical for debugging production issues)
 */
export const error = (...args: unknown[]): void => {
  console.error(...args);
};

/**
 * Audio-specific logging with consistent prefix
 */
export const audioLog = (...args: unknown[]): void => {
  if (LOG_ENABLED) {
    console.log(LOG_PREFIX, ...args);
  }
};

/**
 * Audio-specific warning logging
 */
export const audioWarn = (...args: unknown[]): void => {
  if (LOG_ENABLED) {
    console.warn(LOG_PREFIX, ...args);
  }
};

/**
 * Audio-specific error logging - always enabled
 */
export const audioError = (...args: unknown[]): void => {
  console.error(LOG_PREFIX, ...args);
};

/**
 * Debug logging with caller context
 * Usage: debug('ComponentName', 'operation', data)
 */
export const debug = (component: string, operation: string, ...args: unknown[]): void => {
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
  isDev: DEV_CONFIG.IS_DEVELOPMENT,
  prefix: LOG_PREFIX,
} as const;