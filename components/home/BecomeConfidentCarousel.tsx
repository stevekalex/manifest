import React from 'react';
import { PlaylistCarousel } from './PlaylistCarousel';
import type { Playlist } from '@/types/audio';

interface BecomeConfidentCarouselProps {
  playlists: Playlist[];
}

export function BecomeConfidentCarousel({ playlists }: BecomeConfidentCarouselProps) {
  // Filter playlists related to confidence and self-belief
  const confidentPlaylists = playlists.filter(playlist => 
    playlist.name.toLowerCase().includes('believe') ||
    playlist.name.toLowerCase().includes('confidence') ||
    playlist.name.toLowerCase().includes('self') ||
    playlist.description?.toLowerCase().includes('confidence') ||
    playlist.description?.toLowerCase().includes('self-belief') ||
    playlist.description?.toLowerCase().includes('empowering')
  );

  // If no specific confidence playlists found, show all playlists
  const displayPlaylists = confidentPlaylists.length > 0 ? confidentPlaylists : playlists;

  return (
    <PlaylistCarousel
      title="Become Confident"
      playlists={displayPlaylists}
    />
  );
}