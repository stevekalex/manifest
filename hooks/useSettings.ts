import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/utils/api';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorHandler } from '@/utils/errorHandler';

export interface UserSettings {
  dark_mode: boolean;
  notifications: boolean;
  default_volume: number;
  delay_between_affirmations: number;
}

export interface UseSettingsReturn {
  settings: UserSettings | null;
  isLoading: boolean;
  error: string | null;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  saveSettings: () => Promise<void>;
  hasUnsavedChanges: boolean;
}

const defaultSettings: UserSettings = {
  dark_mode: false,
  notifications: true,
  default_volume: 50,
  delay_between_affirmations: 3,
};

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Keep track of original settings to detect changes
  const originalSettings = useRef<UserSettings | null>(null);
  
  // Get auth state for debugging
  const { isAuthenticated, user } = useAuth();

  // Load settings from backend
  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check authentication state before making API calls
      if (!isAuthenticated) {
        console.log('📋 User not authenticated - using default settings');
        setSettings(defaultSettings);
        originalSettings.current = { ...defaultSettings };
        setHasUnsavedChanges(false);
        setIsLoading(false);
        return;
      }
      
      console.log('⚙️ Loading user settings from backend...');
      console.log('🔍 Debug: Auth state check:', {
        isAuthenticated,
        hasUser: !!user,
        userId: user?.id,
        email: user?.email
      });
      
      const response = await apiClient.getSettings();
      
      if (ErrorHandler.handleApiError(response, {
        showAlert: false,
        title: 'Settings Error',
        fallbackMessage: 'Failed to load settings. Using defaults.',
        onError: (error) => {
          console.error('❌ Failed to load settings:', error);
          setError(error);
        }
      })) {
        return;
      }

      if (response.data?.settings) {
        const loadedSettings = response.data.settings;
        console.log('✅ Settings loaded successfully:', loadedSettings);
        
        setSettings(loadedSettings);
        originalSettings.current = { ...loadedSettings };
        setHasUnsavedChanges(false);
      } else {
        throw new Error('Invalid settings response format');
      }
    } catch (error) {
      console.error('❌ Failed to load settings:', error);
      setError(error instanceof Error ? error.message : 'Failed to load settings');
      
      // Fall back to default settings
      console.log('📋 Using default settings as fallback');
      setSettings(defaultSettings);
      originalSettings.current = { ...defaultSettings };
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  // Update a single setting locally
  const updateSetting = useCallback(<K extends keyof UserSettings>(
    key: K, 
    value: UserSettings[K]
  ) => {
    console.log(`⚙️ Updating setting ${key}:`, value);
    
    setSettings(prev => {
      if (!prev) return prev;
      
      const newSettings = { ...prev, [key]: value };
      
      // Check if we have unsaved changes
      if (originalSettings.current) {
        const hasChanges = Object.keys(newSettings).some(k => {
          const settingKey = k as keyof UserSettings;
          return newSettings[settingKey] !== originalSettings.current![settingKey];
        });
        setHasUnsavedChanges(hasChanges);
      }
      
      return newSettings;
    });
  }, []);

  // Save settings to backend
  const saveSettings = useCallback(async () => {
    if (!settings || !hasUnsavedChanges || isSaving) {
      console.log('⚙️ No settings to save, no changes detected, or already saving');
      return;
    }

    setIsSaving(true);

    // If user is not authenticated, just save locally
    if (!isAuthenticated) {
      console.log('📋 [SETTINGS DEBUG] User not authenticated - saving settings locally only');
      console.log('🔍 [SETTINGS DEBUG] Current auth state:', {
        isAuthenticated,
        hasUser: !!user,
        userId: user?.id,
        settingsToSave: settings
      });
      originalSettings.current = { ...settings };
      setHasUnsavedChanges(false);
      setError(null);
      setIsSaving(false);
      return;
    }

    try {
      console.log('💾 [SETTINGS DEBUG] User IS authenticated - saving to backend...');
      console.log('🔍 [SETTINGS DEBUG] Authenticated save state:', {
        isAuthenticated,
        hasUser: !!user,
        userId: user?.id,
        settingsToSave: settings
      });
      
      // Only send fields that have changed
      const changedSettings: Partial<UserSettings> = {};
      if (originalSettings.current) {
        Object.keys(settings).forEach(key => {
          const settingKey = key as keyof UserSettings;
          if (settings[settingKey] !== originalSettings.current![settingKey]) {
            (changedSettings as any)[settingKey] = settings[settingKey];
          }
        });
      } else {
        // If no original settings, send all
        Object.assign(changedSettings, settings);
      }

      console.log('🔍 [SETTINGS DEBUG] Data being sent to backend:', {
        changedSettings,
        originalSettings: originalSettings.current,
        currentSettings: settings
      });

      const response = await apiClient.updateSettings(changedSettings);
      
      if (ErrorHandler.handleApiError(response, {
        showAlert: false,
        title: 'Settings Error',
        fallbackMessage: 'Failed to save settings. Please try again.',
        onError: (error) => {
          console.error('❌ Failed to save settings:', error);
          setError(error);
        }
      })) {
        return;
      }

      console.log('✅ Settings saved successfully');
      
      // Update original settings to reflect saved state
      originalSettings.current = { ...settings };
      setHasUnsavedChanges(false);
      setError(null);
      
    } catch (error) {
      console.error('❌ Failed to save settings:', error);
      setError(error instanceof Error ? error.message : 'Failed to save settings');
      throw error; // Re-throw so caller can handle
    } finally {
      setIsSaving(false);
    }
  }, [settings, hasUnsavedChanges, isAuthenticated, isSaving, user]);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Debug: Log auth state changes
  useEffect(() => {
    console.log('🔍 [SETTINGS DEBUG] Auth state changed:', {
      isAuthenticated,
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      timestamp: new Date().toISOString()
    });
  }, [isAuthenticated, user]);

  return {
    settings,
    isLoading,
    error,
    updateSetting,
    saveSettings,
    hasUnsavedChanges,
  };
}