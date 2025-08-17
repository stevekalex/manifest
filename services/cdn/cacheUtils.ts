import * as FileSystem from 'expo-file-system';
import type { CanonicalTrackId } from './types';

/**
 * Simple cache utilities for CDN file management
 */

const CACHE_DIR_NAME = 'cdn-cache';

/**
 * Get the cache directory path
 */
export async function getCacheDirectory(): Promise<string> {
  if (!FileSystem.documentDirectory) {
    throw new Error('FileSystem.documentDirectory not available');
  }
  return `${FileSystem.documentDirectory}${CACHE_DIR_NAME}/`;
}

/**
 * Ensure cache directory exists
 */
export async function ensureCacheDirectoryExists(): Promise<void> {
  const cacheDir = await getCacheDirectory();
  const dirInfo = await FileSystem.getInfoAsync(cacheDir);
  
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
  }
}

/**
 * Get cached file path for a track ID
 */
export async function getCachedFilePath(trackId: CanonicalTrackId): Promise<string> {
  const cacheDir = await getCacheDirectory();
  const safeFileName = trackId.replace(':', '_') + '.mp3';
  return `${cacheDir}${safeFileName}`;
}

/**
 * Check if track is cached locally
 */
export async function isTrackCached(trackId: CanonicalTrackId): Promise<boolean> {
  try {
    const filePath = await getCachedFilePath(trackId);
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    return fileInfo.exists;
  } catch {
    return false;
  }
}

/**
 * Download file to cache
 */
export async function downloadToCache(url: string, trackId: CanonicalTrackId): Promise<string> {
  await ensureCacheDirectoryExists();
  const localPath = await getCachedFilePath(trackId);
  
  const downloadResult = await FileSystem.downloadAsync(url, localPath);
  
  if (downloadResult.status !== 200) {
    throw new Error(`Download failed: ${downloadResult.status}`);
  }
  
  return localPath;
}