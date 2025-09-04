import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useThemeColor } from '@/hooks/useThemeColor';
import type { ThemePlaylist } from '@/types/audio';

interface ThemePlaylistCardProps {
  playlist: ThemePlaylist;
  index: number;
  onPress: (playlist: ThemePlaylist) => void;
}

export function ThemePlaylistCard({ playlist, index, onPress }: ThemePlaylistCardProps) {
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const glassMorphic = useThemeColor({}, 'glassMorphic');
  const glassMorphicBorder = useThemeColor({}, 'glassMorphicBorder');

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify()}
      style={styles.playlistCard}
    >
      <TouchableOpacity
        style={[styles.cardTouchable, { 
          backgroundColor: glassMorphic,
          borderColor: glassMorphicBorder,
        }]}
        onPress={() => onPress(playlist)}
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
            {playlist.name}
          </Text>
          {playlist.description && (
            <Text style={[styles.playlistDescription, { color: `${textColor}70` }]} numberOfLines={2}>
              {playlist.description}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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