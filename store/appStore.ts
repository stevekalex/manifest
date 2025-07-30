import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppState {
  isFirstLaunch: boolean;
  lastOpenedTab: string;
  settings: {
    hapticFeedback: boolean;
    soundEnabled: boolean;
    language: string;
  };
  
  // Actions
  setFirstLaunch: (isFirst: boolean) => void;
  setLastOpenedTab: (tab: string) => void;
  updateSettings: (settings: Partial<AppState['settings']>) => void;
  resetApp: () => void;
}

const initialSettings = {
  hapticFeedback: true,
  soundEnabled: true,
  language: 'en',
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      isFirstLaunch: true,
      lastOpenedTab: 'index',
      settings: initialSettings,

      setFirstLaunch: (isFirstLaunch: boolean) => set({ isFirstLaunch }),
      
      setLastOpenedTab: (lastOpenedTab: string) => set({ lastOpenedTab }),
      
      updateSettings: (newSettings: Partial<AppState['settings']>) => {
        const currentSettings = get().settings;
        set({ 
          settings: { ...currentSettings, ...newSettings }
        });
      },
      
      resetApp: () => set({
        isFirstLaunch: true,
        lastOpenedTab: 'index',
        settings: initialSettings,
      }),
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);