import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedView } from '@/components/theme/Themed';
import { StateHandler } from '@/components/common/StateHandler';
import { PlaylistCard } from '@/components/common/PlaylistCard';
import { ThemePlaylistCard } from '@/components/common/ThemePlaylistCard';
import { useThemeColor } from '@/hooks/useThemeColor';
import { usePlaylistNavigation } from '@/hooks/usePlaylistNavigation';
import { getAllPlaylists } from '@/data/playlists';
import type { Playlist, ThemePlaylist } from '@/types/audio';

interface PlaylistsState {
  playlists: Playlist[];
  themePlaylists: ThemePlaylist[];
  isLoading: boolean;
  error: string | null;
  refreshing: boolean;
  displayTitle: string;
  isThemeView: boolean;
}

export default function AllPlaylistsScreen() {
  const [state, setState] = useState<PlaylistsState>({
    playlists: [],
    themePlaylists: [],
    isLoading: true,
    error: null,
    refreshing: false,
    displayTitle: 'All Playlists',
    isThemeView: false,
  });

  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const { navigateToPlaylist } = usePlaylistNavigation();
  
  // Get theme parameters from navigation
  const params = useLocalSearchParams();
  const themeName = params.themeName as string;
  const themePlaylistsParam = params.themePlaylists as string;

  const loadPlaylists = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (themePlaylistsParam && themeName) {
        // Parse theme playlists from navigation - use them directly
        const themePlaylists: ThemePlaylist[] = JSON.parse(themePlaylistsParam);
        
        setState(prev => ({
          ...prev,
          themePlaylists,
          displayTitle: themeName,
          isThemeView: true,
        }));
      } else {
        // Fallback: Show all playlists (default behavior when no theme data)
        const data = getAllPlaylists();
        setState(prev => ({
          ...prev,
          playlists: data,
          displayTitle: 'All Playlists',
          isThemeView: false,
        }));
      }
    } catch (err) {
      console.error('Error loading playlists:', err);
      setState(prev => ({
        ...prev,
        error: 'Failed to load playlists. Please try again.',
      }));
    } finally {
      setState(prev => ({
        ...prev,
        isLoading: false,
        refreshing: false,
      }));
    }
  }, [themePlaylistsParam, themeName]);

  useEffect(() => {
    loadPlaylists();
  }, [loadPlaylists]);

  const handleRefresh = () => {
    setState(prev => ({ ...prev, refreshing: true }));
    loadPlaylists();
  };

  const renderContent = () => {
    if (state.isThemeView) {
      return (
        <>
          <PageHeading title={state.displayTitle} textColor={textColor} />
          <PlaylistScrollView
            refreshing={state.refreshing}
            onRefresh={handleRefresh}
            tintColor={tintColor}
            contentStyle={styles.scrollContentTheme}
          >
            <View style={styles.themeGrid}>
              {state.themePlaylists.map((playlist, index) => (
                <ThemePlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  index={index}
                  onPress={navigateToPlaylist}
                />
              ))}
            </View>
          </PlaylistScrollView>
        </>
      );
    }

    return (
      <>
        <PlaylistCount count={state.playlists.length} textColor={textColor} />
        <PlaylistScrollView
          refreshing={state.refreshing}
          onRefresh={handleRefresh}
          tintColor={tintColor}
          contentStyle={styles.scrollContent}
        >
          <View style={styles.grid}>
            {state.playlists.map((playlist, index) => (
              <Animated.View
                key={playlist.id}
                entering={FadeInDown.delay(index * 50).springify()}
                style={styles.gridItem}
              >
                <PlaylistCard
                  playlist={playlist}
                  onPress={() => navigateToPlaylist(playlist)}
                />
              </Animated.View>
            ))}
          </View>
        </PlaylistScrollView>
      </>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen 
        options={{
          headerTitle: "",
          headerBackTitle: "Home",
          headerBackTitleVisible: true,
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <StateHandler
          loading={state.isLoading}
          error={state.error}
          onRetry={loadPlaylists}
          loadingItemCount={6}
        >
          {renderContent()}
        </StateHandler>
      </SafeAreaView>
    </ThemedView>
  );
}

// Extracted sub-components for better organization
interface PageHeadingProps {
  title: string;
  textColor: string;
}

function PageHeading({ title, textColor }: PageHeadingProps) {
  return (
    <View style={styles.pageHeading}>
      <Animated.Text 
        entering={FadeInDown.delay(100).springify()}
        style={[styles.headingText, { color: textColor }]}
      >
        {title}
      </Animated.Text>
    </View>
  );
}

interface PlaylistCountProps {
  count: number;
  textColor: string;
}

function PlaylistCount({ count, textColor }: PlaylistCountProps) {
  return (
    <View style={styles.countContainer}>
      <Text style={[styles.countText, { color: `${textColor}80` }]}>
        {count} playlist{count !== 1 ? 's' : ''}
      </Text>
    </View>
  );
}

interface PlaylistScrollViewProps {
  children: React.ReactNode;
  refreshing: boolean;
  onRefresh: () => void;
  tintColor: string;
  contentStyle: any;
}

function PlaylistScrollView({ children, refreshing, onRefresh, tintColor, contentStyle }: PlaylistScrollViewProps) {
  return (
    <ScrollView
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={tintColor}
        />
      }
      contentContainerStyle={contentStyle}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  
  // Page Heading
  pageHeading: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headingText: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  
  // Standard Playlists Count
  countContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  countText: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // Scroll Views
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  scrollContentTheme: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  
  // Theme Grid (Single Column)
  themeGrid: {
    paddingHorizontal: 20,
    gap: 20,
  },
  
  // Standard Grid (Two Column)
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