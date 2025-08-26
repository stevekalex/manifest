import type { VoiceId, AffirmationId } from '../types/audio';

/**
 * Bundled Assets Manager
 * 
 * Manages mapping from affirmation IDs and voice IDs to bundled audio files.
 * Provides fallback strategies when specific voice assets are not available.
 */

// Constants
const FALLBACK_RANGE = { start: 3, end: 9 }; // Affirmations to use serenity-0 as fallback

type AssetRequirePath = any; // require() returns number type

interface VoiceAssetMap {
  [affirmationId: string]: AssetRequirePath;
}

interface AssetRegistry {
  [voiceId: string]: VoiceAssetMap;
}

export class BundledAssets {
  private assetRegistry: AssetRegistry;
  private fallbackVoice: VoiceId = 'serenity';
  
  constructor() {
    this.assetRegistry = this.buildAssetRegistry();
  }
  
  /**
   * Get bundled asset for specific affirmation and voice
   * @param affirmationId The affirmation to get
   * @param voiceId The voice to use
   * @returns Asset path or null if not found
   */
  getAsset(affirmationId: string, voiceId: string): string | null {
    console.log(`📁 [BUNDLED-ASSETS] Looking for: ${affirmationId} with voice: ${voiceId}`);
    
    // Try requested voice first
    const voiceAssets = this.assetRegistry[voiceId];
    if (voiceAssets && voiceAssets[affirmationId]) {
      console.log(`✅ [BUNDLED-ASSETS] Found asset for ${voiceId}: ${voiceAssets[affirmationId]}`);
      return voiceAssets[affirmationId];
    }
    
    // Try fallback voice if different from requested
    if (voiceId !== this.fallbackVoice) {
      const fallbackAssets = this.assetRegistry[this.fallbackVoice];
      if (fallbackAssets && fallbackAssets[affirmationId]) {
        console.warn(`⚠️ [BUNDLED-ASSETS] Using fallback voice ${this.fallbackVoice} for ${affirmationId}`);
        return fallbackAssets[affirmationId];
      }
    }
    
    console.error(`❌ [BUNDLED-ASSETS] No asset found for ${affirmationId} with voice ${voiceId}`);
    return null;
  }
  
  /**
   * Check if we have a bundled asset for specific affirmation and voice
   * @param affirmationId The affirmation to check
   * @param voiceId The voice to check
   * @returns True if asset exists (including fallback)
   */
  hasAsset(affirmationId: string, voiceId: string): boolean {
    return this.getAsset(affirmationId, voiceId) !== null;
  }
  
  /**
   * Get all available affirmation IDs for a voice
   * @param voiceId The voice to check
   * @returns Array of available affirmation IDs
   */
  getAvailableAffirmations(voiceId: string): string[] {
    const voiceAssets = this.assetRegistry[voiceId];
    if (!voiceAssets) return [];
    
    return Object.keys(voiceAssets);
  }
  
  /**
   * Get all available voice IDs
   * @returns Array of available voice IDs
   */
  getAvailableVoices(): string[] {
    return Object.keys(this.assetRegistry);
  }
  
  /**
   * Build the asset registry from bundled files
   * 
   * NO LONGER USES HARDCODED ASSETS - allows system to fallback to CDN/TTS
   * Empty registry forces URLResolver to use CDN-first strategy or throw exception for TTS fallback
   */
  private buildAssetRegistry(): AssetRegistry {
    const registry: AssetRegistry = {
      serenity: {},
      titan: {},
      whisper: {},
      sage: {},
      aurora: {},
      energetic: {},
    };

    // Registry is intentionally empty - no hardcoded bundled assets
    // This forces the system to use:
    // 1. CDN assets (primary)
    // 2. TTS generation (when CDN fails)
    // 3. URLResolverException -> graceful TTS fallback
    
    console.log('📁 [BUNDLED-ASSETS] No hardcoded assets - using CDN/TTS fallback strategy');
    
    return registry;
  }
  
  /**
   * Add a new asset to the registry
   * @param voiceId The voice ID
   * @param affirmationId The affirmation ID  
   * @param assetPath The require() path to the asset
   */
  addAsset(voiceId: string, affirmationId: string, assetPath: AssetRequirePath): void {
    if (!this.assetRegistry[voiceId]) {
      this.assetRegistry[voiceId] = {};
    }
    
    this.assetRegistry[voiceId][affirmationId] = assetPath;
    console.log(`📁 [BUNDLED-ASSETS] Added asset: ${voiceId}/${affirmationId}`);
  }
  
  /**
   * Set the fallback voice for missing assets
   * @param voiceId The voice ID to use as fallback
   */
  setFallbackVoice(voiceId: VoiceId): void {
    this.fallbackVoice = voiceId;
    console.log(`📁 [BUNDLED-ASSETS] Set fallback voice to: ${voiceId}`);
  }
  
  /**
   * Get statistics about available assets
   */
  getStats(): {
    totalVoices: number;
    totalAssets: number;
    assetsPerVoice: Record<string, number>;
  } {
    const totalVoices = Object.keys(this.assetRegistry).length;
    let totalAssets = 0;
    const assetsPerVoice: Record<string, number> = {};
    
    for (const [voiceId, voiceAssets] of Object.entries(this.assetRegistry)) {
      const assetCount = Object.keys(voiceAssets).length;
      assetsPerVoice[voiceId] = assetCount;
      totalAssets += assetCount;
    }
    
    return {
      totalVoices,
      totalAssets,
      assetsPerVoice,
    };
  }
}