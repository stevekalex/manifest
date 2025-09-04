import { router } from 'expo-router';
import type { Playlist, ThemePlaylist } from '@/types/audio';

// Type guard to check if playlist is a ThemePlaylist
const isThemePlaylist = (playlist: ThemePlaylist | Playlist): playlist is ThemePlaylist => {
  return 'created_at' in playlist;
};

export function usePlaylistNavigation() {
  const navigateToPlaylist = (playlist: ThemePlaylist | Playlist) => {
    if (isThemePlaylist(playlist)) {
      // Theme playlist: pass data directly to avoid API lookup issues
      router.push({
        pathname: `/playlists/${playlist.id}`,
        params: {
          themeName: playlist.name,
          themeDescription: playlist.description || '',
          themeImageUrl: playlist.image_url || '',
          themeCreatedAt: playlist.created_at || '',
        }
      });
    } else {
      // Regular playlist: use standard navigation
      router.push(`/playlists/${playlist.id}`);
    }
  };

  return { navigateToPlaylist };
}