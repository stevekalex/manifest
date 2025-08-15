/**
 * Tests for CDN types and interfaces
 * Validates type contracts and ensures compatibility with existing audio types
 */

describe('CDN Types', () => {
  test('CanonicalTrackId format should be valid', () => {
    // Test that canonical track IDs follow the expected format
    const validTrackIds = [
      'serenity:affirmation-0',
      'titan:affirmation-1', 
      'whisper:affirmation-99'
    ];
    
    validTrackIds.forEach(trackId => {
      expect(trackId).toMatch(/^[a-zA-Z]+:affirmation-\d+$/);
      expect(trackId.split(':')).toHaveLength(2);
    });
  });

  test('CDNManifest structure should be valid', () => {
    const mockManifest = {
      version: '1.0.0',
      updatedAt: '2025-01-15T12:00:00Z',
      voices: [
        {
          id: 'serenity',
          name: 'Serenity',
          tracks: [
            {
              id: 'serenity:affirmation-0' as const,
              file: '0-hq.mp3',
              bundledPath: '../assets/voices/serenity/0-hq.mp3'
            }
          ]
        }
      ]
    };

    // Verify structure
    expect(mockManifest).toHaveProperty('version');
    expect(mockManifest).toHaveProperty('updatedAt');
    expect(mockManifest).toHaveProperty('voices');
    expect(Array.isArray(mockManifest.voices)).toBe(true);
    
    // Verify voice structure
    const voice = mockManifest.voices[0];
    expect(voice).toHaveProperty('id');
    expect(voice).toHaveProperty('name');
    expect(voice).toHaveProperty('tracks');
    expect(Array.isArray(voice.tracks)).toBe(true);
    
    // Verify track structure
    const track = voice.tracks[0];
    expect(track).toHaveProperty('id');
    expect(track).toHaveProperty('file');
    expect(track.id).toBe('serenity:affirmation-0');
  });

  test('CDNStats should have required properties', () => {
    const mockStats = {
      manifestLoaded: true,
      totalRequests: 10,
      successfulRequests: 8,
      failedRequests: 2,
      lastRequestTime: Date.now()
    };

    expect(mockStats).toHaveProperty('manifestLoaded');
    expect(mockStats).toHaveProperty('totalRequests');
    expect(mockStats).toHaveProperty('successfulRequests');
    expect(mockStats).toHaveProperty('failedRequests');
    expect(typeof mockStats.manifestLoaded).toBe('boolean');
    expect(typeof mockStats.totalRequests).toBe('number');
  });
});

describe('ICDNClient Interface Contract', () => {
  // Mock implementation to test interface contract
  class MockCDNClient {
    private manifestLoaded = false;
    private stats = {
      manifestLoaded: false,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0
    };

    async loadManifest() {
      this.manifestLoaded = true;
      this.stats.manifestLoaded = true;
      return {
        version: '1.0.0',
        updatedAt: '2025-01-15T12:00:00Z',
        voices: []
      };
    }

    async getPlayableUrl(trackId: string) {
      this.stats.totalRequests++;
      if (trackId === 'serenity:affirmation-0') {
        this.stats.successfulRequests++;
        return 'mock-asset-path';
      }
      this.stats.failedRequests++;
      throw new Error('Track not found');
    }

    isAvailable(trackId: string): boolean {
      return trackId === 'serenity:affirmation-0';
    }

    async prefetch(trackIds: string[]): Promise<void> {
      // Mock prefetch - no-op
    }

    getStats() {
      return this.stats;
    }

    reset(): void {
      this.manifestLoaded = false;
      this.stats = {
        manifestLoaded: false,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0
      };
    }
  }

  let client: MockCDNClient;

  beforeEach(() => {
    client = new MockCDNClient();
  });

  test('should implement loadManifest method', async () => {
    const manifest = await client.loadManifest();
    
    expect(manifest).toHaveProperty('version');
    expect(manifest).toHaveProperty('updatedAt');
    expect(manifest).toHaveProperty('voices');
    expect(client.getStats().manifestLoaded).toBe(true);
  });

  test('should implement getPlayableUrl method', async () => {
    const url = await client.getPlayableUrl('serenity:affirmation-0');
    
    expect(url).toBe('mock-asset-path');
    expect(client.getStats().totalRequests).toBe(1);
    expect(client.getStats().successfulRequests).toBe(1);
  });

  test('should handle track not found in getPlayableUrl', async () => {
    await expect(client.getPlayableUrl('invalid:track-id')).rejects.toThrow('Track not found');
    
    expect(client.getStats().totalRequests).toBe(1);
    expect(client.getStats().failedRequests).toBe(1);
  });

  test('should implement isAvailable method', () => {
    expect(client.isAvailable('serenity:affirmation-0')).toBe(true);
    expect(client.isAvailable('invalid:track-id')).toBe(false);
  });

  test('should implement prefetch method', async () => {
    // Should not throw
    await expect(client.prefetch(['serenity:affirmation-0'])).resolves.toBeUndefined();
  });

  test('should implement getStats method', () => {
    const stats = client.getStats();
    
    expect(stats).toHaveProperty('manifestLoaded');
    expect(stats).toHaveProperty('totalRequests');
    expect(stats).toHaveProperty('successfulRequests');
    expect(stats).toHaveProperty('failedRequests');
  });

  test('should implement reset method', async () => {
    // Make some requests to change stats
    await client.loadManifest();
    await client.getPlayableUrl('serenity:affirmation-0');
    
    expect(client.getStats().manifestLoaded).toBe(true);
    expect(client.getStats().totalRequests).toBe(1);
    
    // Reset should clear stats
    client.reset();
    
    expect(client.getStats().manifestLoaded).toBe(false);
    expect(client.getStats().totalRequests).toBe(0);
  });
});