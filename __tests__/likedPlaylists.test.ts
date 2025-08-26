import { apiClient } from '@/utils/api';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve('mock-token')),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock fetch
global.fetch = jest.fn();

describe('Liked Playlists API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('likePlaylist', () => {
    it('should send POST request to like playlist', async () => {
      const mockResponse = {
        user_id: 'user-123',
        playlist_id: 'playlist-456',
        created_at: '2025-08-25T12:00:00Z'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.likePlaylist('playlist-456');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/liked-playlists'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ playlist_id: 'playlist-456' }),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          })
        })
      );

      expect(result.data).toEqual(mockResponse);
      expect(result.error).toBeUndefined();
    });
  });

  describe('unlikePlaylist', () => {
    it('should send DELETE request to unlike playlist', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: () => Promise.resolve({})
      });

      const result = await apiClient.unlikePlaylist('playlist-456');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/liked-playlists/playlist-456'),
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token'
          })
        })
      );

      expect(result.error).toBeUndefined();
    });
  });

  describe('getLikedPlaylists', () => {
    it('should fetch user liked playlists', async () => {
      const mockResponse = [
        {
          user_id: 'user-123',
          playlist_id: 'playlist-456',
          created_at: '2025-08-25T12:00:00Z',
          playlists: {
            id: 'playlist-456',
            slug: 'daily-affirmations',
            name: 'Daily Affirmations',
            description: 'Start your day positively',
            created_at: '2025-08-20T10:00:00Z'
          }
        }
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.getLikedPlaylists();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/liked-playlists'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token'
          })
        })
      );

      expect(result.data).toEqual(mockResponse);
      expect(result.error).toBeUndefined();
    });
  });

  describe('checkPlaylistLikedStatus', () => {
    it('should check if playlist is liked', async () => {
      const mockResponse = { isLiked: true };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.checkPlaylistLikedStatus('playlist-456');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/liked-playlists/playlist-456/status'),
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(result.data).toEqual(mockResponse);
      expect(result.error).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({
          error: 'Playlist not found',
          code: 'PLAYLIST_NOT_FOUND'
        })
      });

      const result = await apiClient.likePlaylist('invalid-playlist');

      expect(result.error).toBe('Playlist not found');
      expect(result.code).toBe('PLAYLIST_NOT_FOUND');
      expect(result.data).toBeUndefined();
    });

    it('should handle network errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await apiClient.likePlaylist('playlist-456');

      expect(result.error).toBe('Network error');
      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.data).toBeUndefined();
    });
  });
});