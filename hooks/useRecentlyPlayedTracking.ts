/**
 * Recently Played Tracking Hook - Simplified Version
 * Tracks playlist plays without complex state management
 */

import { useCallback } from 'react';
import { recentlyPlayedService } from '@/services/recentlyPlayedService';

interface UseRecentlyPlayedTrackingProps {
  userId?: string;
  enabled?: boolean;
}

export function useRecentlyPlayedTracking({ 
  userId, 
  enabled = __DEV__ // Only enabled in development by default
}: UseRecentlyPlayedTrackingProps = {}) {
  
  const trackPlaylistPlay = useCallback(async (playlistId: string) => {
    // Early return if not enabled or missing data
    if (!enabled || !userId || !playlistId) {
      console.log('📱 [Recently Played] Tracking disabled or missing data:', { enabled, userId: !!userId, playlistId });
      return;
    }
    
    try {
      console.log('📱 [Recently Played] Tracking playlist play:', { userId, playlistId });
      await recentlyPlayedService.recordPlaylistPlay(userId, playlistId);
    } catch (error) {
      console.warn('📱 [Recently Played] Tracking failed (non-blocking):', error);
      // Don't throw - audio playback should continue regardless of tracking issues
    }
  }, [userId, enabled]);
  
  return {
    trackPlaylistPlay,
    isEnabled: enabled && !!userId
  };
}