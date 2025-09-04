import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { usePlaylistSearchHybrid } from '@/hooks/usePlaylistSearchHybrid';
import { apiClient } from '@/utils/api';

// Mock the API client
jest.mock('@/utils/api');
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

// Mock AppState
jest.mock('react-native/Libraries/AppState/AppState', () => ({
  addEventListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
}));

describe('usePlaylistSearchHybrid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful API response
    mockApiClient.getAllPlaylists.mockResolvedValue({
      data: [
        {
          id: '1',
          slug: 'confidence-boost',
          name: 'Confidence Boost',
          description: 'Build your confidence with daily affirmations',
          created_at: '2025-01-01T00:00:00Z',
        },
        {
          id: '2',
          slug: 'morning-meditation',
          name: 'Morning Meditation',
          description: 'Start your day with peaceful mindfulness',
          created_at: '2025-01-01T00:00:00Z',
        },
        {
          id: '3',
          slug: 'stress-relief',
          name: 'Stress Relief',
          description: 'Reduce anxiety and find inner peace',
          created_at: '2025-01-01T00:00:00Z',
        },
      ],
    });
  });

  test('should load playlists on mount', async () => {
    const { result } = renderHook(() => usePlaylistSearchHybrid());

    // Initially loading
    expect(result.current.isLoadingPlaylists).toBe(true);
    expect(result.current.totalPlaylistsLoaded).toBe(0);

    // Wait for loading to complete
    await waitFor(() => {
      expect(result.current.isLoadingPlaylists).toBe(false);
    });

    expect(result.current.totalPlaylistsLoaded).toBe(3);
    expect(mockApiClient.getAllPlaylists).toHaveBeenCalledWith({ limit: 1000 });
  });

  test('should perform client-side search', async () => {
    const { result } = renderHook(() => usePlaylistSearchHybrid());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoadingPlaylists).toBe(false);
    });

    // Perform search
    act(() => {
      result.current.handleSearch('confidence');
    });

    // Wait for debounced search
    await waitFor(() => {
      expect(result.current.filteredPlaylists).toHaveLength(1);
    });

    expect(result.current.filteredPlaylists[0].name).toBe('Confidence Boost');
    expect(result.current.hasQuery).toBe(true);
    expect(result.current.hasResults).toBe(true);
  });

  test('should search across name and description', async () => {
    const { result } = renderHook(() => usePlaylistSearchHybrid());

    await waitFor(() => {
      expect(result.current.isLoadingPlaylists).toBe(false);
    });

    // Search for a term in description
    act(() => {
      result.current.handleSearch('mindfulness');
    });

    await waitFor(() => {
      expect(result.current.filteredPlaylists).toHaveLength(1);
    });

    expect(result.current.filteredPlaylists[0].name).toBe('Morning Meditation');
  });

  test('should handle fuzzy matching', async () => {
    const { result } = renderHook(() => usePlaylistSearchHybrid());

    await waitFor(() => {
      expect(result.current.isLoadingPlaylists).toBe(false);
    });

    // Search with partial/fuzzy term
    act(() => {
      result.current.handleSearch('stres'); // missing 's' from 'stress'
    });

    await waitFor(() => {
      expect(result.current.filteredPlaylists).toHaveLength(1);
    });

    expect(result.current.filteredPlaylists[0].name).toBe('Stress Relief');
  });

  test('should sort results by relevance', async () => {
    const { result } = renderHook(() => usePlaylistSearchHybrid());

    await waitFor(() => {
      expect(result.current.isLoadingPlaylists).toBe(false);
    });

    // Search for a term that matches multiple results
    act(() => {
      result.current.handleSearch('meditation');
    });

    await waitFor(() => {
      expect(result.current.filteredPlaylists).toHaveLength(1);
    });

    // The result with 'meditation' in the name should come first
    expect(result.current.filteredPlaylists[0].name).toBe('Morning Meditation');
  });

  test('should handle empty search', async () => {
    const { result } = renderHook(() => usePlaylistSearchHybrid());

    await waitFor(() => {
      expect(result.current.isLoadingPlaylists).toBe(false);
    });

    // Perform empty search
    act(() => {
      result.current.handleSearch('');
    });

    expect(result.current.filteredPlaylists).toHaveLength(0);
    expect(result.current.hasQuery).toBe(false);
    expect(result.current.hasResults).toBe(false);
  });

  test('should handle API errors', async () => {
    mockApiClient.getAllPlaylists.mockResolvedValue({
      error: 'Failed to load playlists',
    });

    const { result } = renderHook(() => usePlaylistSearchHybrid());

    await waitFor(() => {
      expect(result.current.isLoadingPlaylists).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load playlists');
    expect(result.current.totalPlaylistsLoaded).toBe(0);
  });

  test('should refresh playlists manually', async () => {
    const { result } = renderHook(() => usePlaylistSearchHybrid());

    await waitFor(() => {
      expect(result.current.isLoadingPlaylists).toBe(false);
    });

    // Clear the mock calls from initial load
    jest.clearAllMocks();

    // Trigger manual refresh
    act(() => {
      result.current.refreshPlaylists();
    });

    expect(mockApiClient.getAllPlaylists).toHaveBeenCalledWith({ limit: 1000 });
  });
});