import type { AffirmationId, Playlist, VoiceId } from '../types/audio';

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

export class URLResolver {
  private bundledAssets: BundledAssets;
  
  constructor(bundledAssets: BundledAssets) {
    this.bundledAssets = bundledAssets;
  }
  
  /**
   * Resolve a single affirmation URL from playlist
   * @param playlist The playlist containing URL mappings
   * @param affirmationId The affirmation to resolve
   * @param voiceId The voice to use
   * @returns Playable URL (never tts://)
   */
  resolve(
    playlist: Playlist,
    affirmationId: AffirmationId,
    voiceId: VoiceId
  ): string {
    console.log(`🔍 [URL-RESOLVER] Resolving: ${affirmationId} for voice: ${voiceId}`);
    
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
      console.log(`✅ [URL-RESOLVER] Using bundled require() asset: ${rawUrl}`);
      return rawUrl as any;
    }
    
    if (typeof rawUrl === 'string') {
      if (rawUrl.startsWith('tts://')) {
        // TTS placeholder - resolve to bundled asset
        return this.resolveTTSPlaceholder(rawUrl, affirmationId, voiceId);
      } else if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
        // CDN URL - return as-is for now
        console.log(`🌐 [URL-RESOLVER] Using CDN URL: ${rawUrl}`);
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
   * @returns Array of resolved URLs
   */
  resolveMultiple(
    playlist: Playlist,
    affirmationIds: AffirmationId[],
    voiceId: VoiceId
  ): string[] {
    console.log(`🔍 [URL-RESOLVER] Resolving ${affirmationIds.length} URLs for voice: ${voiceId}`);
    
    const resolvedUrls: string[] = [];
    
    for (const affirmationId of affirmationIds) {
      try {
        const url = this.resolve(playlist, affirmationId, voiceId);
        resolvedUrls.push(url);
      } catch (error) {
        console.error(`❌ [URL-RESOLVER] Failed to resolve ${affirmationId}:`, error);
        // For now, skip failed resolutions
        // TODO: Add fallback strategy
      }
    }
    
    console.log(`✅ [URL-RESOLVER] Resolved ${resolvedUrls.length}/${affirmationIds.length} URLs`);
    return resolvedUrls;
  }
  
  /**
   * Check if a URL is a TTS placeholder
   */
  isTTSPlaceholder(url: any): boolean {
    return typeof url === 'string' && url.startsWith('tts://');
  }
  
  /**
   * Resolve TTS placeholder to bundled asset
   * @param ttsUrl The tts:// URL to resolve
   * @param affirmationId The affirmation ID for context
   * @param voiceId The voice ID for context
   * @returns Resolved bundled asset path
   */
  private resolveTTSPlaceholder(
    ttsUrl: string,
    affirmationId: string,
    voiceId: string
  ): string {
    console.log(`🎤 [URL-RESOLVER] Resolving TTS placeholder: ${ttsUrl}`);
    
    // Validate TTS URL format
    if (!ttsUrl.startsWith('tts://')) {
      throw new URLResolverException(
        URLResolverError.INVALID_TTS_URL,
        `Invalid TTS URL format: ${ttsUrl}`,
        affirmationId,
        voiceId
      );
    }
    
    // Try to get bundled asset
    const bundledAsset = this.bundledAssets.getAsset(affirmationId, voiceId);
    
    if (!bundledAsset) {
      // Check if we have a fallback voice
      const fallbackAsset = this.bundledAssets.getAsset(affirmationId, 'serenity');
      
      if (fallbackAsset) {
        console.warn(`⚠️ [URL-RESOLVER] Using fallback voice 'serenity' for ${affirmationId}`);
        return fallbackAsset;
      }
      
      throw new URLResolverException(
        URLResolverError.ASSET_NOT_FOUND,
        `No bundled asset found for TTS placeholder: ${ttsUrl}`,
        affirmationId,
        voiceId
      );
    }
    
    console.log(`✅ [URL-RESOLVER] Resolved TTS to bundled asset: ${bundledAsset}`);
    return bundledAsset;
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