import type { Theme, ThemesApiResponse, ThemePlaylist } from '../types/audio';
import { apiClient, type ApiResponse } from './api';
import { getPlaylistById } from '../data/playlists';

// Mapping from backend playlist IDs to frontend playlist IDs
const PLAYLIST_ID_MAPPING: Record<string, string> = {
  // Just for you / Popular playlists
  'p1': 'production-affirmations',
  'p2': 'inner-peace',
  
  // Popular Now / Trending playlists
  'p3': 'morning-motivation',
  'p4': 'stress-relief',
  
  // Confidence Building playlists
  'p5': 'believe-in-yourself',
  'p6': 'unshakeable-confidence',
  
  // Financial Success playlists
  'p7': 'abundance-mindset',
  'p8': 'money-magnetism',
};

// Helper function to map API playlist IDs to frontend playlist IDs (kept for reference)
// function mapPlaylistId(apiPlaylistId: string): string {
//   return PLAYLIST_ID_MAPPING[apiPlaylistId] || apiPlaylistId;
// }

// Helper function to map theme playlists from API response
function mapThemePlaylists(playlists: ThemePlaylist[]): ThemePlaylist[] {
  return playlists.map(playlist => {
    // Try to map to existing playlist ID, otherwise use the API ID directly
    const mappedId = PLAYLIST_ID_MAPPING[playlist.id] || playlist.id;
    
    // If this is a UUID (theme-specific playlist), keep it as is
    // If it's a mapped ID, verify it exists in frontend data
    if (mappedId !== playlist.id) {
      const exists = getPlaylistById(mappedId) !== undefined;
      if (!exists) {
        console.warn(`Mapped playlist with ID "${mappedId}" not found in frontend data, using original ID`);
        return playlist; // Keep original API playlist data
      }
    }
    
    return {
      ...playlist,
      id: mappedId,
    };
  });
}

export interface ThemesService {
  getAllThemes(): Promise<ApiResponse<Theme[]>>;
}

class ThemesServiceImpl implements ThemesService {
  async getAllThemes(): Promise<ApiResponse<Theme[]>> {
    const response = await apiClient.get<ThemesApiResponse>('/api/v1/homefeed');
    
    if (response.error) {
      return { error: response.error };
    }

    if (!response.data?.themes) {
      return { error: 'Invalid response format from homefeed API' };
    }

    // Map API response to include order and map playlist IDs
    const themesWithOrder = response.data.themes.map((theme, index) => ({
      ...theme,
      order: theme.order ?? index + 1,
      playlists: mapThemePlaylists(theme.playlists),
    }));

    return { data: themesWithOrder };
  }
}

export const themesService = new ThemesServiceImpl();