import type { 
  ICDNClient, 
  CanonicalTrackId, 
  CDNManifest, 
  CDNStats,
  CDNClientConfig 
} from './types';
import { TrackNotFoundError } from './types';
import { 
  isTrackCached, 
  getCachedFilePath, 
  downloadToCache,
  ensureCacheDirectoryExists
} from './cacheUtils';

/**
 * 🚨 WALL-OFF: Remote CDN Client disabled to prevent Cloudflare charges
 * TODO_RESTORE_CDN: Remove wall-off when ready to re-enable CDN
 * 
 * Remote CDN Client for Cloudflare R2
 * 
 * Directly constructs URLs using the pattern:
 * https://gentle-poetry-33dd.stevekalex.workers.dev/{voiceId}/{affirmationIndex}-hq.mp3?k={CLOUDFLARE_KEY}
 */

interface RemoteCDNConfig extends CDNClientConfig {
  baseUrl: string;
  cloudflareKey: string;
  concurrency?: number;
}

export class RemoteCDNClient implements ICDNClient {
  private config: RemoteCDNConfig;
  private stats: CDNStats;
  private manifest: CDNManifest | null = null;

  constructor(config: RemoteCDNConfig) {
    // 🚨 WALL-OFF: Block remote CDN to prevent charges
    throw new Error('🚨 Remote CDN disabled to prevent Cloudflare charges. TODO_RESTORE_CDN: Remove this wall-off when ready.');
    
    this.config = {
      concurrency: 4,
      ...config
    };
    
    this.stats = {
      manifestLoaded: false,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0
    };
  }

  async loadManifest(): Promise<CDNManifest> {
    if (this.manifest) {
      return this.manifest;
    }
    
    // Static manifest since we construct URLs directly
    this.manifest = {
      version: '1.0.0',
      updatedAt: new Date().toISOString(),
      voices: []
    };
    
    this.stats.manifestLoaded = true;
    return this.manifest;
  }

  async getPlayableUrl(trackId: CanonicalTrackId): Promise<string> {
    this.stats.totalRequests++;
    
    try {
      // Check cache first
      if (await isTrackCached(trackId)) {
        const cachedPath = await getCachedFilePath(trackId);
        this.stats.successfulRequests++;
        return cachedPath;
      }
      
      // Construct Cloudflare URL
      const cloudflareUrl = this.constructCloudflareUrl(trackId);
      
      // Download to cache
      const localPath = await downloadToCache(cloudflareUrl, trackId);
      
      this.stats.successfulRequests++;
      return localPath;
      
    } catch (error) {
      this.stats.failedRequests++;
      this.stats.lastError = error instanceof Error ? error.message : 'Unknown error';
      throw new TrackNotFoundError(trackId);
    }
  }

  isAvailable(trackId: CanonicalTrackId): boolean {
    // Check if trackId matches expected pattern
    const [voiceId, affirmationId] = trackId.split(':');
    return !!(voiceId && affirmationId && affirmationId.startsWith('affirmation-'));
  }

  async prefetch(trackIds: CanonicalTrackId[]): Promise<void> {
    if (trackIds.length === 0) return;
    
    await ensureCacheDirectoryExists();
    
    // Filter out already cached tracks
    const uncachedTracks: CanonicalTrackId[] = [];
    for (const trackId of trackIds) {
      if (!(await isTrackCached(trackId))) {
        uncachedTracks.push(trackId);
      }
    }
    
    if (uncachedTracks.length === 0) return;
    
    // Download in batches with concurrency limit
    const batchSize = this.config.concurrency || 4;
    
    for (let i = 0; i < uncachedTracks.length; i += batchSize) {
      const batch = uncachedTracks.slice(i, i + batchSize);
      
      // Download batch in parallel
      const downloadPromises = batch.map(async (trackId) => {
        try {
          const cloudflareUrl = this.constructCloudflareUrl(trackId);
          await downloadToCache(cloudflareUrl, trackId);
        } catch (error) {
          console.warn(`⚠️ [REMOTE-CDN] Failed to prefetch ${trackId}:`, error);
          // Continue with other downloads
        }
      });
      
      await Promise.all(downloadPromises);
    }
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
      failedRequests: 0
    };
  }

  /**
   * Construct Cloudflare Worker URL for a track
   * Pattern: https://gentle-poetry-33dd.stevekalex.workers.dev/{voiceId}/{index}-hq.mp3?k={key}
   */
  private constructCloudflareUrl(trackId: CanonicalTrackId): string {
    const [voiceId, affirmationId] = trackId.split(':');
    
    if (!voiceId || !affirmationId) {
      throw new Error(`Invalid track ID format: ${trackId}`);
    }
    
    // Extract index from affirmationId (e.g., "affirmation-0" -> "0")
    const indexMatch = affirmationId.match(/affirmation-(\d+)/);
    if (!indexMatch) {
      throw new Error(`Invalid affirmation ID format: ${affirmationId}`);
    }
    
    const index = indexMatch[1];
    const filename = `${index}-hq.mp3`;
    
    const url = `${this.config.baseUrl}/${voiceId}/${filename}?k=${this.config.cloudflareKey}`;
    
    return url;
  }
}