import { themesService } from './themesService';
import { apiClient } from './api';
import { getPlaylistById } from '../data/playlists';

jest.mock('./api');
jest.mock('../data/playlists');

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockedGetPlaylistById = getPlaylistById as jest.MockedFunction<typeof getPlaylistById>;

describe('themesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock getPlaylistById to return mock playlist data for known IDs
    mockedGetPlaylistById.mockImplementation((id: string) => {
      const validIds = [
        'production-affirmations', 'inner-peace', 'morning-motivation', 
        'stress-relief', 'believe-in-yourself', 'unshakeable-confidence',
        'abundance-mindset', 'money-magnetism'
      ];
      return validIds.includes(id) ? { id, name: `Mock Playlist ${id}` } as any : undefined;
    });
  });

  describe('getAllThemes', () => {
    test('should return themes data from API when successful', async () => {
      const mockThemes = [
        {
          id: '1',
          name: 'Test Theme',
          description: 'Test description',
          image: 'https://example.com/image.jpg',
          playlists: [
            {
              id: 'p1',
              name: 'Test Playlist',
              description: 'Test playlist description',
              image_url: 'https://example.com/playlist.jpg',
              created_at: '2024-01-01T00:00:00Z'
            }
          ]
        }
      ];

      mockedApiClient.get.mockResolvedValue({
        data: { themes: mockThemes }
      });

      const result = await themesService.getAllThemes();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/v1/homefeed');
      expect(result.data).toBeDefined();
      expect(result.data![0]).toMatchObject({
        ...mockThemes[0],
        order: 1,
        playlists: [
          {
            ...mockThemes[0].playlists[0],
            id: 'production-affirmations' // Should be mapped from 'p1'
          }
        ]
      });
    });

    test('should return error when API call fails', async () => {
      const errorMessage = 'Network error';
      mockedApiClient.get.mockResolvedValue({
        error: errorMessage
      });

      const result = await themesService.getAllThemes();

      expect(result.error).toBe(errorMessage);
      expect(result.data).toBeUndefined();
    });

    test('should return error when API response format is invalid', async () => {
      mockedApiClient.get.mockResolvedValue({
        data: { invalidField: 'test' }
      });

      const result = await themesService.getAllThemes();

      expect(result.error).toBe('Invalid response format from homefeed API');
      expect(result.data).toBeUndefined();
    });

    test('should assign order to themes when not provided', async () => {
      const mockThemes = [
        { id: '1', name: 'Theme 1', playlists: [] },
        { id: '2', name: 'Theme 2', playlists: [] },
        { id: '3', name: 'Theme 3', order: 5, playlists: [] }
      ];

      mockedApiClient.get.mockResolvedValue({
        data: { themes: mockThemes }
      });

      const result = await themesService.getAllThemes();

      expect(result.data![0].order).toBe(1);
      expect(result.data![1].order).toBe(2);
      expect(result.data![2].order).toBe(5); // Keeps existing order
    });

    test('should map playlist IDs from backend format to frontend format', async () => {
      const mockThemes = [
        {
          id: '1',
          name: 'Test Theme',
          playlists: [
            { id: 'p1', name: 'Playlist 1' },
            { id: 'p5', name: 'Playlist 5' },
            { id: 'unknown-id', name: 'Unknown Playlist' }
          ]
        }
      ];

      mockedApiClient.get.mockResolvedValue({
        data: { themes: mockThemes }
      });

      const result = await themesService.getAllThemes();

      expect(result.data![0].playlists).toMatchObject([
        { id: 'production-affirmations', name: 'Playlist 1' }, // p1 mapped
        { id: 'believe-in-yourself', name: 'Playlist 5' }, // p5 mapped
        { id: 'unknown-id', name: 'Unknown Playlist' }, // Keep unknown IDs now
      ]);
      expect(result.data![0].playlists).toHaveLength(3); // All playlists kept now
    });

    test('should keep all playlists including those that do not exist in frontend', async () => {
      const mockThemes = [
        {
          id: '1',
          name: 'Test Theme',
          playlists: [
            { id: 'p1', name: 'Valid Playlist' }, // Should be mapped and included
            { id: 'non-existent', name: 'Non-existent Playlist' }, // Should be kept as-is
          ]
        }
      ];

      mockedApiClient.get.mockResolvedValue({
        data: { themes: mockThemes }
      });

      const result = await themesService.getAllThemes();

      // Both playlists should remain
      expect(result.data![0].playlists).toHaveLength(2);
      expect(result.data![0].playlists[0]).toMatchObject({
        id: 'production-affirmations', // p1 mapped
        name: 'Valid Playlist'
      });
      expect(result.data![0].playlists[1]).toMatchObject({
        id: 'non-existent', // kept as-is
        name: 'Non-existent Playlist'
      });
    });
  });
});