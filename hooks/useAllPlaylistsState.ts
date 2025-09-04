import { useState, useCallback } from 'react';
import { getAllPlaylists } from '@/data/playlists';
import type { Playlist, ThemePlaylist } from '@/types/audio';

interface AllPlaylistsState {
  playlists: Playlist[];
  themePlaylists: ThemePlaylist[];
  isLoading: boolean;
  error: string | null;
  refreshing: boolean;
  displayTitle: string;
  isThemeView: boolean;
}

interface UseAllPlaylistsStateReturn extends AllPlaylistsState {
  loadPlaylists: (themePlaylistsParam?: string, themeName?: string) => Promise<void>;
  handleRefresh: () => void;
}

export function useAllPlaylistsState(): UseAllPlaylistsStateReturn {
  const [state, setState] = useState<AllPlaylistsState>({
    playlists: [],
    themePlaylists: [],
    isLoading: true,
    error: null,
    refreshing: false,
    displayTitle: 'All Playlists',
    isThemeView: false,
  });

  const loadPlaylists = useCallback(async (themePlaylistsParam?: string, themeName?: string) => {
    try {
      setState(prev => ({ ...prev, error: null }));
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (themePlaylistsParam && themeName) {
        // Parse theme playlists from navigation - use them directly
        const themePlaylists: ThemePlaylist[] = JSON.parse(themePlaylistsParam);
        
        setState(prev => ({
          ...prev,
          themePlaylists,
          displayTitle: themeName,
          isThemeView: true,
        }));
      } else {
        // Fallback: Show all playlists (default behavior when no theme data)
        const data = getAllPlaylists();
        setState(prev => ({
          ...prev,
          playlists: data,
          displayTitle: 'All Playlists',
          isThemeView: false,
        }));
      }
    } catch (err) {
      console.error('Error loading playlists:', err);
      setState(prev => ({
        ...prev,
        error: 'Failed to load playlists. Please try again.',
      }));
    } finally {
      setState(prev => ({
        ...prev,
        isLoading: false,
        refreshing: false,
      }));
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setState(prev => ({ ...prev, refreshing: true }));
    // Note: This would need the current params to reload properly
    // This is a limitation of extracting this logic
  }, []);

  return {
    ...state,
    loadPlaylists,
    handleRefresh,
  };
}