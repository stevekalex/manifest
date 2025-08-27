import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ThemedText, ThemedView } from '@/components/theme/Themed';
import { PlaylistCard } from '@/components/common/PlaylistCard';
import { StateHandler } from '@/components/common/StateHandler';
import { getAllPlaylists } from '@/data/playlists';
import type { Playlist } from '@/types/audio';

export default function PlaylistsScreen() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadPlaylists = async () => {
    try {
      setError(null);
      // Simulate network delay for better UX
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

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Playlists
        </ThemedText>
        
        <StateHandler
          loading={isLoading}
          error={error}
          onRetry={loadPlaylists}
          loadingItemCount={2}
        >
          <ScrollView 
            style={styles.scrollView} 
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#6C5CE7"
              />
            }
          >
            {playlists.map((playlist, index) => (
              <Animated.View
                key={playlist.id}
                entering={FadeInDown.delay(index * 100).springify()}
              >
                <PlaylistCard
                  playlist={playlist}
                  onPress={() => handlePlaylistPress(playlist.id)}
                />
              </Animated.View>
            ))}
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
  title: {
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 32,
    fontWeight: '700',
    paddingHorizontal: 20,
  },
  scrollView: {
    flex: 1,
  },
});