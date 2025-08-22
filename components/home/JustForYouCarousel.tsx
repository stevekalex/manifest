import React from 'react';
import { PlaylistCarousel } from './PlaylistCarousel';
import type { Playlist } from '@/types/audio';

interface JustForYouCarouselProps {
  playlists: Playlist[];
}

export function JustForYouCarousel({ playlists }: JustForYouCarouselProps) {
  // Take first 2 playlists for "Just for You" section
  const justForYouPlaylists = playlists.slice(0, 2);

  return (
    <PlaylistCarousel
      title="Just for You"
      playlists={justForYouPlaylists}
    />
  );
}