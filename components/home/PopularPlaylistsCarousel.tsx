import React from 'react';
import { PlaylistCarousel } from './PlaylistCarousel';
import type { Playlist } from '@/types/audio';

interface PopularPlaylistsCarouselProps {
  playlists: Playlist[];
}

export function PopularPlaylistsCarousel({ playlists }: PopularPlaylistsCarouselProps) {
  // Sort by listens count for popular section
  const popularPlaylists = [...playlists].sort((a, b) => (b.listensCount || 0) - (a.listensCount || 0));

  return (
    <PlaylistCarousel
      title="Popular Playlists"
      playlists={popularPlaylists}
    />
  );
}