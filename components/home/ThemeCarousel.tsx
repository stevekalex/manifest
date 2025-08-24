import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import type { Theme, ThemePlaylist } from '@/types/audio';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { 
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface ThemeCarouselProps {
  theme: Theme;
}

const { width: screenWidth } = Dimensions.get('window');
const ITEM_WIDTH = screenWidth * 0.75;
const ITEM_MARGIN = 12;

export function ThemeCarousel({ theme }: ThemeCarouselProps) {
  const glassMorphic = useThemeColor({}, 'glassMorphic');
  const glassMorphicBorder = useThemeColor({}, 'glassMorphicBorder');
  const shadowColor = useThemeColor({}, 'shadowColor');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  const handlePlaylistPress = (playlist: ThemePlaylist) => {
    console.log('🎯 ThemeCarousel: handlePlaylistPress called with playlist:', playlist);
    
    const navigationParams = {
      themeName: playlist.name,
      themeDescription: playlist.description || '',
      themeImageUrl: playlist.image_url || '',
      themeCreatedAt: playlist.created_at || '',
    };
    
    console.log('🚀 ThemeCarousel: Navigating to playlist with params:', navigationParams);
    console.log('🚀 ThemeCarousel: Full navigation path:', `/playlists/${playlist.id}`);
    
    // Pass theme playlist information to the playlist detail page
    // This allows the playlist page to display theme-specific info (name, description, image)
    // while still using the base playlist's audio content and affirmations
    router.push({
      pathname: `/playlists/${playlist.id}`,
      params: navigationParams
    });
  };

  const handleViewAllPress = () => {
    // Navigation disabled - no action taken
    return;
  };

  return (
    <View style={styles.container}>
      {/* Theme Header */}
      <Animated.View 
        entering={FadeInDown.delay(100).springify()}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <ThemedText type="subtitle" style={styles.title}>
              {theme.name}
            </ThemedText>
            {theme.description && (
              <ThemedText type="default" style={styles.description}>
                {theme.description}
              </ThemedText>
            )}
          </View>
          <TouchableOpacity
            style={[styles.viewAllButton, { backgroundColor: `${tintColor}08` }]}
            onPress={handleViewAllPress}
            activeOpacity={1}
            disabled={true}
          >
            <ThemedText style={[styles.viewAllText, { color: tintColor, opacity: 0.4 }]}>
              View all
            </ThemedText>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Playlist Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        decelerationRate="fast"
        snapToInterval={ITEM_WIDTH + ITEM_MARGIN}
        snapToAlignment="start"
      >
        {theme.playlists.map((playlist, index) => (
          <PlaylistThemeCard
            key={playlist.id}
            playlist={playlist}
            index={index}
            isLast={index === theme.playlists.length - 1}
            onPress={() => handlePlaylistPress(playlist)}
            glassMorphic={glassMorphic}
            glassMorphicBorder={glassMorphicBorder}
            shadowColor={shadowColor}
            textColor={textColor}
          />
        ))}
      </ScrollView>
    </View>
  );
}

interface PlaylistThemeCardProps {
  playlist: ThemePlaylist;
  index: number;
  isLast: boolean;
  onPress: () => void;
  glassMorphic: string;
  glassMorphicBorder: string;
  shadowColor: string;
  textColor: string;
}

function PlaylistThemeCard({
  playlist,
  index,
  isLast,
  onPress,
  glassMorphic,
  glassMorphicBorder,
  shadowColor,
  textColor,
}: PlaylistThemeCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(
      scale.value,
      [0.97, 1],
      [0.05, 0.15]
    );
    
    return {
      transform: [{ scale: scale.value }],
      shadowOpacity,
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(200 + index * 100).springify()}
      style={[
        styles.playlistItem,
        {
          marginLeft: index === 0 ? 20 : ITEM_MARGIN,
          marginRight: isLast ? 20 : 0,
        },
      ]}
    >
      <AnimatedTouchableOpacity
        style={[
          styles.playlistCard,
          {
            backgroundColor: glassMorphic,
            borderColor: glassMorphicBorder,
            shadowColor,
          },
          animatedStyle,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={styles.imageContainer}>
          <Image 
            source={
              playlist.image_url 
                ? { uri: playlist.image_url }
                : require('../../assets/images/react-logo.png')
            } 
            style={styles.playlistImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
            style={styles.gradient}
          />
          <View style={styles.playIconContainer}>
            <View style={styles.playIcon}>
              <Ionicons name="play" size={18} color="#fff" style={{ marginLeft: 2 }} />
            </View>
          </View>
        </View>
        
        <View style={styles.playlistInfo}>
          <ThemedText 
            type="defaultSemiBold" 
            style={styles.playlistName}
            numberOfLines={2}
          >
            {playlist.name}
          </ThemedText>
          {playlist.description && (
            <ThemedText 
              type="caption" 
              style={styles.playlistDescription}
              numberOfLines={2}
            >
              {playlist.description}
            </ThemedText>
          )}
        </View>
      </AnimatedTouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 36,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContainer: {
    paddingVertical: 8,
  },
  playlistItem: {
    width: ITEM_WIDTH,
  },
  playlistCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowRadius: 16,
    elevation: 8,
  },
  imageContainer: {
    width: '100%',
    height: ITEM_WIDTH * 0.55,
    position: 'relative',
  },
  playlistImage: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  playIconContainer: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  playIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(108, 92, 231, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  playlistInfo: {
    padding: 20,
  },
  playlistName: {
    fontSize: 17,
    marginBottom: 8,
    lineHeight: 22,
  },
  playlistDescription: {
    marginBottom: 12,
    lineHeight: 18,
    opacity: 0.8,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metadataText: {
    opacity: 0.6,
    fontSize: 12,
    fontWeight: '500',
  },
});