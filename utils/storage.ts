import AsyncStorage from '@react-native-async-storage/async-storage';

export class StorageService {
  static async setItem(key: string, value: any): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error(`Error storing data for key ${key}:`, error);
      throw error;
    }
  }

  static async getItem<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error(`Error retrieving data for key ${key}:`, error);
      return null;
    }
  }

  static async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing data for key ${key}:`, error);
      throw error;
    }
  }

  static async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing AsyncStorage:', error);
      throw error;
    }
  }

  static async getAllKeys(): Promise<string[]> {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('Error getting all keys:', error);
      return [];
    }
  }

  static async multiGet(keys: string[]): Promise<[string, string | null][]> {
    try {
      return await AsyncStorage.multiGet(keys);
    } catch (error) {
      console.error('Error getting multiple keys:', error);
      return [];
    }
  }

  static async multiSet(keyValuePairs: [string, string][]): Promise<void> {
    try {
      await AsyncStorage.multiSet(keyValuePairs);
    } catch (error) {
      console.error('Error setting multiple keys:', error);
      throw error;
    }
  }

  static async multiRemove(keys: string[]): Promise<void> {
    try {
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Error removing multiple keys:', error);
      throw error;
    }
  }
}

// Utility functions for common storage operations
export const storageUtils = {
  // Store user preferences
  async saveUserPreferences(preferences: Record<string, any>): Promise<void> {
    await StorageService.setItem('userPreferences', preferences);
  },

  // Get user preferences
  async getUserPreferences(): Promise<Record<string, any> | null> {
    return await StorageService.getItem('userPreferences');
  },

  // Store app settings
  async saveAppSettings(settings: Record<string, any>): Promise<void> {
    await StorageService.setItem('appSettings', settings);
  },

  // Get app settings
  async getAppSettings(): Promise<Record<string, any> | null> {
    return await StorageService.getItem('appSettings');
  },

  // Store cached data with expiration
  async setCachedData(key: string, data: any, expirationMinutes: number = 60): Promise<void> {
    const expirationTime = Date.now() + (expirationMinutes * 60 * 1000);
    const cachedItem = {
      data,
      expiration: expirationTime,
    };
    await StorageService.setItem(`cache_${key}`, cachedItem);
  },

  // Get cached data (returns null if expired)
  async getCachedData<T>(key: string): Promise<T | null> {
    const cachedItem = await StorageService.getItem<{data: T, expiration: number}>(`cache_${key}`);
    
    if (!cachedItem) return null;
    
    if (Date.now() > cachedItem.expiration) {
      await StorageService.removeItem(`cache_${key}`);
      return null;
    }
    
    return cachedItem.data;
  },

  // Clear expired cached data
  async clearExpiredCache(): Promise<void> {
    const allKeys = await StorageService.getAllKeys();
    const cacheKeys = allKeys.filter(key => key.startsWith('cache_'));
    
    for (const key of cacheKeys) {
      const cachedItem = await StorageService.getItem<{data: any, expiration: number}>(key);
      if (cachedItem && Date.now() > cachedItem.expiration) {
        await StorageService.removeItem(key);
      }
    }
  },
};