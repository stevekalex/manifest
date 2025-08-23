import type { Theme, ThemePlaylist } from '../types/audio';
import { CONFIDENCE_PLAYLISTS } from './confidencePlaylists';
import { FINANCIAL_PLAYLISTS } from './financialPlaylists';
import { POPULAR_PLAYLISTS } from './popularPlaylists';

// Convert playlist to theme playlist format
function toThemePlaylist(playlist: any): ThemePlaylist {
  return {
    id: playlist.id,
    name: playlist.name,
    description: playlist.description,
    image: '../assets/images/react-logo.png', // TODO: Add proper theme images
  };
}

// Theme definitions with organized playlists
export const themes: Theme[] = [
  {
    id: 'just-for-you',
    name: 'Just For You',
    description: 'Personalized recommendations based on your listening history',
    playlists: POPULAR_PLAYLISTS.slice(0, 3).map(toThemePlaylist),
    order: 1,
  },
  {
    id: 'popular-now',
    name: 'Popular Now',
    description: 'Trending playlists everyone is listening to',
    playlists: POPULAR_PLAYLISTS.map(toThemePlaylist),
    order: 2,
  },
  {
    id: 'confidence-building',
    name: 'Become Confident',
    description: 'Build unshakeable confidence and self-belief',
    playlists: CONFIDENCE_PLAYLISTS.map(toThemePlaylist),
    order: 3,
  },
  {
    id: 'financial-success',
    name: 'Financial Success',
    description: 'Manifest abundance and financial prosperity',
    playlists: FINANCIAL_PLAYLISTS.map(toThemePlaylist),
    order: 4,
  },
];

export function getAllThemes(): Theme[] {
  return [...themes].sort((a, b) => a.order - b.order);
}

export function getThemeById(id: string): Theme | undefined {
  return themes.find(theme => theme.id === id);
}

export function getThemeByName(name: string): Theme | undefined {
  return themes.find(theme => theme.name.toLowerCase().includes(name.toLowerCase()));
}

export function getFeaturedThemes(): Theme[] {
  // Return first 3 themes for featured section
  return getAllThemes().slice(0, 3);
}