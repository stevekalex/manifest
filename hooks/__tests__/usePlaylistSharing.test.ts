import * as Sharing from 'expo-sharing';
import { usePlaylistSharing } from '../usePlaylistSharing';
import type { Playlist } from '../../types/audio';

// Mock expo-sharing
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

const mockPlaylist: Playlist = {
  id: 'test-playlist-123',
  name: 'Test Meditation Playlist',
  description: 'A wonderful test playlist for meditation',
  backgroundTrackUrl: 'test-url',
  affirmations: [],
  voices: [],
  defaultVoiceId: 'charlotte',
  cdnUrls: {},
};

describe('usePlaylistSharing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generatePlaylistUrl', () => {
    it('should generate correct playlist URL', () => {
      const sharing = usePlaylistSharing();
      
      const url = sharing.generatePlaylistUrl('test-playlist-123');
      
      expect(url).toBe('https://manifest-app.com/playlist/test-playlist-123');
    });
  });

  describe('generateShareMessage', () => {
    it('should generate default share message with description', () => {
      const sharing = usePlaylistSharing();
      
      const message = sharing.generateShareMessage(mockPlaylist);
      
      expect(message).toContain('Check out "Test Meditation Playlist"');
      expect(message).toContain('A wonderful test playlist for meditation');
      expect(message).toContain('https://manifest-app.com/playlist/test-playlist-123');
    });

    it('should generate share message without description when disabled', () => {
      const sharing = usePlaylistSharing();
      
      const message = sharing.generateShareMessage(mockPlaylist, { 
        includeDescription: false 
      });
      
      expect(message).toContain('Check out "Test Meditation Playlist"');
      expect(message).not.toContain('A wonderful test playlist for meditation');
      expect(message).toContain('https://manifest-app.com/playlist/test-playlist-123');
    });

    it('should use custom message when provided', () => {
      const sharing = usePlaylistSharing();
      
      const message = sharing.generateShareMessage(mockPlaylist, { 
        customMessage: 'Check out this amazing playlist!' 
      });
      
      expect(message).toBe('Check out this amazing playlist!');
    });
  });

  describe('sharePlaylist', () => {
    it('should share playlist successfully when sharing is available', async () => {
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
      (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
      
      const sharing = usePlaylistSharing();
      
      const shareResult = await sharing.sharePlaylist(mockPlaylist);
      
      expect(shareResult).toEqual({ success: true });
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        'https://manifest-app.com/playlist/test-playlist-123',
        {
          mimeType: 'text/plain',
          dialogTitle: 'Share Test Meditation Playlist',
          UTI: 'public.url'
        }
      );
    });

    it('should return error when sharing is not available', async () => {
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);
      
      const sharing = usePlaylistSharing();
      
      const shareResult = await sharing.sharePlaylist(mockPlaylist);
      
      expect(shareResult).toEqual({
        success: false,
        error: 'Sharing is not available on this device'
      });
      expect(Sharing.shareAsync).not.toHaveBeenCalled();
    });

    it('should handle sharing errors gracefully', async () => {
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
      (Sharing.shareAsync as jest.Mock).mockRejectedValue(new Error('Share failed'));
      
      const sharing = usePlaylistSharing();
      
      const shareResult = await sharing.sharePlaylist(mockPlaylist);
      
      expect(shareResult).toEqual({
        success: false,
        error: 'Share failed'
      });
    });
  });

  describe('sharePlaylistWithCustomText', () => {
    it('should share playlist with custom text', async () => {
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
      (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
      
      const sharing = usePlaylistSharing();
      
      const shareResult = await sharing.sharePlaylistWithCustomText(
        mockPlaylist,
        'Amazing meditation content!'
      );
      
      expect(shareResult).toEqual({ success: true });
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        'https://manifest-app.com/playlist/test-playlist-123',
        {
          mimeType: 'text/plain',
          dialogTitle: 'Share Test Meditation Playlist',
          UTI: 'public.url'
        }
      );
    });
  });
});