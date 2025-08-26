import { URLResolver } from '../services/urlResolver';
import { BundledAssets } from '../services/bundledAssets';
import type { VoiceId, AffirmationId, Playlist } from '../types/audio';

// Mock audio file requires to avoid Jest parsing issues
jest.mock('../ethereal-ambient-music-55115.mp3', () => 11111, { virtual: true });
// Hardcoded voice assets have been removed - no mocks needed

// Now we can safely import the production playlist
const { PRODUCTION_PLAYLIST } = require('../data/productionPlaylist');

describe('URL Resolver Production Integration', () => {
  let urlResolver: URLResolver;
  let bundledAssets: BundledAssets;

  beforeEach(() => {
    bundledAssets = new BundledAssets();
    urlResolver = new URLResolver(bundledAssets);
  });

  describe('Production Playlist Verification', () => {
    test('should reject all TTS placeholder URLs since no bundled assets exist', () => {
      // All affirmations now use TTS placeholders
      const testCases = [
        { affirmationId: 'affirmation-0', voiceId: 'serenity' },
        { affirmationId: 'affirmation-1', voiceId: 'serenity' },
        { affirmationId: 'affirmation-2', voiceId: 'serenity' },
        { affirmationId: 'affirmation-0', voiceId: 'titan' },
        { affirmationId: 'affirmation-1', voiceId: 'titan' },
        { affirmationId: 'affirmation-2', voiceId: 'titan' },
      ];

      console.log('🧪 Testing production playlist URL resolution with no bundled assets...');

      for (const { affirmationId, voiceId } of testCases) {
        expect(() => {
          urlResolver.resolve(PRODUCTION_PLAYLIST, affirmationId, voiceId);
        }).toThrow('No bundled asset found for TTS placeholder');
        
        console.log(`✅ ${voiceId}/${affirmationId}: Correctly throws URLResolverException`);
      }
    });

    test('should throw exceptions for all TTS placeholders since no fallbacks exist', () => {
      // Test TTS placeholders (now all affirmations use TTS)
      const ttsAffirmations = ['affirmation-3', 'affirmation-4', 'affirmation-5'];
      
      console.log('🧪 Testing TTS placeholder rejection with no fallbacks...');

      for (const affirmationId of ttsAffirmations) {
        // Test serenity voice (should throw since no bundled assets available)
        expect(() => {
          urlResolver.resolve(PRODUCTION_PLAYLIST, affirmationId, 'serenity');
        }).toThrow('No bundled asset found for TTS placeholder');
        console.log(`✅ serenity/${affirmationId}: Correctly throws URLResolverException`);

        // Test titan voice (should throw since no bundled assets available)
        expect(() => {
          urlResolver.resolve(PRODUCTION_PLAYLIST, affirmationId, 'titan');
        }).toThrow('No bundled asset found for TTS placeholder');
        console.log(`✅ titan/${affirmationId}: Correctly throws URLResolverException`);
      }
    });

    test('should throw URLResolverException for ALL production playlist affirmations', () => {
      const voices: VoiceId[] = ['serenity', 'titan'];
      const affirmations = PRODUCTION_PLAYLIST.affirmations;
      
      console.log('🧪 Critical test: All requests should throw URLResolverException...');

      let totalTested = 0;
      let expectedFailures = 0;

      for (const voice of voices) {
        for (const affirmation of affirmations) {
          totalTested++;
          
          expect(() => {
            urlResolver.resolve(PRODUCTION_PLAYLIST, affirmation.id, voice);
          }).toThrow('No bundled asset found for TTS placeholder');
          
          expectedFailures++;
          console.log(`✅ ${voice}/${affirmation.id}: Correctly throws URLResolverException`);
        }
      }

      console.log(`📊 Production playlist test summary:`);
      console.log(`   Total combinations tested: ${totalTested}`);
      console.log(`   Expected failures (URLResolverExceptions): ${expectedFailures}`);
      console.log(`   Success rate: 100% (all properly throw exceptions)`);

      // All should throw exceptions since no bundled assets exist
      expect(expectedFailures).toBe(totalTested);
    });

    test('should handle AudioService track building pattern gracefully', () => {
      // Simulate the exact pattern used in AudioService.bootstrapPlaylist
      const INITIAL_COUNT = 3;
      const affirmations = PRODUCTION_PLAYLIST.affirmations.slice(0, INITIAL_COUNT);
      const currentVoiceId = 'serenity';
      
      console.log('🧪 Testing AudioService track building pattern with no bundled assets...');

      const resolvedUrls = affirmations.map(affirmation => {
        try {
          return urlResolver.resolve(PRODUCTION_PLAYLIST, affirmation.id, currentVoiceId);
        } catch (error) {
          console.log(`✅ Expected failure to resolve ${affirmation.id}: ${error.message}`);
          return null;
        }
      }).filter(Boolean) as string[];

      console.log(`📊 Track building results:`);
      console.log(`   Requested affirmations: ${affirmations.length}`);
      console.log(`   Successfully resolved: ${resolvedUrls.length}`);

      // Should resolve no affirmations since all are TTS placeholders and no bundled assets exist
      expect(resolvedUrls.length).toBe(0);

      console.log(`✅ AudioService pattern correctly handles no bundled assets (forces CDN/TTS fallback)`);
    });

    test('should handle voice switching with production playlist gracefully', () => {
      // Simulate voice switching from serenity to titan
      const fromIndex = 1; // Start from second affirmation
      const remainingAffirmations = PRODUCTION_PLAYLIST.affirmations.slice(fromIndex);
      const newVoiceId = 'titan';
      
      console.log('🧪 Testing voice switching pattern with no bundled assets...');

      const resolvedUrls = remainingAffirmations.map(affirmation => {
        try {
          return urlResolver.resolve(PRODUCTION_PLAYLIST, affirmation.id, newVoiceId);
        } catch (error) {
          console.log(`✅ Expected failure to resolve ${affirmation.id}: ${error.message}`);
          return null;
        }
      }).filter(Boolean) as string[];

      console.log(`📊 Voice switching results:`);
      console.log(`   Remaining affirmations: ${remainingAffirmations.length}`);
      console.log(`   Successfully resolved: ${resolvedUrls.length}`);

      // Should resolve no assets since all are TTS placeholders and no bundled assets exist
      expect(resolvedUrls.length).toBe(0);

      console.log(`✅ Voice switching correctly handles no bundled assets (forces CDN/TTS fallback)`);
    });
  });

  describe('Production Playlist Data Validation', () => {
    test('should validate production playlist structure after asset removal', () => {
      // Ensure the production playlist has the expected structure
      expect(PRODUCTION_PLAYLIST).toHaveProperty('cdnUrls');
      expect(PRODUCTION_PLAYLIST).toHaveProperty('affirmations');
      expect(PRODUCTION_PLAYLIST.affirmations.length).toBe(15);
      
      // Check that serenity and titan voices have the expected URL structure
      expect(PRODUCTION_PLAYLIST.cdnUrls).toHaveProperty('serenity');
      expect(PRODUCTION_PLAYLIST.cdnUrls).toHaveProperty('titan');
      
      const serenityUrls = PRODUCTION_PLAYLIST.cdnUrls.serenity;
      const titanUrls = PRODUCTION_PLAYLIST.cdnUrls.titan;
      
      // All should be TTS placeholders after asset removal
      expect(serenityUrls['affirmation-0']).toBe('tts://serenity/affirmation-0');
      expect(serenityUrls['affirmation-1']).toBe('tts://serenity/affirmation-1');
      expect(serenityUrls['affirmation-2']).toBe('tts://serenity/affirmation-2');
      expect(serenityUrls['affirmation-3']).toBe('tts://serenity/affirmation-3');
      
      expect(titanUrls['affirmation-0']).toBe('tts://titan/affirmation-0');
      expect(titanUrls['affirmation-1']).toBe('tts://titan/affirmation-1');
      expect(titanUrls['affirmation-2']).toBe('tts://titan/affirmation-2');
      expect(titanUrls['affirmation-3']).toBe('tts://titan/affirmation-3');
      
      console.log('✅ Production playlist structure is valid after asset removal');
    });

    test('should confirm all URLs are TTS placeholders in production playlist', () => {
      const serenityUrls = PRODUCTION_PLAYLIST.cdnUrls.serenity;
      const titanUrls = PRODUCTION_PLAYLIST.cdnUrls.titan;
      
      // Count TTS placeholders
      let serenityTTSCount = 0;
      let titanTTSCount = 0;
      
      for (const [affirmationId, url] of Object.entries(serenityUrls)) {
        if (urlResolver.isTTSPlaceholder(url)) {
          serenityTTSCount++;
        }
      }
      
      for (const [affirmationId, url] of Object.entries(titanUrls)) {
        if (urlResolver.isTTSPlaceholder(url)) {
          titanTTSCount++;
        }
      }
      
      console.log(`📊 TTS placeholder analysis:`);
      console.log(`   Serenity TTS placeholders: ${serenityTTSCount}`);
      console.log(`   Titan TTS placeholders: ${titanTTSCount}`);
      
      // Should have TTS placeholders for all affirmations 0-14 (15 total)
      expect(serenityTTSCount).toBe(15);
      expect(titanTTSCount).toBe(15);
      
      console.log('✅ All URLs are TTS placeholders as expected after asset removal');
    });
  });
});