/**
 * Recently Played Types - Simplified Version
 * Tracks playlist plays without position/resume functionality
 */

export interface RecentlyPlayed {
  user_id: string;
  playlist_id: string;
  last_played_at: string;
  play_count: number;
  created_at: string;
  updated_at: string;
}

export interface RecentlyPlayedWithPlaylist extends RecentlyPlayed {
  // Enriched with playlist metadata
  name: string;
  description: string;
  image_url?: string;
  duration_estimate_ms?: number;
}

export interface RecentlyPlayedService {
  recordPlaylistPlay(userId: string, playlistId: string): Promise<void>;
  getRecentlyPlayed(userId: string, limit?: number): Promise<RecentlyPlayedWithPlaylist[]>;
  
  // Development utilities
  setMockMode(enabled: boolean): void;
}