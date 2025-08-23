import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { GlassButton } from '@/components/common/GlassButton';
import { ActionIcon } from '@/components/common/ActionIcon';
import { useThemeColor } from '@/hooks/useThemeColor';
import type { Playlist } from '@/types/audio';

interface RouteParams {
  id: string;
  themeName?: string;
  themeDescription?: string;
  themeImageUrl?: string;
  themeCreatedAt?: string;
}

export default function PlaylistDetailScreen() {
  console.log('🎬 PlaylistDetailScreen: Component mounted');
  
  const params = useLocalSearchParams<RouteParams>();
  const { id, themeName, themeDescription, themeImageUrl } = params;
  
  console.log('📋 PlaylistDetailScreen: Raw params received:', params);
  console.log('📋 PlaylistDetailScreen: Destructured params:', { id, themeName, themeDescription, themeImageUrl });
  console.log('📋 PlaylistDetailScreen: Full URL search params object keys:', Object.keys(params));
  console.log('📋 PlaylistDetailScreen: ID type and value:', typeof id, id);
  
  const [playlist, setPlaylist] = useState<Playlist | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  
  const glassMorphic = useThemeColor({}, 'glassMorphic');
  const glassMorphicBorder = useThemeColor({}, 'glassMorphicBorder');
  const tintColor = useThemeColor({}, 'tint');

  useEffect(() => {
    const loadPlaylist = async () => {
      try {
        console.log('⚙️ PlaylistDetailScreen: loadPlaylist started');
        console.log('⚙️ PlaylistDetailScreen: Current params in useEffect:', { id, themeName, themeDescription, themeImageUrl });
        
        // Check parameter types
        console.log('⚙️ PlaylistDetailScreen: Parameter types:', {
          idType: typeof id,
          themeNameType: typeof themeName,
          themeDescriptionType: typeof themeDescription,
          themeImageUrlType: typeof themeImageUrl
        });
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Create playlist using the UUID from URL - CDN will handle the actual content
        if (id) {
          console.log('✅ PlaylistDetailScreen: Creating playlist with UUID:', id);
          const apiPlaylist: Playlist = {
            id: id,
            name: themeName || 'Meditation Playlist', // Use theme name or fallback
            description: themeDescription || 'A beautiful meditation experience awaits you', // Use theme description or fallback
            backgroundTrackUrl: '', // CDN will handle
            defaultVoiceId: 'serenity', // Default voice
            affirmations: [], // CDN will handle
            voices: [], // CDN will handle
            cdnUrls: {}, // CDN will handle
            coverImage: themeImageUrl ? { uri: themeImageUrl } : undefined,
          };
          console.log('✅ PlaylistDetailScreen: Created playlist from UUID:', apiPlaylist);
          setPlaylist(apiPlaylist);
        } else {
          console.error('❌ PlaylistDetailScreen: No playlist ID provided in URL');
          setPlaylist(undefined);
        }
      } catch (error) {
        console.error('💥 PlaylistDetailScreen: Error loading playlist:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPlaylist();
  }, [id, themeName, themeDescription, themeImageUrl]);

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centerContainer}>
          <ActivityIndicator size="large" color={tintColor} />
          <ThemedText type="defaultSemiBold" style={styles.loadingText}>
            Loading playlist...
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!playlist) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContainer}>
            <Ionicons name="musical-notes-outline" size={64} color={tintColor} style={{ opacity: 0.3 }} />
            <ThemedText type="title" style={[styles.notFoundTitle, { marginTop: 24 }]}>
              Playlist Not Found
            </ThemedText>
            <ThemedText style={[styles.notFoundDescription, { marginTop: 12, marginBottom: 32 }]}>
              The playlist you&apos;re looking for doesn&apos;t exist or may have been removed.
            </ThemedText>
            <TouchableOpacity
              style={[styles.backToHomeButton, { backgroundColor: tintColor }]}
              onPress={() => router.push('/(tabs)/')}
            >
              <ThemedText style={styles.backToHomeText}>
                Back to Home
              </ThemedText>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const handlePlayPress = () => {
    // Navigate to player with playlist ID - CDN will handle the rest
    router.push({
      pathname: '/player',
      params: {
        playlistId: playlist.id,
        voiceId: playlist.defaultVoiceId,
      },
    });
  };


  const handleLikePress = () => {
    setIsLiked(!isLiked);
  };

  const handleDownloadPress = () => {
    Alert.alert('Download', 'Download functionality coming soon!');
  };

  const handleSharePress = () => {
    Alert.alert('Share', 'Share functionality coming soon!');
  };

  const handleMorePress = () => {
    Alert.alert('More Options', 'More actions coming soon!');
  };


  const formatListensCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M listens`;
    } else if (count >= 1000) {
      return `${Math.floor(count / 1000)}k listens`;
    }
    return `${count} listens`;
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header with Cover Image */}
        <Animated.View 
          style={styles.headerContainer}
          entering={FadeIn.duration(400)}
        >
          {playlist.coverImage && (
            <Image source={playlist.coverImage} style={styles.coverImage} />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
            locations={[0, 0.5, 0.8, 1]}
            style={styles.gradient}
          />
          
          <SafeAreaView style={styles.headerContent}>
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: glassMorphic, borderColor: glassMorphicBorder }]}
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.headerText}>
              {playlist.listensCount && (
                <ThemedText type="caption" style={styles.listensCount}>
                  {formatListensCount(playlist.listensCount)}
                </ThemedText>
              )}
              <ThemedText type="title" style={styles.playlistTitle}>
                {playlist.name}
              </ThemedText>
              <ThemedText style={styles.playlistDescription}>
                {playlist.description}
              </ThemedText>
            </View>
          </SafeAreaView>
        </Animated.View>

        {/* Content */}
        <Animated.View 
          style={styles.content}
          entering={FadeInDown.duration(600).springify()}
        >
          {/* Play Button */}
          <View style={styles.playButtonContainer}>
            <GlassButton
              label="Play"
              iconName="play"
              glow={true}
              onPress={handlePlayPress}
              style={styles.playButton}
            />
          </View>

          {/* Action Row */}
          <View style={styles.actionRow}>
            <ActionIcon
              iconName={isLiked ? "heart" : "heart-outline"}
              label="Like"
              onPress={handleLikePress}
            />
            <ActionIcon
              iconName="download-outline"
              label="Download"
              onPress={handleDownloadPress}
            />
            <ActionIcon
              iconName="share-outline"
              label="Share"
              onPress={handleSharePress}
            />
            <ActionIcon
              iconName="ellipsis-horizontal"
              label="More"
              onPress={handleMorePress}
            />
          </View>


          {/* Affirmations info - CDN will handle the actual tracks */}
          <View style={styles.affirmationsContainer}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Ready to manifest your desires
            </ThemedText>
            <ThemedText style={styles.affirmationDescription}>
              This playlist contains powerful affirmations that will be loaded when you press play.
            </ThemedText>
          </View>
        </Animated.View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    height: 400,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  headerContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 20,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  headerText: {
    alignItems: 'center',
    marginBottom: 20,
  },
  listensCount: {
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  playlistTitle: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  playlistDescription: {
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  content: {
    padding: 20,
    paddingTop: 32,
  },
  playButtonContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  playButton: {
    paddingHorizontal: 48,
    paddingVertical: 18,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    marginBottom: 16,
    fontSize: 18,
  },
  affirmationsContainer: {
    marginBottom: 40,
  },
  affirmationDescription: {
    opacity: 0.7,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  safeArea: {
    flex: 1,
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    opacity: 0.7,
  },
  notFoundTitle: {
    textAlign: 'center',
    opacity: 0.8,
  },
  notFoundDescription: {
    textAlign: 'center',
    opacity: 0.6,
    lineHeight: 22,
    paddingHorizontal: 32,
  },
  backToHomeButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
  },
  backToHomeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});