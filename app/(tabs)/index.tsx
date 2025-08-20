import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { PlaylistCard } from '@/components/common/PlaylistCard';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { getAllPlaylists } from '@/data/playlists';
import { useThemeColor } from '@/hooks/useThemeColor';
import type { Playlist } from '@/types/audio';

export default function HomeScreen() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');

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

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <LoadingState itemCount={2} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ErrorState message={error} onRetry={loadPlaylists} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  // Split playlists for different sections
  const popularPlaylists = playlists.slice(0, 2);
  const otherPlaylists = playlists.slice(2);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
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
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <Text style={[styles.logoText, { color: '#FFD700' }]}>✧</Text>
              </View>
            </View>
          </View>

          {/* Just for You Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Just for You
              </ThemedText>
              <Text style={[styles.arrow, { color: textColor }]}>→</Text>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {popularPlaylists.map((playlist, index) => (
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

          {/* Popular Playlists Section */}
          {otherPlaylists.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                  Popular Playlists
                </ThemedText>
                <Text style={[styles.arrow, { color: textColor }]}>→</Text>
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
              >
                {otherPlaylists.map((playlist, index) => (
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
          )}
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
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