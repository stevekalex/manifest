import React from 'react';
import { PlaylistCarousel } from './PlaylistCarousel';
import type { Playlist } from '@/types/audio';

interface FinancialSuccessCarouselProps {
  playlists: Playlist[];
}

export function FinancialSuccessCarousel({ playlists }: FinancialSuccessCarouselProps) {
  // Filter playlists related to abundance, money, and financial success
  const financialPlaylists = playlists.filter(playlist => 
    playlist.name.toLowerCase().includes('abundance') ||
    playlist.name.toLowerCase().includes('money') ||
    playlist.name.toLowerCase().includes('wealth') ||
    playlist.name.toLowerCase().includes('prosperity') ||
    playlist.name.toLowerCase().includes('financial') ||
    playlist.name.toLowerCase().includes('success') ||
    playlist.description?.toLowerCase().includes('abundance') ||
    playlist.description?.toLowerCase().includes('manifestation') ||
    playlist.description?.toLowerCase().includes('prosperity')
  );

  // If no specific financial playlists found, show all playlists
  const displayPlaylists = financialPlaylists.length > 0 ? financialPlaylists : playlists;

  return (
    <PlaylistCarousel
      title="Financial Success"
      playlists={displayPlaylists}
    />
  );
}