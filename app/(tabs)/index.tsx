import { ThemedView } from '@/components/ThemedView';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { BecomeConfidentCarousel } from '@/components/home/BecomeConfidentCarousel';
import { FinancialSuccessCarousel } from '@/components/home/FinancialSuccessCarousel';
import { JustForYouCarousel } from '@/components/home/JustForYouCarousel';
import { PopularPlaylistsCarousel } from '@/components/home/PopularPlaylistsCarousel';
import { WelcomePage } from '@/components/welcome';
import { getAllPlaylists } from '@/data/playlists';
import { useThemeColor } from '@/hooks/useThemeColor';
import type { Playlist } from '@/types/audio';
import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const tintColor = useThemeColor({}, 'tint');

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

  // All playlists will be used by individual carousel components

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
          {/* Welcome Section */}
          <WelcomePage userName="Steve Alex" />

          {/* Carousel Sections */}
          <JustForYouCarousel playlists={playlists} />
          <PopularPlaylistsCarousel playlists={playlists} />
          <BecomeConfidentCarousel playlists={playlists} />
          <FinancialSuccessCarousel playlists={playlists} />
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
});