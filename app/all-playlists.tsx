import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedView } from '@/components/theme/Themed';
import { StateHandler } from '@/components/common/StateHandler';
import { PlaylistCard } from '@/components/common/PlaylistCard';
import { useThemeColor } from '@/hooks/useThemeColor';
import { getAllPlaylists } from '@/data/playlists';
import type { Playlist, ThemePlaylist } from '@/types/audio';

export default function AllPlaylistsScreen() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [themePlaylists, setThemePlaylists] = useState<ThemePlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [displayTitle, setDisplayTitle] = useState('All Playlists');
  const [isThemeView, setIsThemeView] = useState(false);

  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const glassMorphic = useThemeColor({}, 'glassMorphic');
  const glassMorphicBorder = useThemeColor({}, 'glassMorphicBorder');
  
  // Get theme parameters from navigation
  const params = useLocalSearchParams();
  const themeName = params.themeName as string;
  const themePlaylistsParam = params.themePlaylists as string;
  

  const loadPlaylists = useCallback(async () => {
    try {
      setError(null);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (themePlaylistsParam && themeName) {
        // Parse theme playlists from navigation - use them directly
        const themePlaylists: ThemePlaylist[] = JSON.parse(themePlaylistsParam);
        console.log('✅ Using theme playlists directly:', themePlaylists.length, 'playlists');
        
        // Store as theme playlists (no need to convert to full playlists)
        setThemePlaylists(themePlaylists);
        setDisplayTitle(themeName);
        setIsThemeView(true);
      } else {
        // Fallback: Show all playlists (default behavior when no theme data)
        const data = getAllPlaylists();
        setPlaylists(data);
        setDisplayTitle('All Playlists');
      }
    } catch (err) {
      console.error('Error loading playlists:', err);
      setError('Failed to load playlists. Please try again.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [themePlaylistsParam, themeName]);

  useEffect(() => {
    loadPlaylists();
  }, [loadPlaylists]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadPlaylists();
  };

  const handlePlaylistPress = (playlist: ThemePlaylist | Playlist) => {
    console.log('🐛 [DEBUG] Playlist pressed:', playlist);
    console.log('🐛 [DEBUG] Playlist ID:', playlist.id);
    console.log('🐛 [DEBUG] Playlist name:', playlist.name);
    
    // For theme playlists, pass the data directly to avoid API lookup issues
    if ('created_at' in playlist) { // This indicates it's a ThemePlaylist
      router.push({
        pathname: `/playlists/${playlist.id}`,
        params: {
          themeName: playlist.name,
          themeDescription: playlist.description || '',
          themeImageUrl: playlist.image_url || '',
          themeCreatedAt: playlist.created_at || '',
        }
      });
    } else {
      // Regular playlist navigation
      router.push(`/playlists/${playlist.id}`);
    }
  };


  const renderThemePlaylist = ({ item, index }: { item: ThemePlaylist; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify()}
      style={styles.playlistCard}
    >
      <TouchableOpacity
        style={[styles.cardTouchable, { 
          backgroundColor: glassMorphic,
          borderColor: glassMorphicBorder,
        }]}
        onPress={() => handlePlaylistPress(item)}
        activeOpacity={0.8}
      >
        {/* Playlist Image */}
        <View style={styles.imageContainer}>
          <View style={[styles.placeholderImage, { backgroundColor: `${tintColor}20` }]}>
            <Ionicons name="musical-notes-outline" size={32} color={tintColor} />
          </View>
          <View style={[styles.playButton, { backgroundColor: tintColor }]}>
            <Ionicons name="play" size={18} color="white" />
          </View>
        </View>

        {/* Playlist Info */}
        <View style={styles.playlistInfo}>
          <Text style={[styles.playlistTitle, { color: textColor }]} numberOfLines={2}>
            {item.name}
          </Text>
          {item.description && (
            <Text style={[styles.playlistDescription, { color: `${textColor}70` }]} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

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
          loading={isLoading}
          error={error}
          onRetry={loadPlaylists}
          loadingItemCount={6}
        >
          {isThemeView ? (
            <>
              {/* Page Heading */}
              <View style={styles.pageHeading}>
                <Animated.Text 
                  entering={FadeInDown.delay(100).springify()}
                  style={[styles.headingText, { color: textColor }]}
                >
                  {displayTitle}
                </Animated.Text>
              </View>

              {/* Theme Playlists Grid */}
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
                contentContainerStyle={styles.scrollContentTheme}
              >
                <View style={styles.themeGrid}>
                  {themePlaylists.map((playlist, index) => (
                    <React.Fragment key={playlist.id}>
                      {renderThemePlaylist({ item: playlist, index })}
                    </React.Fragment>
                  ))}
                </View>
              </ScrollView>
            </>
          ) : (
            <>
              {/* Standard Playlists Count */}
              <View style={styles.countContainer}>
                <Text style={[styles.countText, { color: `${textColor}80` }]}>
                  {playlists.length} playlist{playlists.length !== 1 ? 's' : ''}
                </Text>
              </View>

              {/* Standard Playlists Grid */}
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
                        onPress={() => handlePlaylistPress(playlist)}
                      />
                    </Animated.View>
                  ))}
                </View>
              </ScrollView>
            </>
          )}
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
  
  // Theme Playlist Cards
  playlistCard: {
    marginBottom: 16,
  },
  cardTouchable: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  imageContainer: {
    height: 180,
    position: 'relative',
    overflow: 'hidden',
  },
  placeholderImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },
  playButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  playlistInfo: {
    padding: 20,
  },
  playlistTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 8,
  },
  playlistDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
});