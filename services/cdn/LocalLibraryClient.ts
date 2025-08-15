import type { 
  ICDNClient, 
  CanonicalTrackId, 
  CDNManifest, 
  CDNStats,
  CDNClientConfig 
} from './types';
import { 
  ManifestError, 
  TrackNotFoundError, 
  CDNError 
} from './types';
import { BundledAssets } from '../bundledAssets';

/**
 * Local Library CDN Client
 * 
 * Implements ICDNClient interface for local bundled assets.
 * Loads manifest from assets/voices/manifest.json and resolves
 * canonical track IDs to bundled asset paths using require().
 */
export class LocalLibraryClient implements ICDNClient {
  private manifest: CDNManifest | null = null;
  private bundledAssets: BundledAssets;
  private stats: CDNStats;
  private config: CDNClientConfig;

  constructor(config: CDNClientConfig = {}) {
    this.bundledAssets = new BundledAssets();
    this.config = {
      manifestPath: '../assets/voices/manifest.json',
      enableCache: true,
      requestTimeout: 5000,
      retryAttempts: 3,
      ...config
    };
    
    this.stats = {
      manifestLoaded: false,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      lastRequestTime: undefined,
      lastError: undefined
    };
  }

  async loadManifest(): Promise<CDNManifest> {
    try {
      // Return cached manifest if already loaded
      if (this.manifest) {
        return this.manifest;
      }

      // Load manifest using require() for Metro bundler compatibility
      const manifestData = require('../../assets/voices/manifest.json');
      
      // Validate manifest structure
      if (!manifestData || typeof manifestData !== 'object') {
        throw new ManifestError('Invalid manifest format');
      }
      
      if (!manifestData.version || !manifestData.voices || !Array.isArray(manifestData.voices)) {
        throw new ManifestError('Manifest missing required fields');
      }

      this.manifest = manifestData as CDNManifest;
      this.stats.manifestLoaded = true;
      
      console.log(`📦 [LOCAL-CDN] Loaded manifest v${this.manifest.version} with ${this.manifest.voices.length} voices`);
      
      return this.manifest;
    } catch (error) {
      const manifestError = new ManifestError(
        `Failed to load manifest: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
      
      this.stats.lastError = manifestError.message;
      throw manifestError;
    }
  }

  async getPlayableUrl(trackId: CanonicalTrackId): Promise<string | number> {
    this.stats.totalRequests++;
    this.stats.lastRequestTime = Date.now();

    try {
      // Ensure manifest is loaded
      if (!this.manifest) {
        throw new ManifestError('Manifest not loaded. Call loadManifest() first.');
      }

      // Parse canonical track ID
      const [voiceId, affirmationId] = trackId.split(':') as [string, string];
      if (!voiceId || !affirmationId) {
        throw new TrackNotFoundError(trackId);
      }

      // Find track in manifest
      const voice = this.manifest.voices.find(v => v.id === voiceId);
      if (!voice) {
        throw new TrackNotFoundError(trackId);
      }

      const track = voice.tracks.find(t => t.id === trackId);
      if (!track || !track.bundledPath) {
        // Fall back to BundledAssets for tracks not in manifest
        console.warn(`⚠️ [LOCAL-CDN] Track ${trackId} not in manifest, trying BundledAssets`);
        return this.getPlayableUrlFromBundledAssets(affirmationId, voiceId);
      }

      // Use BundledAssets for safe static resolution instead of dynamic require()
      try {
        const assetModule = this.bundledAssets.getAsset(affirmationId, voiceId);
        if (assetModule) {
          this.stats.successfulRequests++;
          console.log(`✅ [LOCAL-CDN] Resolved ${trackId} to bundled asset: ${assetModule}`);
          return assetModule;
        } else {
          console.warn(`⚠️ [LOCAL-CDN] BundledAssets lookup failed for ${trackId}, trying fallback`);
          return this.getPlayableUrlFromBundledAssets(affirmationId, voiceId);
        }
      } catch (bundledError) {
        console.warn(`⚠️ [LOCAL-CDN] BundledAssets error for ${trackId}:`, bundledError);
        return this.getPlayableUrlFromBundledAssets(affirmationId, voiceId);
      }
    } catch (error) {
      this.stats.failedRequests++;
      
      if (error instanceof CDNError) {
        this.stats.lastError = error.message;
        throw error;
      }
      
      const cdnError = new TrackNotFoundError(trackId);
      this.stats.lastError = cdnError.message;
      throw cdnError;
    }
  }

  private getPlayableUrlFromBundledAssets(affirmationId: string, voiceId: string): Promise<string | number> {
    return new Promise((resolve, reject) => {
      const asset = this.bundledAssets.getAsset(affirmationId, voiceId);
      if (asset) {
        this.stats.successfulRequests++;
        console.log(`✅ [LOCAL-CDN] Fallback to BundledAssets: ${affirmationId}/${voiceId}`);
        resolve(asset);
      } else {
        const error = new TrackNotFoundError(`${voiceId}:${affirmationId}` as CanonicalTrackId);
        this.stats.lastError = error.message;
        reject(error);
      }
    });
  }

  isAvailable(trackId: CanonicalTrackId): boolean {
    // Parse canonical track ID
    const [voiceId, affirmationId] = trackId.split(':') as [string, string];
    if (!voiceId || !affirmationId) {
      return false;
    }

    // Check manifest first if loaded
    if (this.manifest) {
      const voice = this.manifest.voices.find(v => v.id === voiceId);
      if (voice) {
        const trackExists = voice.tracks.some(t => t.id === trackId);
        if (trackExists) {
          return true;
        }
      }
    }

    // Fall back to BundledAssets
    return this.bundledAssets.hasAsset(affirmationId, voiceId);
  }

  async prefetch(trackIds: CanonicalTrackId[]): Promise<void> {
    // No-op for local client - assets are already bundled
    console.log(`📦 [LOCAL-CDN] Prefetch request for ${trackIds.length} tracks (no-op for local client)`);
  }

  getStats(): CDNStats {
    return { ...this.stats };
  }

  reset(): void {
    this.manifest = null;
    this.stats = {
      manifestLoaded: false,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      lastRequestTime: undefined,
      lastError: undefined
    };
    
    console.log(`🔄 [LOCAL-CDN] Client reset - manifest and stats cleared`);
  }
}