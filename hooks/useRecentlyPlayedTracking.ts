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
  enabled = true // Enabled by default for recently played functionality
}: UseRecentlyPlayedTrackingProps = {}) {
  
  // Log initialization
  console.log('🎬 [Recently Played TRACKING] Hook initialized:', {
    userId,
    enabled,
    isReady: enabled && !!userId
  });
  
  const trackPlaylistPlay = useCallback(async (playlistId: string) => {
    // Early return if not enabled or missing data
    if (!enabled || !userId || !playlistId) {
      console.log('🚫 [Recently Played TRACKING] Disabled or missing data:', { enabled, userId: !!userId, playlistId });
      return;
    }
    
    try {
      console.log('🎯 [Recently Played TRACKING] STARTING playlist play tracking:', { userId, playlistId });
      console.log('🎯 [Recently Played TRACKING] Calling recentlyPlayedService.recordPlaylistPlay...');
      
      const startTime = Date.now();
      await recentlyPlayedService.recordPlaylistPlay(userId, playlistId);
      const endTime = Date.now();
      
      console.log('✅ [Recently Played TRACKING] SUCCESS! Playlist play recorded:', { 
        userId, 
        playlistId, 
        duration: `${endTime - startTime}ms` 
      });
    } catch (error) {
      console.error('❌ [Recently Played TRACKING] FAILED to record play:', {
        userId,
        playlistId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
      // Don't throw - audio playbook should continue regardless of tracking issues
    }
  }, [userId, enabled]);
  
  return {
    trackPlaylistPlay,
    isEnabled: enabled && !!userId
  };
}