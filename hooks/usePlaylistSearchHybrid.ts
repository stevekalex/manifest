import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { AppState } from 'react-native';
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

interface CacheState {
  playlists: PlaylistSearchResult[];
  timestamp: number;
  isStale: boolean;
}

const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const BACKGROUND_REFRESH_THRESHOLD = 2 * 60 * 1000; // 2 minutes

export function usePlaylistSearchHybrid(delay: number = 300) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPlaylists, setFilteredPlaylists] = useState<PlaylistSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const cacheRef = useRef<CacheState>({
    playlists: [],
    timestamp: 0,
    isStale: true
  });

  // Load all playlists initially
  const loadPlaylists = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setIsLoadingPlaylists(true);
    }
    setError(null);

    try {
      audioLog('[HYBRID SEARCH] Loading all playlists...');
      const response = await apiClient.getAllPlaylists({ limit: 1000 });
      
      if (response.error) {
        audioWarn('[HYBRID SEARCH] Load error:', response.error);
        setError(response.error);
        return;
      }

      if (!response.data) {
        audioLog('[HYBRID SEARCH] No playlist data received');
        cacheRef.current = {
          playlists: [],
          timestamp: Date.now(),
          isStale: false
        };
        return;
      }

      // Transform backend data to frontend format
      const transformedPlaylists: PlaylistSearchResult[] = response.data.map(playlist => ({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        // Default values for missing fields until we add them to backend
        coverImage: undefined,
        listensCount: 0,
        category: undefined,
      }));

      cacheRef.current = {
        playlists: transformedPlaylists,
        timestamp: Date.now(),
        isStale: false
      };

      audioLog(`[HYBRID SEARCH] Loaded ${transformedPlaylists.length} playlists`);
      
      // If there's an active search, re-filter with the new data
      if (searchQuery.trim()) {
        performClientSearch(searchQuery, transformedPlaylists);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load playlists';
      audioWarn('[HYBRID SEARCH] Load exception:', errorMessage);
      setError(errorMessage);
    } finally {
      if (!isBackground) {
        setIsLoadingPlaylists(false);
      }
    }
  }, [searchQuery]);

  // Client-side search through cached playlists
  const performClientSearch = useCallback((query: string, playlists?: PlaylistSearchResult[]) => {
    const searchData = playlists || cacheRef.current.playlists;
    
    if (!query.trim()) {
      setFilteredPlaylists([]);
      return;
    }

    setIsSearching(true);

    // Normalize search term
    const searchTerm = query.toLowerCase().trim();
    
    // Search through playlists
    const results = searchData.filter(playlist => {
      const name = playlist.name.toLowerCase();
      const description = playlist.description?.toLowerCase() || '';
      const category = playlist.category?.toLowerCase() || '';

      // Check for matches in name, description, or category
      const nameMatch = name.includes(searchTerm);
      const descriptionMatch = description.includes(searchTerm);
      const categoryMatch = category.includes(searchTerm);
      
      // Fuzzy matching for typos (simple implementation)
      const fuzzyNameMatch = name.includes(searchTerm.slice(0, -1)) && searchTerm.length > 2;
      const fuzzyDescMatch = description.includes(searchTerm.slice(0, -1)) && searchTerm.length > 2;

      return nameMatch || descriptionMatch || categoryMatch || fuzzyNameMatch || fuzzyDescMatch;
    });

    // Sort by relevance
    const sortedResults = results.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      
      // Exact name matches first
      const aExact = aName === searchTerm ? 1 : 0;
      const bExact = bName === searchTerm ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;
      
      // Name starts with search term
      const aNameStart = aName.startsWith(searchTerm) ? 1 : 0;
      const bNameStart = bName.startsWith(searchTerm) ? 1 : 0;
      if (aNameStart !== bNameStart) return bNameStart - aNameStart;
      
      // Name contains search term
      const aNameContains = aName.includes(searchTerm) ? 1 : 0;
      const bNameContains = bName.includes(searchTerm) ? 1 : 0;
      if (aNameContains !== bNameContains) return bNameContains - aNameContains;
      
      // Secondary sort by listen count
      return (b.listensCount || 0) - (a.listensCount || 0);
    });

    setFilteredPlaylists(sortedResults);
    setIsSearching(false);
    audioLog(`[HYBRID SEARCH] Found ${sortedResults.length} matches for "${query}"`);
  }, []);

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((query: string) => {
      performClientSearch(query);
    }, delay),
    [performClientSearch, delay]
  );

  // Check if cache needs refresh
  const isCacheExpired = useCallback(() => {
    const now = Date.now();
    return now - cacheRef.current.timestamp > CACHE_EXPIRY_MS;
  }, []);

  const shouldBackgroundRefresh = useCallback(() => {
    const now = Date.now();
    return now - cacheRef.current.timestamp > BACKGROUND_REFRESH_THRESHOLD;
  }, []);

  // Handle search input
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setError(null);
    
    if (!query.trim()) {
      setFilteredPlaylists([]);
      setIsSearching(false);
      debouncedSearch.cancel();
      return;
    }
    
    // If cache is expired, reload first
    if (isCacheExpired()) {
      audioLog('[HYBRID SEARCH] Cache expired, reloading playlists...');
      loadPlaylists();
      return;
    }
    
    // Perform debounced search
    debouncedSearch(query);
  }, [debouncedSearch, isCacheExpired, loadPlaylists]);

  // Manual refresh
  const refreshPlaylists = useCallback(() => {
    return loadPlaylists(false);
  }, [loadPlaylists]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setFilteredPlaylists([]);
    setIsSearching(false);
    setError(null);
    debouncedSearch.cancel();
  }, [debouncedSearch]);

  // Initial load
  useEffect(() => {
    loadPlaylists();
  }, [loadPlaylists]);

  // Background refresh on app state change
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && shouldBackgroundRefresh()) {
        audioLog('[HYBRID SEARCH] App became active, background refreshing...');
        loadPlaylists(true);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [shouldBackgroundRefresh, loadPlaylists]);

  // Cleanup debounced function
  useEffect(() => {
    return () => debouncedSearch.cancel();
  }, [debouncedSearch]);

  return {
    searchQuery,
    filteredPlaylists,
    isSearching,
    isLoadingPlaylists,
    error,
    handleSearch,
    clearSearch,
    refreshPlaylists,
    hasResults: filteredPlaylists.length > 0,
    hasQuery: searchQuery.trim().length > 0,
    cacheTimestamp: cacheRef.current.timestamp,
    totalPlaylistsLoaded: cacheRef.current.playlists.length,
    isCacheStale: isCacheExpired(),
  };
}