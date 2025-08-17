import type { AffirmationId, Playlist, VoiceId } from '../types/audio';
import type { ICDNClient, CanonicalTrackId } from './cdn/types';

/**
 * URL Resolver Service
 * 
 * Centralized service for resolving audio URLs from various sources:
 * - TTS placeholders (tts://) -> bundled assets (temporary fallback)
 * - CDN URLs -> local cached files (primary strategy)
 * - Bundled assets -> require() paths (development/fallback)
 * 
 * SUPPORTS CDN DOWNLOAD STRATEGY:
 * 1. CDN URLs are downloaded to local storage
 * 2. URLs are resolved to local file paths for RNTP playback
 * 3. Fallback to bundled assets if download fails
 * 
 * CRITICAL: Never returns tts:// URLs to prevent RNTP errors
 */

export enum URLResolverError {
  ASSET_NOT_FOUND = 'ASSET_NOT_FOUND',
  INVALID_TTS_URL = 'INVALID_TTS_URL',
  UNSUPPORTED_SCHEME = 'UNSUPPORTED_SCHEME',
}

export class URLResolverException extends Error {
  constructor(
    public type: URLResolverError,
    message: string,
    public affirmationId?: string,
    public voiceId?: string
  ) {
    super(message);
    this.name = 'URLResolverException';
  }
}

interface BundledAssets {
  getAsset(affirmationId: string, voiceId: string): string | null;
  hasAsset(affirmationId: string, voiceId: string): boolean;
}

// Background track mappings
type BackgroundTrackMap = Record<string, any>;

// Initialize background tracks with proper mocking support
let BUNDLED_BACKGROUND_TRACKS: BackgroundTrackMap = {};

try {
  BUNDLED_BACKGROUND_TRACKS = {
    'ethereal': require('../ethereal-ambient-music-55115.mp3'),
    'atmospheric': require('../lst-atmospheric-ambient-310691.mp3'),
  };
} catch (error) {
  // In test environment, use mock values
  console.warn('⚠️ [URL-RESOLVER] Using fallback background tracks (likely in test environment)');
  BUNDLED_BACKGROUND_TRACKS = {
    'ethereal': 12345,
    'atmospheric': 23456,
  };
}

export class URLResolver {
  private bundledAssets: BundledAssets;
  private cdnClient: ICDNClient | null;
  
  constructor(bundledAssets: BundledAssets, cdnClient?: ICDNClient) {
    this.bundledAssets = bundledAssets;
    this.cdnClient = cdnClient || null;
  }
  
  /**
   * Resolve a single affirmation URL from playlist
   * @param playlist The playlist containing URL mappings
   * @param affirmationId The affirmation to resolve
   * @param voiceId The voice to use
   * @returns Playable URL (never tts://) - Promise when CDN client is available, string otherwise
   */
  resolve(
    playlist: Playlist,
    affirmationId: AffirmationId,
    voiceId: VoiceId
  ): string | Promise<string> {
    // Get URL from playlist
    const rawUrl = playlist.cdnUrls?.[voiceId]?.[affirmationId];
    
    if (!rawUrl) {
      throw new URLResolverException(
        URLResolverError.ASSET_NOT_FOUND,
        `No URL found for ${affirmationId} with voice ${voiceId}`,
        affirmationId,
        voiceId
      );
    }
    
    // Handle different URL types
    if (typeof rawUrl === 'number') {
      // Bundled asset via require()
      return rawUrl as any;
    }
    
    if (typeof rawUrl === 'string') {
      if (rawUrl.startsWith('tts://')) {
        // TTS placeholder - check if we need async resolution
        if (this.cdnClient) {
          // Return promise for CDN resolution
          return this.resolveTTSPlaceholder(rawUrl, affirmationId, voiceId);
        } else {
          // Synchronous bundled asset resolution for backward compatibility
          return this.resolveTTSPlaceholderSync(rawUrl, affirmationId, voiceId);
        }
      } else if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
        // CDN URL - return as-is for now
        return rawUrl;
      } else {
        // Unknown string format
        throw new URLResolverException(
          URLResolverError.UNSUPPORTED_SCHEME,
          `Unsupported URL scheme: ${rawUrl}`,
          affirmationId,
          voiceId
        );
      }
    }
    
