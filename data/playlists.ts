import { CONFIDENCE_PLAYLISTS } from './confidencePlaylists';
import { FINANCIAL_PLAYLISTS } from './financialPlaylists';
import { POPULAR_PLAYLISTS } from './popularPlaylists';
import { RELATIONSHIP_PLAYLISTS } from './relationshipPlaylists';
import { HEALTH_WELLNESS_PLAYLISTS } from './healthWellnessPlaylists';
import type { Playlist, PlaylistSearchResult } from '../types/audio';

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
  
  // Relationship & Love Playlists
  ...RELATIONSHIP_PLAYLISTS.map(playlist => ({
    ...playlist,
    coverImage: require('../assets/images/react-logo.png'), // TODO: Add proper cover images
  })),
  
  // Health & Wellness Playlists
  ...HEALTH_WELLNESS_PLAYLISTS.map(playlist => ({
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

export function getPlaylistSearchData(): PlaylistSearchResult[] {
  return playlists.map(playlist => ({
    id: playlist.id,
    name: playlist.name,
    description: playlist.description,
    coverImage: playlist.coverImage,
    listensCount: playlist.listensCount || 0,
    category: getCategoryFromId(playlist.id),
  }));
}

function getCategoryFromId(playlistId: string): string {
  if (playlistId.startsWith('confidence-') || playlistId.includes('self-worth') || playlistId.includes('leadership') || playlistId.includes('social-confidence') || playlistId.includes('body-confidence') || playlistId.includes('public-speaking')) {
    return 'Confidence & Self-Development';
  }
  if (playlistId.startsWith('financial-') || playlistId.includes('abundance') || playlistId.includes('wealth') || playlistId.includes('money') || playlistId.includes('prosperity') || playlistId.includes('entrepreneur') || playlistId.includes('debt') || playlistId.includes('investment')) {
    return 'Financial Success';
  }
  if (playlistId.startsWith('relationship-') || playlistId.includes('soulmate') || playlistId.includes('marriage') || playlistId.includes('family') || playlistId.includes('friendship') || playlistId.includes('forgiveness') || playlistId.includes('communication')) {
    return 'Relationships & Love';
  }
  if (playlistId.startsWith('health-') || playlistId.includes('healing') || playlistId.includes('weight') || playlistId.includes('energy') || playlistId.includes('immune') || playlistId.includes('pain') || playlistId.includes('addiction') || playlistId.includes('perfect-health')) {
    return 'Health & Wellness';
  }
  return 'Popular';
}