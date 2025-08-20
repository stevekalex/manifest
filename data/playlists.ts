import { PRODUCTION_PLAYLIST } from './productionPlaylist';
import { SAMPLE_PLAYLIST } from './samplePlaylist';
import type { Playlist } from '../types/audio';

// Centralized playlist data with cover images and metadata
export const playlists: Playlist[] = [
  {
    ...PRODUCTION_PLAYLIST,
    coverImage: require('../assets/images/react-logo.png'), // TODO: Add proper cover images
    listensCount: 201000,
    description: 'Powerful affirmations for manifestation and abundance',
  },
  {
    ...SAMPLE_PLAYLIST,
    coverImage: require('../assets/images/partial-react-logo.png'), // TODO: Add proper cover images  
    listensCount: 85000,
    description: 'A collection of empowering affirmations to boost self-belief and confidence',
  },
];

export function getPlaylistById(id: string): Playlist | undefined {
  return playlists.find(playlist => playlist.id === id);
}

export function getAllPlaylists(): Playlist[] {
  return playlists;
}

export function getPlaylistByName(name: string): Playlist | undefined {
  return playlists.find(playlist => playlist.name.toLowerCase().includes(name.toLowerCase()));
}

export function getFeaturedPlaylists(): Playlist[] {
  // Return playlists sorted by listen count for featured section
  return [...playlists].sort((a, b) => (b.listensCount || 0) - (a.listensCount || 0));
}