/**
 * Feature Flags Configuration
 * 
 * Controls experimental features and gradual rollouts
 */

export interface FeatureFlags {
  // Multi-voice manifestation migration
  enableMultiVoiceSupport: boolean;
  
  // Future flags can be added here
  // enableNewPlayer: boolean;
  // enableAdvancedCaching: boolean;
}

/**
 * Default feature flag values
 * These can be overridden by environment variables or remote config
 */
const DEFAULT_FLAGS: FeatureFlags = {
  // Temporarily enabled for testing - backend migration already complete
  enableMultiVoiceSupport: true,
};

/**
 * Environment variable overrides
 * Format: EXPO_PUBLIC_FEATURE_<FLAG_NAME>=true/false
 */
function getEnvironmentFlags(): Partial<FeatureFlags> {
  const envFlags: Partial<FeatureFlags> = {};
  
  // Only override if explicitly set in environment
  if (process.env.EXPO_PUBLIC_FEATURE_MULTI_VOICE !== undefined) {
    envFlags.enableMultiVoiceSupport = process.env.EXPO_PUBLIC_FEATURE_MULTI_VOICE === 'true';
  }
  
  return envFlags;
}

/**
 * Get current feature flag values
 * Combines defaults with environment overrides
 */
export function getFeatureFlags(): FeatureFlags {
  const envFlags = getEnvironmentFlags();
  
  return {
    ...DEFAULT_FLAGS,
    ...envFlags,
  };
}

/**
 * Check if a specific feature is enabled
 * @param flagName - Feature flag name
 * @returns boolean indicating if feature is enabled
 */
export function isFeatureEnabled(flagName: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  return flags[flagName];
}

/**
 * Feature flag hook for React components
 * Usage: const useMultiVoice = useFeatureFlag('enableMultiVoiceSupport');
 */
export function useFeatureFlag(flagName: keyof FeatureFlags): boolean {
  return isFeatureEnabled(flagName);
}