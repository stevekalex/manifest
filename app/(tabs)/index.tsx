import { ThemedView } from '@/components/ThemedView';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { RecentlyPlayedCarousel } from '@/components/home/RecentlyPlayedCarousel';
import { ThemeCarousel } from '@/components/home/ThemeCarousel';
import { WelcomePage } from '@/components/welcome';
import { getAllPlaylists } from '@/data/playlists';
import { getAllThemes } from '@/data/themes';
import { themesService } from '@/utils/themesService';
import { useThemeColor } from '@/hooks/useThemeColor';
import type { Playlist, Theme } from '@/types/audio';
import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const tintColor = useThemeColor({}, 'tint');

  const loadData = async () => {
    try {
      setError(null);
      
      // Load playlists (keeping existing logic)
      const playlistData = getAllPlaylists();
      setPlaylists(playlistData);
      
      // Load themes from API with fallback to hardcoded data
      console.log('🏠 HomeScreen: Fetching themes from API...');
      const themesResponse = await themesService.getAllThemes();
      
      if (themesResponse.error) {
        console.warn('🏠 HomeScreen: API themes failed, falling back to hardcoded data:', themesResponse.error);
        // Fallback to hardcoded themes
        const fallbackThemes = getAllThemes();
        console.log('🏠 HomeScreen: Using fallback themes:', fallbackThemes);
        setThemes(fallbackThemes);
      } else if (themesResponse.data) {
        const sortedThemes = [...themesResponse.data].sort((a, b) => (a.order || 0) - (b.order || 0));
        console.log('🏠 HomeScreen: Successfully loaded themes from API:', sortedThemes);
        console.log('🏠 HomeScreen: Sample theme playlist:', sortedThemes[0]?.playlists[0]);
        setThemes(sortedThemes);
      } else {
        // Unexpected response structure, use fallback
        console.warn('🏠 HomeScreen: Unexpected API response structure, using fallback themes');
        const fallbackThemes = getAllThemes();
        console.log('🏠 HomeScreen: Using fallback themes after unexpected response:', fallbackThemes);
        setThemes(fallbackThemes);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      // Final fallback - try to load hardcoded themes
      try {
        const fallbackThemes = getAllThemes();
        setThemes(fallbackThemes);
      } catch (fallbackErr) {
        setError('Failed to load content. Please try again.');
        console.error('Fallback themes also failed:', fallbackErr);
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
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
          <ErrorState message={error} onRetry={loadData} />
        </SafeAreaView>
      </ThemedView>
    );
  }

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
          contentContainerStyle={styles.scrollContent}
        >
          {/* Welcome Section */}
          <WelcomePage userName="Steve Alex" />

          {/* Content Container with better spacing */}
          <View style={styles.contentContainer}>
            {/* Recently Played Section */}
            <View style={styles.sectionWrapper}>
              <RecentlyPlayedCarousel playlists={playlists} />
            </View>

            {/* Theme-based Carousel Sections */}
            {themes.map((theme, index) => (
              <View key={theme.id} style={styles.sectionWrapper}>
                <ThemeCarousel theme={theme} />
              </View>
            ))}

            {/* Bottom spacing for better scroll experience */}
            <View style={styles.bottomSpacing} />
          </View>
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
  scrollContent: {
    flexGrow: 1,
  },
  contentContainer: {
    paddingTop: 8,
  },
  sectionWrapper: {
    marginBottom: 8,
  },
  bottomSpacing: {
    height: 40,
  },
});