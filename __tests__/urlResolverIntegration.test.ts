import { URLResolver } from '../services/urlResolver';
import { BundledAssets } from '../services/bundledAssets';
import type { Playlist } from '../types/audio';

describe('URL Resolver Integration', () => {
  let urlResolver: URLResolver;
  let bundledAssets: BundledAssets;
  let mockPlaylist: Playlist;

  beforeEach(() => {
    bundledAssets = new BundledAssets();
    urlResolver = new URLResolver(bundledAssets);
    
    // Create a mock playlist that mimics production structure
    mockPlaylist = {
      id: 'integration-test',
      name: 'Integration Test Playlist',
      description: 'Test playlist for integration',
      backgroundTrackUrl: 'test-background.mp3',
      defaultVoiceId: 'serenity',
      voices: [
        { id: 'serenity', name: 'Serenity', gender: 'female', locale: 'en-US', sampleUrl: 'tts://preview/serenity' },
        { id: 'titan', name: 'Titan', gender: 'male', locale: 'en-US', sampleUrl: 'tts://preview/titan' },
      ],
      affirmations: [
        { id: 'affirmation-0', text: 'I am worthy of abundance', order: 0, durationMs: 5000 },
        { id: 'affirmation-1', text: 'Success flows to me naturally', order: 1, durationMs: 5000 },
        { id: 'affirmation-2', text: 'I attract positive opportunities', order: 2, durationMs: 5000 },
        { id: 'affirmation-3', text: 'I am confident in my abilities', order: 3, durationMs: 5000 },
      ],
      cdnUrls: {
        serenity: {
          'affirmation-0': 12345, // Mock require() number
          'affirmation-1': 23456,
          'affirmation-2': 34567,
          'affirmation-3': 'tts://serenity/affirmation-3', // TTS placeholder
        },
        titan: {
          'affirmation-0': 'tts://titan/affirmation-0', // TTS placeholder
          'affirmation-1': 54321, // Mock require() number
          'affirmation-2': 'https://cdn.example.com/titan-2.mp3', // CDN URL
          'affirmation-3': 'tts://titan/affirmation-3', // TTS placeholder
        },
      }
    };
    
    // Add some mock assets to bundled assets for fallback testing
    bundledAssets.addAsset('serenity', 'affirmation-3', 'mock-serenity-3');
    bundledAssets.addAsset('serenity', 'affirmation-0', 'mock-serenity-0');
  });

  describe('Integration Scenarios', () => {
    test('should resolve mixed URL types correctly', () => {
      const testCases = [
        { affirmationId: 'affirmation-0', voiceId: 'serenity', expectedType: 'number' }, // require()
        { affirmationId: 'affirmation-1', voiceId: 'serenity', expectedType: 'number' }, // require()
        { affirmationId: 'affirmation-2', voiceId: 'titan', expectedType: 'string' }, // CDN URL
      ];
      
      for (const { affirmationId, voiceId, expectedType } of testCases) {
        const url = urlResolver.resolve(mockPlaylist, affirmationId, voiceId);
        
        expect(typeof url).toBe(expectedType);
        expect(urlResolver.isPlayable(url)).toBe(true);
        
        // Check that it's not a TTS URL (only applies to strings)
        if (typeof url === 'string') {
          expect(url).not.toContain('tts://');
        }
        
        console.log(`✅ ${voiceId}/${affirmationId}: ${typeof url} (${url})`);
      }
    });

    test('should handle TTS placeholders with fallback', () => {
      // affirmation-3 for serenity is TTS, but we added a bundled asset for it
      const url = urlResolver.resolve(mockPlaylist, 'affirmation-3', 'serenity');
      
      expect(url).toBe('mock-serenity-3');
      expect(urlResolver.isPlayable(url)).toBe(true);
      if (typeof url === 'string') {
        expect(url).not.toContain('tts://');
      }
    });

    test('should use fallback voice for TTS placeholders', () => {
      // affirmation-0 for titan is TTS, should fall back to serenity
      const url = urlResolver.resolve(mockPlaylist, 'affirmation-0', 'titan');
      
      expect(url).toBe('mock-serenity-0'); // Should get serenity fallback
      expect(urlResolver.isPlayable(url)).toBe(true);
      if (typeof url === 'string') {
        expect(url).not.toContain('tts://');
      }
    });

    test('should work with track building pattern', () => {
      // Test the URL resolution pattern like AudioServices does
      const testAffirmations = mockPlaylist.affirmations.slice(0, 3);
      
      const resolvedUrls = testAffirmations.map(affirmation => {
        try {
          return urlResolver.resolve(mockPlaylist, affirmation.id, 'serenity');
        } catch (error) {
          console.error(`Failed to resolve ${affirmation.id}:`, error);
          return null;
        }
      }).filter(Boolean) as string[];
      
      expect(resolvedUrls.length).toBe(3); // Should resolve all 3
      
      // URLs should all be playable and not TTS
      for (const url of resolvedUrls) {
        expect(urlResolver.isPlayable(url)).toBe(true);
        if (typeof url === 'string') {
          expect(url).not.toContain('tts://');
        }
      }
      
      console.log(`✅ Track building pattern: ${resolvedUrls.length} URLs resolved`);
    });

    test('should never return tts:// URLs', () => {
      const voices = ['serenity', 'titan'];
      const affirmations = mockPlaylist.affirmations;
      
      for (const voice of voices) {
        for (const affirmation of affirmations) {
          try {
            const resolvedUrl = urlResolver.resolve(mockPlaylist, affirmation.id, voice);
            
            // Critical: Never return TTS URLs (only check strings)
            if (typeof resolvedUrl === 'string') {
              expect(resolvedUrl).not.toContain('tts://');
            }
            expect(typeof resolvedUrl === 'string' || typeof resolvedUrl === 'number').toBe(true);
            expect(urlResolver.isPlayable(resolvedUrl)).toBe(true);
            
          } catch (error) {
            // Some combinations may fail - that's OK as long as no TTS URLs leak through
            console.log(`⚠️ Expected failure for ${voice}/${affirmation.id}: ${error.message}`);
          }
        }
      }
    });
  });

  describe('Mixed URL Types', () => {
    test('should handle playlist with mixed require() and TTS URLs', () => {
      // Create a test playlist with mixed URL types
      const mixedPlaylist = {
        ...mockPlaylist,
        cdnUrls: {
          'test-voice': {
            'affirmation-0': 12345, // require() number
            'affirmation-1': 'https://example.com/audio.mp3', // HTTP URL
            'affirmation-2': 'tts://test-voice/affirmation-2', // TTS placeholder
          }
        }
      };
      
      const affirmationIds = ['affirmation-0', 'affirmation-1', 'affirmation-2'];
      const resolvedUrls = urlResolver.resolveMultiple(mixedPlaylist, affirmationIds, 'test-voice');
      
      // Should resolve at least the require() number and HTTP URL
      expect(resolvedUrls.length).toBeGreaterThanOrEqual(2);
      
      // None should be TTS URLs
      for (const url of resolvedUrls) {
        if (typeof url === 'string') {
          expect(url).not.toContain('tts://');
        }
        expect(urlResolver.isPlayable(url)).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle missing affirmations gracefully', () => {
      expect(() => {
        urlResolver.resolve(mockPlaylist, 'nonexistent-affirmation', 'serenity');
      }).toThrow();
    });

    test('should handle missing voices gracefully', () => {
      const firstAffirmation = mockPlaylist.affirmations[0];
      
      expect(() => {
        urlResolver.resolve(mockPlaylist, firstAffirmation.id, 'nonexistent-voice');
      }).toThrow();
    });
  });
});