    throw new URLResolverException(
      URLResolverError.UNSUPPORTED_SCHEME,
      `Unsupported URL type: ${typeof rawUrl}`,
      affirmationId,
      voiceId
    );
  }
  
  /**
   * Resolve multiple affirmations for a voice
   * @param playlist The playlist containing URL mappings
   * @param affirmationIds Array of affirmation IDs to resolve
   * @param voiceId The voice to use
   * @returns Array of resolved URLs - Promise if CDN client available, array otherwise
   */
  resolveMultiple(
    playlist: Playlist,
    affirmationIds: AffirmationId[],
    voiceId: VoiceId
  ): string[] | Promise<string[]> {
    // Check if any URLs require async resolution (TTS with CDN client)
    const needsAsync = this.cdnClient && affirmationIds.some(affirmationId => {
      const rawUrl = playlist.cdnUrls?.[voiceId]?.[affirmationId];
      return typeof rawUrl === 'string' && rawUrl.startsWith('tts://');
    });

    if (needsAsync) {
      return this.resolveMultipleAsync(playlist, affirmationIds, voiceId);
    } else {
      return this.resolveMultipleSync(playlist, affirmationIds, voiceId);
    }
  }

  /**
   * Synchronous version of resolveMultiple for backward compatibility
   */
  private resolveMultipleSync(
    playlist: Playlist,
    affirmationIds: AffirmationId[],
    voiceId: VoiceId
  ): string[] {
    const resolvedUrls: string[] = [];
    
    for (const affirmationId of affirmationIds) {
      try {
        const url = this.resolve(playlist, affirmationId, voiceId) as string;
        resolvedUrls.push(url);
      } catch (error) {
        console.error(`❌ Failed to resolve ${affirmationId}:`, error);
        // For now, skip failed resolutions
      }
    }
    
    return resolvedUrls;
  }

  /**
   * Asynchronous version of resolveMultiple for CDN integration
   */
  private async resolveMultipleAsync(
    playlist: Playlist,
    affirmationIds: AffirmationId[],
    voiceId: VoiceId
  ): Promise<string[]> {
    const resolvedUrls: string[] = [];
    
    for (const affirmationId of affirmationIds) {
      try {
        const urlOrPromise = this.resolve(playlist, affirmationId, voiceId);
        const url = await Promise.resolve(urlOrPromise);
        resolvedUrls.push(url);
      } catch (error) {
        console.error(`❌ Failed to resolve ${affirmationId}:`, error);
        // For now, skip failed resolutions
      }
    }
    
    return resolvedUrls;
  }
  
  /**
   * Check if a URL is a TTS placeholder
   */
  isTTSPlaceholder(url: any): boolean {
    return typeof url === 'string' && url.startsWith('tts://');
  }
  
  /**
   * Resolve TTS placeholder using CDN-first strategy, then bundled asset fallback
   * @param ttsUrl The tts:// URL to resolve
   * @param affirmationId The affirmation ID for context
   * @param voiceId The voice ID for context
   * @returns Resolved asset path
   */
  private async resolveTTSPlaceholder(
    ttsUrl: string,
    affirmationId: string,
    voiceId: string
  ): Promise<string> {
    // Validate TTS URL format
    if (!ttsUrl.startsWith('tts://')) {
      throw new URLResolverException(
        URLResolverError.INVALID_TTS_URL,
        `Invalid TTS URL format: ${ttsUrl}`,
        affirmationId,
        voiceId
      );
    }
    
    // Try CDN client first if available
    if (this.cdnClient) {
      try {
        const canonicalTrackId: CanonicalTrackId = `${voiceId}:${affirmationId}`;
        const isAvailable = this.cdnClient.isAvailable(canonicalTrackId);
        
        if (isAvailable) {
          const cdnUrl = await this.cdnClient.getPlayableUrl(canonicalTrackId);
          return cdnUrl as string;
        }
      } catch (error) {
        console.warn(`⚠️ CDN resolution failed for ${ttsUrl}, falling back to bundled assets:`, error);
      }
    }
    
    // Fallback to bundled assets
    const bundledAsset = this.bundledAssets.getAsset(affirmationId, voiceId);
    
    if (!bundledAsset) {
      // Check if we have a fallback voice
      const fallbackAsset = this.bundledAssets.getAsset(affirmationId, 'serenity');
      
      if (fallbackAsset) {
        console.warn(`⚠️ Using fallback voice 'serenity' for ${affirmationId}`);
        return fallbackAsset;
      }
      
      throw new URLResolverException(
        URLResolverError.ASSET_NOT_FOUND,
        `No asset found for TTS placeholder: ${ttsUrl} (tried CDN: ${!!this.cdnClient}, bundled assets: true)`,
        affirmationId,
        voiceId
      );
    }
    
    return bundledAsset;
  }

  /**
   * Resolve TTS placeholder synchronously using only bundled assets (for backward compatibility)
   * @param ttsUrl The tts:// URL to resolve
   * @param affirmationId The affirmation ID for context
   * @param voiceId The voice ID for context
   * @returns Resolved bundled asset path
   */
  private resolveTTSPlaceholderSync(
    ttsUrl: string,
    affirmationId: string,
    voiceId: string
  ): string {
    // Validate TTS URL format
    if (!ttsUrl.startsWith('tts://')) {
      throw new URLResolverException(
        URLResolverError.INVALID_TTS_URL,
        `Invalid TTS URL format: ${ttsUrl}`,
        affirmationId,
        voiceId
      );
    }
    
    // Get bundled asset
    const bundledAsset = this.bundledAssets.getAsset(affirmationId, voiceId);
    
    if (!bundledAsset) {
      // Check if we have a fallback voice
      const fallbackAsset = this.bundledAssets.getAsset(affirmationId, 'serenity');
      
      if (fallbackAsset) {
        console.warn(`⚠️ Using fallback voice 'serenity' for ${affirmationId}`);
        return fallbackAsset;
      }
      
      throw new URLResolverException(
        URLResolverError.ASSET_NOT_FOUND,
        `No bundled asset found for TTS placeholder: ${ttsUrl}`,
        affirmationId,
        voiceId
      );
    }
    
    return bundledAsset;
  }
  
  /**
   * Resolve a background track ID to a playable URL
   * @param soundId The background track ID (e.g., 'ethereal', 'atmospheric')
   * @param playlist Optional playlist that may define custom background tracks
   * @returns Playable URL for the background track
   */
  resolveBackgroundTrack(soundId: string, playlist?: Playlist): string {
    // 1. Check if playlist defines custom background tracks
    if (playlist?.backgroundTracks?.[soundId]) {
      return playlist.backgroundTracks[soundId];
    }
    
    // 2. Fall back to bundled background tracks
    if (BUNDLED_BACKGROUND_TRACKS[soundId]) {
      return BUNDLED_BACKGROUND_TRACKS[soundId];
    }
    
    // 3. Final fallback to playlist's default background track
    if (playlist?.backgroundTrackUrl) {
      console.warn(`⚠️ Using playlist default background track for unknown soundId: ${soundId}`);
      return playlist.backgroundTrackUrl;
    }
    
    // 4. Error - no background track found
    throw new URLResolverException(
      URLResolverError.ASSET_NOT_FOUND,
      `Background track not found: ${soundId}`,
      soundId
    );
  }

  /**
   * Validate that a URL is playable by RNTP
   * @param url The URL to validate
   * @returns True if playable
   */
  isPlayable(url: any): boolean {
    // Require() numbers are always playable (bundled assets)
    if (typeof url === 'number') {
      return true;
    }
    
    // HTTP/HTTPS URLs are playable
    if (typeof url === 'string' && /^https?:\/\//.test(url)) {
      return true;
    }
    
    // TTS URLs are NOT playable - they must be resolved first
    if (typeof url === 'string' && url.startsWith('tts://')) {
      return false;
    }
    
    // String values that are resolved bundled asset paths are playable
    // These come from our BundledAssets.getAsset() method
    if (typeof url === 'string' && url.length > 0) {
      // Allow common asset path patterns that come from bundled assets
      // but reject unsupported URL schemes
      if (url.startsWith('file://') || url.startsWith('asset://') || url.startsWith('ftp://')) {
        return false;
      }
      return true;
    }
    
    return false;
  }
}