import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  View,
  Image,
  Dimensions,
  TouchableOpacityProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { usePlaylistLikeStatus } from '@/hooks/usePlaylistLikeStatus';
import type { Playlist } from '@/types/audio';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const { width: screenWidth } = Dimensions.get('window');

interface PlaylistCardProps extends Omit<TouchableOpacityProps, 'style'> {
  playlist: Playlist;
}

export function PlaylistCard({
  playlist,
  onPressIn,
  onPressOut,
  ...props
}: PlaylistCardProps) {
  const scale = useSharedValue(1);
  
  const glassMorphic = useThemeColor({}, 'glassMorphic');
  const glassMorphicBorder = useThemeColor({}, 'glassMorphicBorder');
  const shadowColor = useThemeColor({}, 'shadowColor');
  const textColor = useThemeColor({}, 'text');

  const { isLiked, toggleLike } = usePlaylistLikeStatus(playlist.id);

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

  const handlePressIn = (event: any) => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
    onPressIn?.(event);
  };

  const handlePressOut = (event: any) => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    onPressOut?.(event);
  };

  const formatListensCount = (count?: number) => {
    if (!count) return '';
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M listens`;
    } else if (count >= 1000) {
      return `${Math.floor(count / 1000)}k listens`;
    }
    return `${count} listens`;
  };

  return (
    <AnimatedTouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: glassMorphic,
          borderColor: glassMorphicBorder,
          shadowColor,
        },
        animatedStyle,
      ]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      {...props}
    >
      <View style={styles.imageContainer}>
        {playlist.coverImage ? (
          <Image source={playlist.coverImage} style={styles.coverImage} />
        ) : (
          <View style={[styles.placeholderImage, { backgroundColor: glassMorphic }]}>
            <Ionicons name="musical-notes" size={40} color={textColor} opacity={0.3} />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)']}
          style={styles.gradient}
        />
        <View style={styles.playIconContainer}>
          <View style={styles.playIcon}>
            <Ionicons name="play" size={20} color="#fff" style={{ marginLeft: 2 }} />
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.likeButtonContainer}
          onPress={toggleLike}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <View style={styles.likeButton}>
            <Ionicons 
              name={isLiked ? "heart" : "heart-outline"} 
              size={20} 
              color={isLiked ? "#FF6B6B" : "#fff"} 
            />
          </View>
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <ThemedText type="defaultSemiBold" style={styles.title} numberOfLines={1}>
          {playlist.name}
        </ThemedText>
        
        {playlist.description && (
          <ThemedText type="caption" style={styles.description} numberOfLines={2}>
            {playlist.description}
          </ThemedText>
        )}
        
        <View style={styles.metadata}>
          <ThemedText type="caption" style={styles.metadataText}>
            {playlist.affirmations.length} affirmations
          </ThemedText>
          {playlist.listensCount && (
            <>
              <ThemedText type="caption" style={styles.metadataSeparator}>•</ThemedText>
              <ThemedText type="caption" style={styles.metadataText}>
                {formatListensCount(playlist.listensCount)}
              </ThemedText>
            </>
          )}
        </View>
      </View>
    </AnimatedTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 10,
    marginVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowRadius: 12,
    elevation: 5,
    width: screenWidth * 0.7, // Make cards 70% of screen width for horizontal scroll
  },
  imageContainer: {
    width: '100%',
    height: 160,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(108, 92, 231, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  likeButtonContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  likeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    marginBottom: 6,
  },
  description: {
    marginBottom: 8,
    lineHeight: 18,
    opacity: 0.8,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metadataText: {
    opacity: 0.6,
  },
  metadataSeparator: {
    marginHorizontal: 6,
    opacity: 0.4,
  },
});