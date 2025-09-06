/**
 * Recently Played Service - Simplified Version
 * Tracks playlist plays only (no position tracking)
 */

import { apiClient } from '@/utils/api';
import type { RecentlyPlayedWithPlaylist, RecentlyPlayedService } from '@/types/recently-played';

class RecentlyPlayedServiceImpl implements RecentlyPlayedService {
  private basePath = '/recently-played';
  private mockMode = false; // Use real API now that backend is implemented

  /**
   * Record that a user played a playlist
   * Simple UPSERT operation - increments play count and updates timestamp
   */
  async recordPlaylistPlay(userId: string, playlistId: string): Promise<void> {
    if (this.mockMode) {
      console.log('🎭 [Recently Played SERVICE] Mock mode - simulating play recording:', { userId, playlistId });
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log('🎭 [Recently Played SERVICE] Mock recording completed');
      return;
    }

    try {
      console.log('🌐 [Recently Played SERVICE] Making API call to record play:', { 
        userId, 
        playlistId,
        endpoint: `${this.basePath}/play` 
      });
      
      const payload = {
        user_id: userId,
        playlist_id: playlistId
      };
      console.log('🌐 [Recently Played SERVICE] API payload:', payload);
      
      const response = await apiClient.post(`${this.basePath}/play`, payload);
      
      console.log('🌐 [Recently Played SERVICE] API response received:', {
        hasError: !!response.error,
        hasData: !!response.data,
        response: response
      });
      
      if (response.error) {
        console.error('❌ [Recently Played SERVICE] API error recording play:', response.error);
        throw new Error(`API Error: ${response.error}`);
      } else {
        console.log('✅ [Recently Played SERVICE] Successfully recorded play:', { userId, playlistId });
      }
    } catch (error) {
      console.error('💥 [Recently Played SERVICE] Exception while recording play:', {
        userId,
        playlistId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error; // Re-throw so the hook can catch and handle it
    }
  }

  /**
   * Get recently played playlists for a user
   * Returns mock data in development, real API data in production
   */
  async getRecentlyPlayed(userId: string, limit: number = 10): Promise<RecentlyPlayedWithPlaylist[]> {
    if (this.mockMode) {
      console.log('📱 [Recently Played Mock] Getting recent for:', userId);
      
      // Return realistic mock data
      return [
        {
          user_id: userId,
          playlist_id: 'morning-affirmations',
          last_played_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
          play_count: 3,
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 1 week ago
          updated_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          name: 'Morning Affirmations',
          description: 'Start your day with positive energy'
        },
        {
          user_id: userId,
          playlist_id: 'sleep-meditation',
          last_played_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
          play_count: 1,
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
          updated_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
          name: 'Sleep Meditation',
          description: 'Peaceful sounds for better sleep'
        },
        {
          user_id: userId,
          playlist_id: 'confidence-boost',
          last_played_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
          play_count: 7,
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(), // 2 weeks ago
          updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
          name: 'Confidence Boost',
          description: 'Build unstoppable self-confidence'
        }
      ].slice(0, limit);
    }

    try {
      const response = await apiClient.get<{recently_played: RecentlyPlayedWithPlaylist[]}>
        (`${this.basePath}?user_id=${userId}&limit=${limit}`);
      
      if (response.error) {
        console.warn('📱 [Recently Played] API error:', response.error);
        return [];
      }
      
      const recentPlaylists = response.data?.recently_played || [];
      console.log('📱 [Recently Played] Loaded', recentPlaylists.length, 'recent playlists');
      return recentPlaylists;
    } catch (error) {
      console.warn('📱 [Recently Played] Failed to load recent playlists:', error);
      return []; // Return empty array on error - UI handles gracefully
    }
  }

  /**
   * Toggle mock mode for development and testing
   */
  setMockMode(enabled: boolean): void {
    this.mockMode = enabled;
    console.log('📱 [Recently Played] Mock mode:', enabled ? 'enabled' : 'disabled');
  }
}

export const recentlyPlayedService = new RecentlyPlayedServiceImpl();