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
   * This maps affirmation IDs to actual require() paths for bundled MP3 files.
   * Uses static require statements for Metro bundler compatibility.
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

    // Static require statements for Metro bundler compatibility
    // Serenity voice assets (primary assets)
    try {
      const serenity0 = require('../assets/voices/serenity/0-hq.mp3');
      registry.serenity['affirmation-0'] = serenity0;
      
      // Use serenity-0 as fallback for missing affirmations
      for (let i = FALLBACK_RANGE.start; i <= FALLBACK_RANGE.end; i++) {
        registry.serenity[`affirmation-${i}`] = serenity0;
      }
    } catch (error) {
      console.warn(`⚠️ [BUNDLED-ASSETS] Serenity voice 0 not found`);
    }

    try {
      const serenity1 = require('../assets/voices/serenity/1-hq.mp3');
      registry.serenity['affirmation-1'] = serenity1;
    } catch (error) {
      console.warn(`⚠️ [BUNDLED-ASSETS] Serenity voice 1 not found`);
    }

    try {
      const serenity2 = require('../assets/voices/serenity/2-hq.mp3');
      registry.serenity['affirmation-2'] = serenity2;
    } catch (error) {
      console.warn(`⚠️ [BUNDLED-ASSETS] Serenity voice 2 not found`);
    }

    // Titan voice assets (available assets only)
    try {
      const titan0 = require('../assets/voices/titan/0-hq.mp3');
      registry.titan['affirmation-0'] = titan0;
    } catch (error) {
      console.warn(`⚠️ [BUNDLED-ASSETS] Titan voice 0 not found`);
    }

    try {
      const titan1 = require('../assets/voices/titan/1-hq.mp3');
      registry.titan['affirmation-1'] = titan1;
    } catch (error) {
      console.warn(`⚠️ [BUNDLED-ASSETS] Titan voice 1 not found`);
    }

    try {
      const titan2 = require('../assets/voices/titan/2-hq.mp3');
      registry.titan['affirmation-2'] = titan2;
    } catch (error) {
      console.warn(`⚠️ [BUNDLED-ASSETS] Titan voice 2 not found`);
    }

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