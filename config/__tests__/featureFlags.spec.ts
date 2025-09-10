import { getFeatureFlags, isFeatureEnabled } from '../featureFlags';

describe('Feature Flags', () => {
  
  beforeEach(() => {
    // Clear any environment variables
    delete process.env.EXPO_PUBLIC_FEATURE_MULTI_VOICE;
  });

  describe('getFeatureFlags', () => {
    it('should return default flags', () => {
      const flags = getFeatureFlags();
      
      expect(flags).toEqual({
        enableMultiVoiceSupport: true, // Updated to match current default
      });
    });

    it('should override with environment variables', () => {
      process.env.EXPO_PUBLIC_FEATURE_MULTI_VOICE = 'true';
      
      const flags = getFeatureFlags();
      
      expect(flags.enableMultiVoiceSupport).toBe(true);
    });

    it('should handle false environment variables', () => {
      process.env.EXPO_PUBLIC_FEATURE_MULTI_VOICE = 'false';
      
      const flags = getFeatureFlags();
      
      expect(flags.enableMultiVoiceSupport).toBe(false);
    });

    it('should ignore invalid environment values', () => {
      process.env.EXPO_PUBLIC_FEATURE_MULTI_VOICE = 'invalid';
      
      const flags = getFeatureFlags();
      
      expect(flags.enableMultiVoiceSupport).toBe(false);
    });
  });

  describe('isFeatureEnabled', () => {
    it('should return true for enabled feature by default', () => {
      expect(isFeatureEnabled('enableMultiVoiceSupport')).toBe(true);
    });

    it('should return true when enabled via environment', () => {
      process.env.EXPO_PUBLIC_FEATURE_MULTI_VOICE = 'true';
      
      expect(isFeatureEnabled('enableMultiVoiceSupport')).toBe(true);
    });
  });
});