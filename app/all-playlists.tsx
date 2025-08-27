import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedView, ThemedText } from '@/components/theme/Themed';
import { StateHandler } from '@/components/common/StateHandler';
import { PlaylistCard } from '@/components/common/PlaylistCard';
import { useThemeColor } from '@/hooks/useThemeColor';
import { getAllPlaylists } from '@/data/playlists';
import type { Playlist } from '@/types/audio';

export default function AllPlaylistsScreen() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  const loadPlaylists = async () => {
    try {
      setError(null);
      await new Promise(resolve => setTimeout(resolve, 300));
      const data = getAllPlaylists();
      setPlaylists(data);
    } catch (err) {
      setError('Failed to load playlists. Please try again.');
      console.error('Error loading playlists:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPlaylists();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadPlaylists();
  };

  const handlePlaylistPress = (playlistId: string) => {
    router.push(`/playlists/${playlistId}`);
  };

  const handleBackPress = () => {
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: `${tintColor}20`, borderWidth: 1, borderColor: tintColor }]}
            onPress={handleBackPress}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={tintColor} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.headerTitle}>
            All Playlists
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>
        
        <StateHandler
          loading={isLoading}
          error={error}
          onRetry={loadPlaylists}
          loadingItemCount={6}
        >

        {/* Playlists Count */}
        <View style={styles.countContainer}>
          <Text style={[styles.countText, { color: `${textColor}80` }]}>
            {playlists.length} playlist{playlists.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Playlists Grid */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={tintColor}
            />
          }
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.grid}>
            {playlists.map((playlist, index) => (
              <Animated.View
                key={playlist.id}
                entering={FadeInDown.delay(index * 50).springify()}
                style={styles.gridItem}
              >
                <PlaylistCard
                  playlist={playlist}
                  onPress={() => handlePlaylistPress(playlist.id)}
                />
              </Animated.View>
            ))}
          </View>
        </ScrollView>
        </StateHandler>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    minHeight: 60,
    backgroundColor: 'transparent',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerSpacer: {
    width: 40, // Same as back button for balance
  },
  countContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  countText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
});