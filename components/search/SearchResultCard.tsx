import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  View,
  Image,
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
import { ThemedText } from '@/components/theme/Themed';
import { useThemeColor } from '@/hooks/useThemeColor';
import type { PlaylistSearchResult } from '@/types/audio';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface SearchResultCardProps extends Omit<TouchableOpacityProps, 'style'> {
  playlist: PlaylistSearchResult;
  showListensCount?: boolean;
}

export function SearchResultCard({
  playlist,
  showListensCount = true,
  onPressIn,
  onPressOut,
  ...props
}: SearchResultCardProps) {
  const scale = useSharedValue(1);
  
  const glassMorphic = useThemeColor({}, 'glassMorphic');
  const glassMorphicBorder = useThemeColor({}, 'glassMorphicBorder');
  const shadowColor = useThemeColor({}, 'shadowColor');
  const textColor = useThemeColor({}, 'text');

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

  const formatListensCount = (count?: number): string => {
    if (!count || typeof count !== 'number') return '';
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
        
      </View>
      
      <View style={styles.content}>
        <ThemedText type="defaultSemiBold" style={styles.title} numberOfLines={1}>
          {playlist.name || 'Untitled Playlist'}
        </ThemedText>
        
        {playlist.description && typeof playlist.description === 'string' && (
          <ThemedText type="caption" style={styles.description} numberOfLines={2}>
            {playlist.description}
          </ThemedText>
        )}
        
        <View style={styles.metadata}>
          {playlist.category && typeof playlist.category === 'string' && (
            <ThemedText type="caption" style={styles.metadataText}>
              {playlist.category}
            </ThemedText>
          )}
          {showListensCount && playlist.listensCount && playlist.listensCount > 0 && (
            <>
              {playlist.category && (
                <ThemedText type="caption" style={styles.metadataSeparator}>•</ThemedText>
              )}
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
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
    marginVertical: 6,
  },
  imageContainer: {
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  playIconContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
  },
  playIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(10px)',
  },
  likeButtonContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  likeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(10px)',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 16,
    marginBottom: 4,
  },
  description: {
    marginBottom: 8,
    opacity: 0.8,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metadataText: {
    opacity: 0.7,
    fontSize: 12,
  },
  metadataSeparator: {
    marginHorizontal: 6,
    opacity: 0.7,
    fontSize: 12,
  },
});