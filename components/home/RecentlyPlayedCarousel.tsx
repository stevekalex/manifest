import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ThemedText } from '@/components/theme/Themed';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import { recentlyPlayedService } from '@/services/recentlyPlayedService';
import type { RecentlyPlayedWithPlaylist } from '@/types/recently-played';

interface RecentlyPlayedCarouselProps {
  userId?: string;
}

export function RecentlyPlayedCarousel({ userId = 'test-user-123' }: RecentlyPlayedCarouselProps) {
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'glassMorphic');

  const [recentlyPlayedPlaylists, setRecentlyPlayedPlaylists] = useState<RecentlyPlayedWithPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecentlyPlayed = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await recentlyPlayedService.getRecentlyPlayed(userId, 6);
      setRecentlyPlayedPlaylists(data);
    } catch (err) {
      console.warn('Failed to load recently played:', err);
      setError('Failed to load recently played playlists');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data when component mounts
  useEffect(() => {
    loadRecentlyPlayed();
  }, [userId]);

  // Refetch data every time the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadRecentlyPlayed();
    }, [userId])
  );

  const handlePlaylistPress = (recentlyPlayed: RecentlyPlayedWithPlaylist) => {
    // Pass playlist data as URL parameters so the playlist page can display them
    const params = new URLSearchParams({
      themeName: recentlyPlayed.name,
      themeDescription: recentlyPlayed.description || 'A beautiful meditation experience awaits you',
    });
    
    router.push(`/playlists/${recentlyPlayed.playlist_id}?${params.toString()}`);
  };

  const handleViewAll = () => {
    // Navigate to view all recently played playlists
    router.push({
      pathname: '/all-playlists',
      params: {
        mode: 'recently-played',
        userId: userId,
      }
    });
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
          activeOpacity={0.8}
          disabled={false}
        >
          <Text style={[styles.viewAllText, { color: tintColor }]}>View All</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalScroll}
      >
        {isLoading ? (
          <View style={styles.loadingState}>
            <ThemedText style={[styles.loadingText, { color: `${textColor}60` }]}>
              Loading recently played...
            </ThemedText>
          </View>
        ) : error ? (
          <View style={styles.emptyState}>
            <ThemedText style={[styles.emptyText, { color: `${textColor}60` }]}>
              {error}
            </ThemedText>
          </View>
        ) : recentlyPlayedPlaylists.length > 0 ? (
          recentlyPlayedPlaylists.map((recentlyPlayed, index) => (
            <Animated.View
              key={recentlyPlayed.playlist_id}
              entering={FadeInDown.delay(index * 50).springify()}
              style={styles.cardWrapper}
            >
              <TouchableOpacity
                style={[styles.playlistCard, { backgroundColor: cardBackground }]}
                onPress={() => handlePlaylistPress(recentlyPlayed)}
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
                    {recentlyPlayed.name}
                  </Text>
                  <Text 
                    style={[styles.listenCount, { color: `${textColor}60` }]}
                  >
                    {recentlyPlayed.play_count} plays
                  </Text>
                </View>
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
    width: 260,
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
  listenCount: {
    fontSize: 12,
    lineHeight: 16,
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
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 18,
  },
});