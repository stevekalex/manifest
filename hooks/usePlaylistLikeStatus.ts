import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { apiClient } from '@/utils/api';
import { useAuth } from '@/hooks/useAuth';

export interface UsePlaylistLikeStatusResult {
  isLiked: boolean;
  loading: boolean;
  error: string | null;
  toggleLike: () => Promise<void>;
}

export function usePlaylistLikeStatus(playlistId: string): UsePlaylistLikeStatusResult {
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  console.log('🎯 usePlaylistLikeStatus hook initialized for playlist:', playlistId);

  const checkLikeStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Checking like status for playlist:', playlistId);
      
      if (!isAuthenticated) {
        // When not authenticated, treat as not liked without error noise
        setIsLiked(false);
        return;
      }
      
      const response = await apiClient.checkPlaylistLikedStatus(playlistId);
      
      if (response.error) {
        console.error('❌ Check like status error:', response.error);
        setError(response.error);
        setIsLiked(false);
      } else {
        console.log('✅ Like status response:', response.data);
        setIsLiked(response.data?.isLiked || false);
      }
    } catch (err) {
      console.error('💥 Check like status exception:', err);
      setError(err instanceof Error ? err.message : 'Failed to check like status');
      setIsLiked(false);
    } finally {
      setLoading(false);
    }
  }, [playlistId, isAuthenticated]);

  const toggleLike = useCallback(async () => {
    try {
      setError(null);
      console.log('🔄 Toggling like for playlist:', playlistId, 'Current status:', isLiked);
      
      if (!isAuthenticated) {
        setError('Authentication required');
        // Navigate user to auth screen
        try { router.push('/auth'); } catch {}
        return;
      }
      
      if (isLiked) {
        console.log('➖ Unliking playlist...');
        const response = await apiClient.unlikePlaylist(playlistId);
        if (response.error) {
          console.error('❌ Failed to unlike:', response.error);
          setError(response.error);
          return;
        }
        console.log('✅ Successfully unliked');
        setIsLiked(false);
      } else {
        console.log('➕ Liking playlist...');
        const response = await apiClient.likePlaylist(playlistId);
        if (response.error) {
          console.error('❌ Failed to like:', response.error);
          setError(response.error);
          return;
        }
        console.log('✅ Successfully liked');
        setIsLiked(true);
      }
    } catch (err) {
      console.error('💥 Toggle like error:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle like');
    }
  }, [playlistId, isLiked, isAuthenticated]);

  useEffect(() => {
    if (playlistId) {
      checkLikeStatus();
    }
  }, [playlistId, checkLikeStatus]);

  return {
    isLiked,
    loading,
    error,
    toggleLike,
  };
}