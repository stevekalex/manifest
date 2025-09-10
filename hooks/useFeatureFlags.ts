import { useMemo } from 'react';
import { getFeatureFlags, isFeatureEnabled, type FeatureFlags } from '../config/featureFlags';

/**
 * React hook to access feature flags in components
 * @returns Object with all feature flags and helper functions
 */
export function useFeatureFlags() {
  const flags = useMemo(() => getFeatureFlags(), []);
  
  return {
    flags,
    isEnabled: (flagName: keyof FeatureFlags) => isFeatureEnabled(flagName),
    
    // Specific feature shortcuts for common use
    multiVoiceEnabled: flags.enableMultiVoiceSupport,
  };
}