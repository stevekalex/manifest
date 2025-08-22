import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ThemedText } from '@/components/ThemedText';
import { PlaylistCard } from '@/components/common/PlaylistCard';
import { useThemeColor } from '@/hooks/useThemeColor';
import type { Playlist } from '@/types/audio';

interface PlaylistCarouselProps {
  title: string;
  playlists: Playlist[];
  showArrow?: boolean;
}

export function PlaylistCarousel({ title, playlists, showArrow = true }: PlaylistCarouselProps) {
  const textColor = useThemeColor({}, 'text');

  const handlePlaylistPress = (playlistId: string) => {
    router.push(`/playlists/${playlistId}`);
  };

  if (playlists.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {title}
        </ThemedText>
        {showArrow && (
          <Text style={[styles.arrow, { color: textColor }]}>→</Text>
        )}
      </View>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalScroll}
      >
        {playlists.map((playlist, index) => (
          <Animated.View
            key={playlist.id}
            entering={FadeInDown.delay(index * 100).springify()}
            style={styles.cardWrapper}
          >
            <PlaylistCard
              playlist={playlist}
              onPress={() => handlePlaylistPress(playlist.id)}
            />
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  arrow: {
    fontSize: 24,
  },
  horizontalScroll: {
    paddingLeft: 10,
  },
  cardWrapper: {
    marginRight: -10, // Compensate for card's internal margin
  },
});