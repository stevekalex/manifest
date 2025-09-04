import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/utils/api';
import type { PlaylistSearchResult } from '@/types/audio';
import { audioLog, audioWarn } from '@/utils/logger';

const debounce = <T extends (...args: any[]) => void>(
  func: T,
  delay: number
): T & { cancel: () => void } => {
  let timeoutId: number;
  
  const debouncedFn = ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T & { cancel: () => void };
  
  debouncedFn.cancel = () => clearTimeout(timeoutId);
  
  return debouncedFn;
};

export function usePlaylistSearchAPI(
  delay: number = 300
) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPlaylists, setFilteredPlaylists] = useState<PlaylistSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchPlaylists = useCallback(async (query: string) => {
    if (!query.trim()) {
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      audioLog('[SEARCH API] Searching for:', query);
      const response = await apiClient.searchPlaylists(query, 50);
      
      if (response.error) {
        audioWarn('[SEARCH API] Search error:', response.error);
        setError(response.error);
        setFilteredPlaylists([]);
        return;
      }

      if (!response.data) {
        audioLog('[SEARCH API] No data received');
        setFilteredPlaylists([]);
        return;
      }

      // Transform backend data to frontend format
      const transformedResults: PlaylistSearchResult[] = response.data.map(playlist => ({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        // Default values for missing fields until we add them to backend
        coverImage: undefined,
        listensCount: 0,
        category: undefined,
      }));

      audioLog(`[SEARCH API] Found ${transformedResults.length} playlists`);
      setFilteredPlaylists(transformedResults);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      audioWarn('[SEARCH API] Search exception:', errorMessage);
      setError(errorMessage);
      setFilteredPlaylists([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const debouncedSearch = useMemo(
    () => debounce((query: string) => {
      searchPlaylists(query);
    }, delay),
    [searchPlaylists, delay]
  );

  useEffect(() => {
    return () => debouncedSearch.cancel();
  }, [debouncedSearch]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setError(null);
    
    if (!query.trim()) {
      setFilteredPlaylists([]);
      setIsSearching(false);
      debouncedSearch.cancel();
      return;
    }
    
    debouncedSearch(query);
  }, [debouncedSearch]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setFilteredPlaylists([]);
    setIsSearching(false);
    setError(null);
    debouncedSearch.cancel();
  }, [debouncedSearch]);

  return {
    searchQuery,
    filteredPlaylists,
    isSearching,
    error,
    handleSearch,
    clearSearch,
    hasResults: filteredPlaylists.length > 0,
    hasQuery: searchQuery.trim().length > 0,
  };
}