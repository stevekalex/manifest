import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { apiClient } from '@/utils/api';
import { useAuth } from '@/hooks/useAuth';
import { audioLog, audioWarn, audioError } from '@/utils/logger';
import { ErrorHandler } from '@/utils/errorHandler';

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

  audioLog('[LIKE] Hook initialized for playlist:', playlistId);

  const checkLikeStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      audioLog('[LIKE] Checking status for playlist:', playlistId);
      
      if (!isAuthenticated) {
        // When not authenticated, treat as not liked without error noise
        setIsLiked(false);
        setLoading(false);
        return;
      }
      
      // For sample/demo data, just return false without API call
      if (playlistId.includes('production-') || playlistId.includes('confidence-') || 
          playlistId.includes('financial-') || playlistId.includes('relationship-') ||
          playlistId.includes('health-') || playlistId.includes('inner-peace') ||
          playlistId.includes('morning-') || playlistId.includes('stress-') ||
          playlistId.includes('positive-') || playlistId.includes('evening-') ||
          playlistId.includes('sleep-') || playlistId.includes('anxiety-') ||
          playlistId.includes('self-love') || playlistId.includes('focus-')) {
        audioLog('[LIKE] Using sample data - no API call needed');
        setIsLiked(false);
        setLoading(false);
        return;
      }
      
      const response = await apiClient.checkPlaylistLikedStatus(playlistId);
      
      if (ErrorHandler.handleApiError(response, {
        showAlert: false,
        title: 'Like Status Error',
        fallbackMessage: 'Failed to check like status',
        onError: (error) => {
          audioError('[LIKE] Check status error:', error);
          setError(error);
        }
      })) {
        setIsLiked(false);
      } else {
        audioLog('[LIKE] Status response received:', { isLiked: response.data?.isLiked });
        setIsLiked(response.data?.isLiked || false);
      }
    } catch (err) {
      audioError('[LIKE] Check status exception:', err);
      setError(err instanceof Error ? err.message : 'Failed to check like status');
      setIsLiked(false);
    } finally {
      setLoading(false);
    }
  }, [playlistId, isAuthenticated]);

  const toggleLike = useCallback(async () => {
    try {
      setError(null);
      audioLog('[LIKE] Toggling for playlist:', playlistId, 'Current:', isLiked);
      
      if (!isAuthenticated) {
        setError('Authentication required');
        // Navigate user to auth screen
        try { router.push('/auth'); } catch {}
        return;
      }
      
      // For sample/demo data, just toggle locally without API call
      if (playlistId.includes('production-') || playlistId.includes('confidence-') || 
          playlistId.includes('financial-') || playlistId.includes('relationship-') ||
          playlistId.includes('health-') || playlistId.includes('inner-peace') ||
          playlistId.includes('morning-') || playlistId.includes('stress-') ||
          playlistId.includes('positive-') || playlistId.includes('evening-') ||
          playlistId.includes('sleep-') || playlistId.includes('anxiety-') ||
          playlistId.includes('self-love') || playlistId.includes('focus-')) {
        audioLog('[LIKE] Sample data - toggling locally');
        setIsLiked(!isLiked);
        return;
      }
      
      if (isLiked) {
        audioLog('[LIKE] Unliking playlist...');
        const response = await apiClient.unlikePlaylist(playlistId);
        if (ErrorHandler.handleApiError(response, {
          showAlert: false,
          fallbackMessage: 'Failed to unlike playlist',
          onError: (error) => {
            audioError('[LIKE] Failed to unlike:', error);
            setError(error);
          }
        })) {
          return;
        }
        audioLog('[LIKE] Successfully unliked');
        setIsLiked(false);
      } else {
        audioLog('[LIKE] Liking playlist...');
        const response = await apiClient.likePlaylist(playlistId);
        if (ErrorHandler.handleApiError(response, {
          showAlert: false,
          fallbackMessage: 'Failed to like playlist',
          onError: (error) => {
            audioError('[LIKE] Failed to like:', error);
            setError(error);
          }
        })) {
          return;
        }
        audioLog('[LIKE] Successfully liked');
        setIsLiked(true);
      }
    } catch (err) {
      audioError('[LIKE] Toggle error:', err);
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