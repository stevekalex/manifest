import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import type { Playlist } from '@/types/audio';

interface RecentlyPlayedCarouselProps {
  playlists: Playlist[];
}

export function RecentlyPlayedCarousel({ playlists }: RecentlyPlayedCarouselProps) {
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'glassMorphic');

  // Take first 5-6 playlists for recently played section
  const recentlyPlayedPlaylists = playlists.slice(0, 6);

  const handlePlaylistPress = (playlistId: string) => {
    router.push(`/playlists/${playlistId}`);
  };

  const handleViewAll = () => {
    // Navigation disabled - no action taken
    return;
  };

  // Always show the section, even if empty for better UX consistency

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Recently Played
        </ThemedText>
        <TouchableOpacity 
          onPress={handleViewAll} 
          activeOpacity={1}
          disabled={true}
        >
          <Text style={[styles.viewAllText, { color: tintColor, opacity: 0.4 }]}>View All</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalScroll}
      >
        {recentlyPlayedPlaylists.length > 0 ? (
          recentlyPlayedPlaylists.map((playlist, index) => (
            <Animated.View
              key={playlist.id}
              entering={FadeInDown.delay(index * 50).springify()}
              style={styles.cardWrapper}
            >
              <TouchableOpacity
                style={[styles.playlistCard, { backgroundColor: cardBackground }]}
                onPress={() => handlePlaylistPress(playlist.id)}
                activeOpacity={0.8}
              >
                {/* Playlist Cover/Icon */}
                <View style={[styles.coverContainer, { backgroundColor: `${tintColor}20` }]}>
                  <Ionicons name="musical-notes" size={24} color={tintColor} />
                </View>

                {/* Playlist Info */}
                <View style={styles.playlistInfo}>
                  <Text 
                    style={[styles.playlistTitle, { color: textColor }]}
                    numberOfLines={2}
                  >
                    {playlist.name}
                  </Text>
                  <Text 
                    style={[styles.playlistDescription, { color: `${textColor}80` }]}
                    numberOfLines={1}
                  >
                    {playlist.description || `${playlist.affirmations?.length || 0} affirmations`}
                  </Text>
                  <Text 
                    style={[styles.listenCount, { color: `${textColor}60` }]}
                  >
                    {playlist.listensCount || 0} listens
                  </Text>
                </View>

                {/* Play Button */}
                <TouchableOpacity 
                  style={[styles.playButton, { backgroundColor: tintColor }]}
                  onPress={() => handlePlaylistPress(playlist.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="play" size={16} color={backgroundColor} />
                </TouchableOpacity>
              </TouchableOpacity>
            </Animated.View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <ThemedText style={[styles.emptyText, { color: `${textColor}60` }]}>
              No recently played items yet. Start listening to build your history!
            </ThemedText>
          </View>
        )}
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
  viewAllText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  horizontalScroll: {
    paddingLeft: 20,
    paddingRight: 10,
  },
  cardWrapper: {
    marginRight: 16,
  },
  playlistCard: {
    width: 280,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  coverContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  playlistInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  playlistTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  playlistDescription: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 2,
  },
  listenCount: {
    fontSize: 12,
    lineHeight: 16,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 18,
  },
});