import { 
  getCompatibleCdnUrl, 
  getAvailableVoices, 
  getAudioVersion 
} from '../manifestationsService';
import type { Manifestation } from '../../types/manifestation';

describe('Manifestation Compatibility Functions', () => {
  
  describe('getCompatibleCdnUrl', () => {
    it('should handle V1 format (old cdn_url)', () => {
      const v1Manifestation: Manifestation = {
        id: '123',
        playlist_id: 'playlist-1',
        cdn_url: 'https://cdn.com/old-file.mp3',
        content: 'Test affirmation',
      };

      expect(getCompatibleCdnUrl(v1Manifestation)).toBe('https://cdn.com/old-file.mp3');
    });

    it('should handle V2 format with requested voice', () => {
      const v2Manifestation: Manifestation = {
        id: '123',
        playlist_id: 'playlist-1',
        cdn_url: '', // Legacy field, should be ignored
        content: 'Test affirmation',
        audio_versions: [
          {
            id: 'av1',
            voice_id: 'charlotte',
            cdn_key: '123-charlotte',
            cdn_url: 'https://cdn.com/charlotte.mp3'
          },
          {
            id: 'av2',
            voice_id: 'rachel',
            cdn_key: '123-rachel',
            cdn_url: 'https://cdn.com/rachel.mp3'
          }
        ]
      };

      expect(getCompatibleCdnUrl(v2Manifestation, 'rachel')).toBe('https://cdn.com/rachel.mp3');
      expect(getCompatibleCdnUrl(v2Manifestation, 'charlotte')).toBe('https://cdn.com/charlotte.mp3');
    });

    it('should fallback to first voice when requested voice not found', () => {
      const v2Manifestation: Manifestation = {
        id: '123',
        playlist_id: 'playlist-1',
        cdn_url: '',
        content: 'Test affirmation',
        audio_versions: [
          {
            id: 'av1',
            voice_id: 'charlotte',
            cdn_key: '123-charlotte',
            cdn_url: 'https://cdn.com/charlotte.mp3'
          }
        ]
      };

      expect(getCompatibleCdnUrl(v2Manifestation, 'nonexistent')).toBe('https://cdn.com/charlotte.mp3');
    });

    it('should default to charlotte voice when no voice specified', () => {
      const v2Manifestation: Manifestation = {
        id: '123',
        playlist_id: 'playlist-1',
        cdn_url: '',
        content: 'Test affirmation',
        audio_versions: [
          {
            id: 'av1',
            voice_id: 'charlotte',
            cdn_key: '123-charlotte',
            cdn_url: 'https://cdn.com/charlotte.mp3'
          },
          {
            id: 'av2',
            voice_id: 'rachel',
            cdn_key: '123-rachel',
            cdn_url: 'https://cdn.com/rachel.mp3'
          }
        ]
      };

      expect(getCompatibleCdnUrl(v2Manifestation)).toBe('https://cdn.com/charlotte.mp3');
    });

    it('should return empty string for malformed data', () => {
      const emptyManifestation: Manifestation = {
        id: '123',
        playlist_id: 'playlist-1',
        cdn_url: '',
        content: 'Test affirmation',
        audio_versions: []
      };

      expect(getCompatibleCdnUrl(emptyManifestation)).toBe('');
    });
  });

  describe('getAvailableVoices', () => {
    it('should return default voice for V1 format', () => {
      const v1Manifestation: Manifestation = {
        id: '123',
        playlist_id: 'playlist-1',
        cdn_url: 'https://cdn.com/file.mp3',
        content: 'Test affirmation',
      };

      expect(getAvailableVoices(v1Manifestation)).toEqual(['charlotte']);
    });

    it('should return all voice IDs for V2 format', () => {
      const v2Manifestation: Manifestation = {
        id: '123',
        playlist_id: 'playlist-1',
        cdn_url: '',
        content: 'Test affirmation',
        audio_versions: [
          {
            id: 'av1',
            voice_id: 'charlotte',
            cdn_key: '123-charlotte',
            cdn_url: 'https://cdn.com/charlotte.mp3'
          },
          {
            id: 'av2',
            voice_id: 'rachel',
            cdn_key: '123-rachel',
            cdn_url: 'https://cdn.com/rachel.mp3'
          },
          {
            id: 'av3',
            voice_id: 'sarah',
            cdn_key: '123-sarah',
            cdn_url: 'https://cdn.com/sarah.mp3'
          }
        ]
      };

      expect(getAvailableVoices(v2Manifestation)).toEqual(['charlotte', 'rachel', 'sarah']);
    });

    it('should return default voice for empty audio_versions array', () => {
      const emptyManifestation: Manifestation = {
        id: '123',
        playlist_id: 'playlist-1',
        cdn_url: '',
        content: 'Test affirmation',
        audio_versions: []
      };

      expect(getAvailableVoices(emptyManifestation)).toEqual(['charlotte']);
    });
  });

  describe('getAudioVersion', () => {
    it('should return null for V1 format with no cdn_url', () => {
      const v1Manifestation: Manifestation = {
        id: '123',
        playlist_id: 'playlist-1',
        cdn_url: '',
        content: 'Test affirmation',
      };

      expect(getAudioVersion(v1Manifestation, 'charlotte')).toBeNull();
    });

    it('should create compatible AudioVersion for V1 format with cdn_url', () => {
      const v1Manifestation: Manifestation = {
        id: '123',
        playlist_id: 'playlist-1',
        cdn_url: 'https://cdn.com/file.mp3',
        content: 'Test affirmation',
      };

      const result = getAudioVersion(v1Manifestation, 'charlotte');
      expect(result).toEqual({
        id: '123-legacy',
        voice_id: 'charlotte',
        cdn_key: '123-charlotte',
        cdn_url: 'https://cdn.com/file.mp3'
      });
    });

    it('should return specific AudioVersion for V2 format', () => {
      const v2Manifestation: Manifestation = {
        id: '123',
        playlist_id: 'playlist-1',
        cdn_url: '',
        content: 'Test affirmation',
        audio_versions: [
          {
            id: 'av1',
            voice_id: 'charlotte',
            cdn_key: '123-charlotte',
            cdn_url: 'https://cdn.com/charlotte.mp3'
          },
          {
            id: 'av2',
            voice_id: 'rachel',
            cdn_key: '123-rachel',
            cdn_url: 'https://cdn.com/rachel.mp3'
          }
        ]
      };

      const result = getAudioVersion(v2Manifestation, 'rachel');
      expect(result).toEqual({
        id: 'av2',
        voice_id: 'rachel',
        cdn_key: '123-rachel',
        cdn_url: 'https://cdn.com/rachel.mp3'
      });
    });

    it('should return null when voice not found in V2 format', () => {
      const v2Manifestation: Manifestation = {
        id: '123',
        playlist_id: 'playlist-1',
        cdn_url: '',
        content: 'Test affirmation',
        audio_versions: [
          {
            id: 'av1',
            voice_id: 'charlotte',
            cdn_key: '123-charlotte',
            cdn_url: 'https://cdn.com/charlotte.mp3'
          }
        ]
      };

      expect(getAudioVersion(v2Manifestation, 'nonexistent')).toBeNull();
    });
  });
});