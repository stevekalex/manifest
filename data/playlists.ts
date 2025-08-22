import { CONFIDENCE_PLAYLISTS } from './confidencePlaylists';
import { FINANCIAL_PLAYLISTS } from './financialPlaylists';
import { POPULAR_PLAYLISTS } from './popularPlaylists';
import type { Playlist } from '../types/audio';

// Centralized playlist data with cover images and metadata
export const playlists: Playlist[] = [
  // Popular/General Playlists
  ...POPULAR_PLAYLISTS.map(playlist => ({
    ...playlist,
    coverImage: require('../assets/images/react-logo.png'), // TODO: Add proper cover images
  })),
  
  // Confidence & Self-Development Playlists  
  ...CONFIDENCE_PLAYLISTS.map(playlist => ({
    ...playlist,
    coverImage: require('../assets/images/partial-react-logo.png'), // TODO: Add proper cover images
  })),
  
  // Financial Success & Abundance Playlists
  ...FINANCIAL_PLAYLISTS.map(playlist => ({
    ...playlist,
    coverImage: require('../assets/images/react-logo.png'), // TODO: Add proper cover images
  })),
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