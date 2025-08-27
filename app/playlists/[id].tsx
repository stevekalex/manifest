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

import { ThemedText, ThemedView } from '@/components/theme/Themed';
import { GlassButton } from '@/components/common/GlassButton';
import { ActionIcon } from '@/components/common/ActionIcon';
import { useThemeColor } from '@/hooks/useThemeColor';
import type { Playlist } from '@/types/audio';
import { usePlaylistLikeStatus } from '@/hooks/usePlaylistLikeStatus';
import { apiClient } from '@/utils/api';

interface RouteParams {
  id: string;
  themeName?: string;
  themeDescription?: string;
  themeImageUrl?: string;
  themeCreatedAt?: string;
}

interface Manifestation {
  position: number;
  manifestations: {
    id: string;
    asset_url: string;
    content: string;
    created_at: string;
  };
}

export default function PlaylistDetailScreen() {
  
  const params = useLocalSearchParams();
  const { id, themeName, themeDescription, themeImageUrl } = (params as unknown) as RouteParams;
  
  // All hooks must be called before any early returns
  const [playlist, setPlaylist] = useState<Playlist | undefined>(undefined);
  const [manifestations, setManifestations] = useState<Manifestation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  
  const glassMorphic = useThemeColor({}, 'glassMorphic');
  const glassMorphicBorder = useThemeColor({}, 'glassMorphicBorder');
  const tintColor = useThemeColor({}, 'tint');

  const { isLiked: isLikedFromHook, toggleLike } = usePlaylistLikeStatus(String(id || ''));
  
  useEffect(() => {
    setIsLiked(!!isLikedFromHook);
  }, [isLikedFromHook]);

  useEffect(() => {
    const loadPlaylistData = async () => {
      try {
        console.log('⚙️ PlaylistDetailScreen: loadPlaylistData started');
        console.log('⚙️ PlaylistDetailScreen: Current params in useEffect:', { id, themeName, themeDescription, themeImageUrl });
        
        if (!id) {
          console.error('❌ PlaylistDetailScreen: No playlist ID provided in URL');
          setPlaylist(undefined);
          setIsLoading(false);
          return;
        }

        // Fetch manifestations from API using centralized API client
        console.log('🌐 Fetching manifestations for playlist:', id);
        const response = await apiClient.get<{ manifestations: Manifestation[] }>(`/playlists/${id}/manifestations`);
        
        if (response.error) {
          throw new Error(`API Error: ${response.error}`);
        }

        const data = response.data;
        console.log('✅ Manifestations API response:', data);
        console.log('🎵 Sample manifestation asset_url:', data?.manifestations?.[0]?.manifestations?.asset_url);
        
        // Set manifestations
        const manifestationsList = data?.manifestations || [];
        setManifestations(manifestationsList);
        
        // Transform manifestations into playlist format for audio system
        // CRITICAL: Use asset_url as the ID so audio system can directly lookup assets
        const affirmations = manifestationsList.map((m: Manifestation) => ({
          id: m.manifestations.asset_url, // Use asset_url as the ID for direct asset lookup
          text: m.manifestations.content,
          order: m.position,
          durationMs: 0 // Will be measured on first play
        }));
        
        console.log('🔍 DEBUG: Raw manifestations from API:');
        manifestationsList.forEach((m: Manifestation, index: number) => {
          console.log(`  [${index}] ID: ${m.manifestations.id}, Position: ${m.position}, Asset: ${m.manifestations.asset_url}`);
        });
        
        console.log('🔍 DEBUG: Transformed affirmations:');
        affirmations.forEach((a: { id: string; text?: string; order: number }, index: number) => {
          const preview = (a.text || '').substring(0, 50);
          console.log(`  [${index}] ID: ${a.id}, Order: ${a.order}, Text: ${preview}...`);
        });
        
        // SIMPLE FIX: Map asset_url directly to local asset require() statements
        // Now that affirmation.id = asset_url, URLResolver will lookup by asset_url directly
        const cdnUrls = {
          charlotte: manifestationsList.reduce((acc: Record<string, any>, m: Manifestation) => {
            const assetUrl = m.manifestations.asset_url;
            console.log(`🎵 Processing asset_url: ${assetUrl}`);
            
            // Extract the filename from asset_url (remove any path prefixes)
            const filename = assetUrl.split('/').pop() || assetUrl;
            
            // Create a comprehensive static mapping for all known assets by filename
            const assetMap: Record<string, any> = {
              // All available assets mapped by filename - covers all playlists
              '0ae09709-9532-4aa9-880e-039a5811728f-0-charlotte.mp3': require('../../assets/voices/charlotte/0ae09709-9532-4aa9-880e-039a5811728f-0-charlotte.mp3'),
              '0ae09709-9532-4aa9-880e-039a5811728f-1-charlotte.mp3': require('../../assets/voices/charlotte/0ae09709-9532-4aa9-880e-039a5811728f-1-charlotte.mp3'),
              '0ae09709-9532-4aa9-880e-039a5811728f-2-charlotte.mp3': require('../../assets/voices/charlotte/0ae09709-9532-4aa9-880e-039a5811728f-2-charlotte.mp3'),
              '0ae09709-9532-4aa9-880e-039a5811728f-3-charlotte.mp3': require('../../assets/voices/charlotte/0ae09709-9532-4aa9-880e-039a5811728f-3-charlotte.mp3'),
              '0ae09709-9532-4aa9-880e-039a5811728f-4-charlotte.mp3': require('../../assets/voices/charlotte/0ae09709-9532-4aa9-880e-039a5811728f-4-charlotte.mp3'),
              '0ae09709-9532-4aa9-880e-039a5811728f-5-charlotte.mp3': require('../../assets/voices/charlotte/0ae09709-9532-4aa9-880e-039a5811728f-5-charlotte.mp3'),
              '0ae09709-9532-4aa9-880e-039a5811728f-6-charlotte.mp3': require('../../assets/voices/charlotte/0ae09709-9532-4aa9-880e-039a5811728f-6-charlotte.mp3'),
              '0ae09709-9532-4aa9-880e-039a5811728f-7-charlotte.mp3': require('../../assets/voices/charlotte/0ae09709-9532-4aa9-880e-039a5811728f-7-charlotte.mp3'),
              '0ae09709-9532-4aa9-880e-039a5811728f-8-charlotte.mp3': require('../../assets/voices/charlotte/0ae09709-9532-4aa9-880e-039a5811728f-8-charlotte.mp3'),
              '0ae09709-9532-4aa9-880e-039a5811728f-9-charlotte.mp3': require('../../assets/voices/charlotte/0ae09709-9532-4aa9-880e-039a5811728f-9-charlotte.mp3'),
              '0ae09709-9532-4aa9-880e-039a5811728f-10-charlotte.mp3': require('../../assets/voices/charlotte/0ae09709-9532-4aa9-880e-039a5811728f-10-charlotte.mp3'),
              '0ae09709-9532-4aa9-880e-039a5811728f-11-charlotte.mp3': require('../../assets/voices/charlotte/0ae09709-9532-4aa9-880e-039a5811728f-11-charlotte.mp3'),
              '0ae09709-9532-4aa9-880e-039a5811728f-12-charlotte.mp3': require('../../assets/voices/charlotte/0ae09709-9532-4aa9-880e-039a5811728f-12-charlotte.mp3'),
              '0ae09709-9532-4aa9-880e-039a5811728f-13-charlotte.mp3': require('../../assets/voices/charlotte/0ae09709-9532-4aa9-880e-039a5811728f-13-charlotte.mp3'),
              '0ae09709-9532-4aa9-880e-039a5811728f-14-charlotte.mp3': require('../../assets/voices/charlotte/0ae09709-9532-4aa9-880e-039a5811728f-14-charlotte.mp3'),
              
              '33a2f325-0556-4a50-9abd-1710abaa29e0-0-charlotte.mp3': require('../../assets/voices/charlotte/33a2f325-0556-4a50-9abd-1710abaa29e0-0-charlotte.mp3'),
              '33a2f325-0556-4a50-9abd-1710abaa29e0-1-charlotte.mp3': require('../../assets/voices/charlotte/33a2f325-0556-4a50-9abd-1710abaa29e0-1-charlotte.mp3'),
              '33a2f325-0556-4a50-9abd-1710abaa29e0-2-charlotte.mp3': require('../../assets/voices/charlotte/33a2f325-0556-4a50-9abd-1710abaa29e0-2-charlotte.mp3'),
              '33a2f325-0556-4a50-9abd-1710abaa29e0-3-charlotte.mp3': require('../../assets/voices/charlotte/33a2f325-0556-4a50-9abd-1710abaa29e0-3-charlotte.mp3'),
              '33a2f325-0556-4a50-9abd-1710abaa29e0-4-charlotte.mp3': require('../../assets/voices/charlotte/33a2f325-0556-4a50-9abd-1710abaa29e0-4-charlotte.mp3'),
              '33a2f325-0556-4a50-9abd-1710abaa29e0-5-charlotte.mp3': require('../../assets/voices/charlotte/33a2f325-0556-4a50-9abd-1710abaa29e0-5-charlotte.mp3'),
              '33a2f325-0556-4a50-9abd-1710abaa29e0-6-charlotte.mp3': require('../../assets/voices/charlotte/33a2f325-0556-4a50-9abd-1710abaa29e0-6-charlotte.mp3'),
              '33a2f325-0556-4a50-9abd-1710abaa29e0-7-charlotte.mp3': require('../../assets/voices/charlotte/33a2f325-0556-4a50-9abd-1710abaa29e0-7-charlotte.mp3'),
              '33a2f325-0556-4a50-9abd-1710abaa29e0-8-charlotte.mp3': require('../../assets/voices/charlotte/33a2f325-0556-4a50-9abd-1710abaa29e0-8-charlotte.mp3'),
              '33a2f325-0556-4a50-9abd-1710abaa29e0-9-charlotte.mp3': require('../../assets/voices/charlotte/33a2f325-0556-4a50-9abd-1710abaa29e0-9-charlotte.mp3'),
              '33a2f325-0556-4a50-9abd-1710abaa29e0-10-charlotte.mp3': require('../../assets/voices/charlotte/33a2f325-0556-4a50-9abd-1710abaa29e0-10-charlotte.mp3'),
              '33a2f325-0556-4a50-9abd-1710abaa29e0-11-charlotte.mp3': require('../../assets/voices/charlotte/33a2f325-0556-4a50-9abd-1710abaa29e0-11-charlotte.mp3'),
              '33a2f325-0556-4a50-9abd-1710abaa29e0-12-charlotte.mp3': require('../../assets/voices/charlotte/33a2f325-0556-4a50-9abd-1710abaa29e0-12-charlotte.mp3'),
              '33a2f325-0556-4a50-9abd-1710abaa29e0-13-charlotte.mp3': require('../../assets/voices/charlotte/33a2f325-0556-4a50-9abd-1710abaa29e0-13-charlotte.mp3'),
              '33a2f325-0556-4a50-9abd-1710abaa29e0-14-charlotte.mp3': require('../../assets/voices/charlotte/33a2f325-0556-4a50-9abd-1710abaa29e0-14-charlotte.mp3'),
              
              '33d90fcb-0613-49b2-9935-23f20017f55d-0-charlotte.mp3': require('../../assets/voices/charlotte/33d90fcb-0613-49b2-9935-23f20017f55d-0-charlotte.mp3'),
              '33d90fcb-0613-49b2-9935-23f20017f55d-1-charlotte.mp3': require('../../assets/voices/charlotte/33d90fcb-0613-49b2-9935-23f20017f55d-1-charlotte.mp3'),
              '33d90fcb-0613-49b2-9935-23f20017f55d-2-charlotte.mp3': require('../../assets/voices/charlotte/33d90fcb-0613-49b2-9935-23f20017f55d-2-charlotte.mp3'),
              '33d90fcb-0613-49b2-9935-23f20017f55d-3-charlotte.mp3': require('../../assets/voices/charlotte/33d90fcb-0613-49b2-9935-23f20017f55d-3-charlotte.mp3'),
              '33d90fcb-0613-49b2-9935-23f20017f55d-4-charlotte.mp3': require('../../assets/voices/charlotte/33d90fcb-0613-49b2-9935-23f20017f55d-4-charlotte.mp3'),
              '33d90fcb-0613-49b2-9935-23f20017f55d-5-charlotte.mp3': require('../../assets/voices/charlotte/33d90fcb-0613-49b2-9935-23f20017f55d-5-charlotte.mp3'),
              '33d90fcb-0613-49b2-9935-23f20017f55d-6-charlotte.mp3': require('../../assets/voices/charlotte/33d90fcb-0613-49b2-9935-23f20017f55d-6-charlotte.mp3'),
              '33d90fcb-0613-49b2-9935-23f20017f55d-7-charlotte.mp3': require('../../assets/voices/charlotte/33d90fcb-0613-49b2-9935-23f20017f55d-7-charlotte.mp3'),
              '33d90fcb-0613-49b2-9935-23f20017f55d-8-charlotte.mp3': require('../../assets/voices/charlotte/33d90fcb-0613-49b2-9935-23f20017f55d-8-charlotte.mp3'),
              '33d90fcb-0613-49b2-9935-23f20017f55d-9-charlotte.mp3': require('../../assets/voices/charlotte/33d90fcb-0613-49b2-9935-23f20017f55d-9-charlotte.mp3'),
              '33d90fcb-0613-49b2-9935-23f20017f55d-10-charlotte.mp3': require('../../assets/voices/charlotte/33d90fcb-0613-49b2-9935-23f20017f55d-10-charlotte.mp3'),
              '33d90fcb-0613-49b2-9935-23f20017f55d-11-charlotte.mp3': require('../../assets/voices/charlotte/33d90fcb-0613-49b2-9935-23f20017f55d-11-charlotte.mp3'),
              '33d90fcb-0613-49b2-9935-23f20017f55d-12-charlotte.mp3': require('../../assets/voices/charlotte/33d90fcb-0613-49b2-9935-23f20017f55d-12-charlotte.mp3'),
              '33d90fcb-0613-49b2-9935-23f20017f55d-13-charlotte.mp3': require('../../assets/voices/charlotte/33d90fcb-0613-49b2-9935-23f20017f55d-13-charlotte.mp3'),
              '33d90fcb-0613-49b2-9935-23f20017f55d-14-charlotte.mp3': require('../../assets/voices/charlotte/33d90fcb-0613-49b2-9935-23f20017f55d-14-charlotte.mp3'),
            };
            
            const localAsset = assetMap[filename];
            
            if (localAsset) {
              console.log(`✅ Mapped asset_url=${assetUrl} to local asset`);
              console.log(`    Asset value type: ${typeof localAsset}, value: ${localAsset}`);
              // SIMPLE: Map asset_url directly to the local asset  
              return {
                ...acc,
                [assetUrl]: localAsset
              };
            } else {
              console.warn(`⚠️ No local asset found for ${filename} from asset_url=${assetUrl}`);
              console.log(`    Available filenames in assetMap:`, Object.keys(assetMap).slice(0, 5));
              
              // FALLBACK: Use TTS placeholder for playlists without local audio
              // The URLResolver will handle TTS generation
              return {
                ...acc,
                [assetUrl]: `tts://${assetUrl}`
              };
            }
          }, {} as Record<string, any>)
        };
        
        // Create playlist with dynamic manifestations
        const apiPlaylist: Playlist = {
          id: id,
          name: themeName || 'Meditation Playlist',
          description: themeDescription || 'A beautiful meditation experience awaits you',
          backgroundTrackUrl: 'bundled://ethereal', // Special scheme to indicate bundled asset
          defaultVoiceId: 'charlotte',
          affirmations: affirmations,
          voices: [{ 
            id: 'charlotte', 
            name: 'Charlotte', 
            sampleUrl: require('../../assets/voices/charlotte/33a2f325-0556-4a50-9abd-1710abaa29e0-0-charlotte.mp3') 
          }],
          cdnUrls: cdnUrls,
          coverImage: themeImageUrl ? { uri: themeImageUrl } : undefined,
        };
        
        console.log('🎵 Background track URL set to:', apiPlaylist.backgroundTrackUrl);
        
        console.log('✅ Created playlist metadata:', {
          ...apiPlaylist,
          // Log just the structure to avoid flooding
          affirmations: `${apiPlaylist.affirmations.length} affirmations`,
          cdnUrls: Object.keys(apiPlaylist.cdnUrls).map(voice => `${voice}: ${Object.keys(apiPlaylist.cdnUrls[voice]).length} urls`)
        });
        
        console.log('🔍 DEBUG: Final playlist cdnUrls structure:');
        Object.keys(apiPlaylist.cdnUrls).forEach(voiceId => {
          console.log(`  Voice ${voiceId}:`);
          Object.keys(apiPlaylist.cdnUrls[voiceId]).forEach(affirmationId => {
            const url = apiPlaylist.cdnUrls[voiceId][affirmationId];
            console.log(`    ${affirmationId} -> ${typeof url} (${typeof url === 'number' ? url : url?.toString?.()?.substring(0, 50)})`);
          });
        });
        
        setPlaylist(apiPlaylist);
        
      } catch (error) {
        console.error('💥 PlaylistDetailScreen: Error loading playlist data:', error);
        setPlaylist(undefined);
        setManifestations([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadPlaylistData();
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
              onPress={() => router.push('/')}
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
    // Navigate to player with complete playlist data
    router.push({
      pathname: '/player',
      params: {
        playlistData: JSON.stringify(playlist),
        voiceId: playlist?.defaultVoiceId || 'charlotte',
      },
    });
  };


  const handleLikePress = () => {
    toggleLike();
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


          {/* Manifestations List */}
          {manifestations.length > 0 && (
            <View style={styles.manifestationsContainer}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                Affirmations ({manifestations.length})
              </ThemedText>
              {manifestations.map((item) => (
                <View key={item.manifestations.id} style={styles.manifestationItem}>
                  <View style={styles.manifestationNumber}>
                    <ThemedText style={styles.numberText}>
                      {item.position + 1}
                    </ThemedText>
                  </View>
                  <View style={styles.manifestationContent}>
                    <ThemedText style={styles.affirmationText}>
                      {item.manifestations.content}
                    </ThemedText>
                  </View>
                  <TouchableOpacity style={styles.playItemButton}>
                    <Ionicons name="play" size={16} color={tintColor} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Fallback info when no manifestations */}
          {manifestations.length === 0 && !isLoading && (
            <View style={styles.affirmationsContainer}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                Ready to manifest your desires
              </ThemedText>
              <ThemedText style={styles.affirmationDescription}>
                This playlist contains powerful affirmations that will be loaded when you press play.
              </ThemedText>
            </View>
          )}
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
  manifestationsContainer: {
    marginBottom: 40,
  },
  manifestationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  manifestationNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  numberText: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
  },
  manifestationContent: {
    flex: 1,
    paddingRight: 12,
  },
  affirmationText: {
    fontSize: 16,
    lineHeight: 22,
  },
  playItemButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
});