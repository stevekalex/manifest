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
    // Serenity voice assets (15 total) - explicit requires for bundler
    const serenityAssets = [
      { id: 'affirmation-0', asset: null as any },
      { id: 'affirmation-1', asset: null as any },
      { id: 'affirmation-2', asset: null as any },
      { id: 'affirmation-3', asset: null as any },
      { id: 'affirmation-4', asset: null as any },
      { id: 'affirmation-5', asset: null as any },
      { id: 'affirmation-6', asset: null as any },
      { id: 'affirmation-7', asset: null as any },
      { id: 'affirmation-8', asset: null as any },
      { id: 'affirmation-9', asset: null as any },
      { id: 'affirmation-10', asset: null as any },
      { id: 'affirmation-11', asset: null as any },
      { id: 'affirmation-12', asset: null as any },
      { id: 'affirmation-13', asset: null as any },
      { id: 'affirmation-14', asset: null as any },
    ];

    // Load serenity assets with explicit requires
    try { serenityAssets[0].asset = require('../assets/voices/serenity/0-hq.mp3'); } catch {}
    try { serenityAssets[1].asset = require('../assets/voices/serenity/1-hq.mp3'); } catch {}
    try { serenityAssets[2].asset = require('../assets/voices/serenity/2-hq.mp3'); } catch {}
    try { serenityAssets[3].asset = require('../assets/voices/serenity/3-hq.mp3'); } catch {}
    try { serenityAssets[4].asset = require('../assets/voices/serenity/4-hq.mp3'); } catch {}
    try { serenityAssets[5].asset = require('../assets/voices/serenity/5-hq.mp3'); } catch {}
    try { serenityAssets[6].asset = require('../assets/voices/serenity/6-hq.mp3'); } catch {}
    try { serenityAssets[7].asset = require('../assets/voices/serenity/7-hq.mp3'); } catch {}
    try { serenityAssets[8].asset = require('../assets/voices/serenity/8-hq.mp3'); } catch {}
    try { serenityAssets[9].asset = require('../assets/voices/serenity/9-hq.mp3'); } catch {}
    try { serenityAssets[10].asset = require('../assets/voices/serenity/10-hq.mp3'); } catch {}
    try { serenityAssets[11].asset = require('../assets/voices/serenity/11-hq.mp3'); } catch {}
    try { serenityAssets[12].asset = require('../assets/voices/serenity/12-hq.mp3'); } catch {}
    try { serenityAssets[13].asset = require('../assets/voices/serenity/13-hq.mp3'); } catch {}
    try { serenityAssets[14].asset = require('../assets/voices/serenity/14-hq.mp3'); } catch {}

    // Add serenity assets to registry (use first as fallback for missing)
    const serenityFallback = serenityAssets[0].asset;
    for (const { id, asset } of serenityAssets) {
      registry.serenity[id] = asset || serenityFallback;
    }

    // Titan voice assets (15 total) - explicit requires for bundler
    const titanAssets = [
      { id: 'affirmation-0', asset: null as any },
      { id: 'affirmation-1', asset: null as any },
      { id: 'affirmation-2', asset: null as any },
      { id: 'affirmation-3', asset: null as any },
      { id: 'affirmation-4', asset: null as any },
      { id: 'affirmation-5', asset: null as any },
      { id: 'affirmation-6', asset: null as any },
      { id: 'affirmation-7', asset: null as any },
      { id: 'affirmation-8', asset: null as any },
      { id: 'affirmation-9', asset: null as any },
      { id: 'affirmation-10', asset: null as any },
      { id: 'affirmation-11', asset: null as any },
      { id: 'affirmation-12', asset: null as any },
      { id: 'affirmation-13', asset: null as any },
      { id: 'affirmation-14', asset: null as any },
    ];

    // Load titan assets with explicit requires
    try { titanAssets[0].asset = require('../assets/voices/titan/0-hq.mp3'); } catch {}
    try { titanAssets[1].asset = require('../assets/voices/titan/1-hq.mp3'); } catch {}
    try { titanAssets[2].asset = require('../assets/voices/titan/2-hq.mp3'); } catch {}
    try { titanAssets[3].asset = require('../assets/voices/titan/3-hq.mp3'); } catch {}
    try { titanAssets[4].asset = require('../assets/voices/titan/4-hq.mp3'); } catch {}
    try { titanAssets[5].asset = require('../assets/voices/titan/5-hq.mp3'); } catch {}
    try { titanAssets[6].asset = require('../assets/voices/titan/6-hq.mp3'); } catch {}
    try { titanAssets[7].asset = require('../assets/voices/titan/7-hq.mp3'); } catch {}
    try { titanAssets[8].asset = require('../assets/voices/titan/8-hq.mp3'); } catch {}
    try { titanAssets[9].asset = require('../assets/voices/titan/9-hq.mp3'); } catch {}
    try { titanAssets[10].asset = require('../assets/voices/titan/10-hq.mp3'); } catch {}
    try { titanAssets[11].asset = require('../assets/voices/titan/11-hq.mp3'); } catch {}
    try { titanAssets[12].asset = require('../assets/voices/titan/12-hq.mp3'); } catch {}
    try { titanAssets[13].asset = require('../assets/voices/titan/13-hq.mp3'); } catch {}
    try { titanAssets[14].asset = require('../assets/voices/titan/14-hq.mp3'); } catch {}

    // Add titan assets to registry (use first titan or serenity as fallback)
    const titanFallback = titanAssets[0].asset || serenityFallback;
    for (const { id, asset } of titanAssets) {
      registry.titan[id] = asset || titanFallback;
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