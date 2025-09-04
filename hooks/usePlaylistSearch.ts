import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PlaylistSearchResult, SearchOptions } from '@/types/audio';

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

export function usePlaylistSearch(
  allPlaylists: PlaylistSearchResult[] = [],
  delay: number = 300
) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPlaylists, setFilteredPlaylists] = useState<PlaylistSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchPlaylists = useCallback((
    query: string,
    options: Partial<SearchOptions> = {}
  ): PlaylistSearchResult[] => {
    if (!query.trim() || !allPlaylists || allPlaylists.length === 0) {
      return [];
    }

    const {
      includeDescription = true,
      caseSensitive = false,
      limit
    } = options;

    const searchTerm = caseSensitive ? query : query.toLowerCase();
    
    const results = allPlaylists.filter(playlist => {
      const name = caseSensitive ? playlist.name : playlist.name.toLowerCase();
      const description = playlist.description 
        ? (caseSensitive ? playlist.description : playlist.description.toLowerCase())
        : '';
      const category = playlist.category
        ? (caseSensitive ? playlist.category : playlist.category.toLowerCase())
        : '';

      const nameMatch = name.includes(searchTerm);
      const descriptionMatch = includeDescription && description.includes(searchTerm);
      const categoryMatch = category.includes(searchTerm);

      return nameMatch || descriptionMatch || categoryMatch;
    });

    // Sort by relevance: exact matches first, then name matches, then description matches
    const sortedResults = results.sort((a, b) => {
      const aName = caseSensitive ? a.name : a.name.toLowerCase();
      const bName = caseSensitive ? b.name : b.name.toLowerCase();
      
      const aExact = aName === searchTerm ? 1 : 0;
      const bExact = bName === searchTerm ? 1 : 0;
      
      if (aExact !== bExact) return bExact - aExact;
      
      const aNameStart = aName.startsWith(searchTerm) ? 1 : 0;
      const bNameStart = bName.startsWith(searchTerm) ? 1 : 0;
      
      if (aNameStart !== bNameStart) return bNameStart - aNameStart;
      
      // Secondary sort by listen count
      return (b.listensCount || 0) - (a.listensCount || 0);
    });

    return limit ? sortedResults.slice(0, limit) : sortedResults;
  }, [allPlaylists]);

  const debouncedSearch = useMemo(
    () => debounce((query: string) => {
      setIsSearching(true);
      const results = searchPlaylists(query);
      setFilteredPlaylists(results);
      setIsSearching(false);
    }, delay),
    [searchPlaylists, delay]
  );

  useEffect(() => {
    return () => debouncedSearch.cancel();
  }, [debouncedSearch]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    
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
    debouncedSearch.cancel();
  }, [debouncedSearch]);

  return {
    searchQuery,
    filteredPlaylists,
    isSearching,
    handleSearch,
    clearSearch,
    hasResults: filteredPlaylists.length > 0,
    hasQuery: searchQuery.trim().length > 0,
  };
}