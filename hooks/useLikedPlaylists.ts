import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/utils/api';
import { ErrorHandler } from '@/utils/errorHandler';

export interface LikedPlaylistItem {
  user_id: string;
  playlist_id: string;
  created_at: string;
  playlists: {
    id: string;
    slug: string;
    name: string;
    description?: string;
    created_at: string;
  };
}

export interface UseLikedPlaylistsResult {
  likedPlaylists: LikedPlaylistItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  toggleLike: (playlistId: string) => Promise<boolean>;
  isPlaylistLiked: (playlistId: string) => boolean;
}

export function useLikedPlaylists(): UseLikedPlaylistsResult {
  const [likedPlaylists, setLikedPlaylists] = useState<LikedPlaylistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLikedPlaylists = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.getLikedPlaylists();
      
      if (ErrorHandler.handleApiError(response, {
        showAlert: false,
        title: 'Liked Playlists Error',
        fallbackMessage: 'Failed to load liked playlists.',
        onError: (error) => {
          setError(error);
        }
      })) {
        setLikedPlaylists([]);
      } else {
        setLikedPlaylists(response.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch liked playlists');
      setLikedPlaylists([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleLike = useCallback(async (playlistId: string): Promise<boolean> => {
    try {
      const isCurrentlyLiked = likedPlaylists.some(item => item.playlist_id === playlistId);
      
      if (isCurrentlyLiked) {
        const response = await apiClient.unlikePlaylist(playlistId);
        if (ErrorHandler.handleApiError(response, {
          showAlert: false,
          fallbackMessage: 'Failed to unlike playlist',
          onError: (error) => console.error('Failed to unlike playlist:', error)
        })) {
          return false;
        }
        
        // Remove from local state
        setLikedPlaylists(prev => prev.filter(item => item.playlist_id !== playlistId));
        return false;
      } else {
        const response = await apiClient.likePlaylist(playlistId);
        if (ErrorHandler.handleApiError(response, {
          showAlert: false,
          fallbackMessage: 'Failed to like playlist',
          onError: (error) => console.error('Failed to like playlist:', error)
        })) {
          return false;
        }
        
        // We don't have full playlist details from the like response,
        // so we'll refetch to get the updated list with details
        await fetchLikedPlaylists();
        return true;
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
      return likedPlaylists.some(item => item.playlist_id === playlistId);
    }
  }, [likedPlaylists, fetchLikedPlaylists]);

  const isPlaylistLiked = useCallback((playlistId: string): boolean => {
    return likedPlaylists.some(item => item.playlist_id === playlistId);
  }, [likedPlaylists]);

  useEffect(() => {
    fetchLikedPlaylists();
  }, [fetchLikedPlaylists]);

  return {
    likedPlaylists,
    loading,
    error,
    refetch: fetchLikedPlaylists,
    toggleLike,
    isPlaylistLiked,
  };
}