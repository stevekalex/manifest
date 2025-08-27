import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ThemedText } from '@/components/theme/Themed';
import { PlaylistCard } from '@/components/common/PlaylistCard';
import { useThemeColor } from '@/hooks/useThemeColor';
import type { Playlist } from '@/types/audio';

interface PlaylistCarouselProps {
  title: string;
  playlists: Playlist[];
  showArrow?: boolean;
  onViewAllPress?: () => void;
}

export function PlaylistCarousel({ title, playlists, showArrow = true, onViewAllPress }: PlaylistCarouselProps) {
  const tintColor = useThemeColor({}, 'tint');

  const handlePlaylistPress = (playlistId: string) => {
    router.push(`/playlists/${playlistId}`);
  };

  const handleViewAllPress = () => {
    if (onViewAllPress) {
      onViewAllPress();
    } else {
      router.push('/all-playlists');
    }
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
          <TouchableOpacity
            style={[styles.viewAllButton, { backgroundColor: `${tintColor}15` }]}
            onPress={handleViewAllPress}
            activeOpacity={0.7}
          >
            <Text style={[styles.viewAllText, { color: tintColor }]}>View all</Text>
          </TouchableOpacity>
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
    flex: 1,
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 16,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  horizontalScroll: {
    paddingLeft: 10,
  },
  cardWrapper: {
    marginRight: -10, // Compensate for card's internal margin
  },
});