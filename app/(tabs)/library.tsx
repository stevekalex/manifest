import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface LikedPlaylist {
  id: string;
  title: string;
  image: any;
  listens?: number;
}

const likedPlaylists: LikedPlaylist[] = [
  {
    id: 'production-affirmations',
    title: 'Daily Affirmations',
    image: { uri: 'https://picsum.photos/200/200?random=1' },
    listens: 201000,
  },
  {
    id: 'inner-peace',
    title: 'Inner Peace & Calm',
    image: { uri: 'https://picsum.photos/200/200?random=2' },
    listens: 187000,
  },
  {
    id: 'abundance-mindset',
    title: 'Abundance Mindset',
    image: { uri: 'https://picsum.photos/200/200?random=3' },
    listens: 142000,
  },
  {
    id: 'believe-in-yourself',
    title: 'Believe In Yourself',
    image: { uri: 'https://picsum.photos/200/200?random=4' },
    listens: 85000,
  },
  {
    id: 'money-magnetism',
    title: 'Money Magnetism',
    image: { uri: 'https://picsum.photos/200/200?random=5' },
    listens: 98000,
  },
];

export default function LibraryScreen() {
  const iconColor = useThemeColor({}, 'icon');
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            My library
          </ThemedText>
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.playlistsSection}>
            {likedPlaylists.map((playlist, index) => (
              <TouchableOpacity 
                key={playlist.id} 
                style={[
                  styles.playlistCard,
                  index === likedPlaylists.length - 1 && styles.lastPlaylistCard
                ]}
                onPress={() => router.push(`/playlists/${playlist.id}`)}
                activeOpacity={0.7}
                accessibilityLabel={`Play ${playlist.title} playlist with ${playlist.listens ? `${(playlist.listens / 1000).toFixed(0)}k` : 'no'} listens`}
                accessibilityRole="button"
              >
                <Image source={playlist.image} style={styles.playlistImage} />
                <View style={styles.playlistInfo}>
                  <ThemedText type="defaultSemiBold" style={styles.playlistTitle}>
                    {playlist.title}
                  </ThemedText>
                  {playlist.listens && (
                    <View style={styles.playlistStats}>
                      <Ionicons name="play" size={14} color={iconColor} />
                      <ThemedText style={styles.playlistListens}>
                        {(playlist.listens / 1000).toFixed(0)}k listens
                      </ThemedText>
                    </View>
                  )}
                </View>
                <TouchableOpacity 
                  style={styles.menuButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel={`More options for ${playlist.title}`}
                  accessibilityRole="button"
                  activeOpacity={0.6}
                >
                  <Ionicons name="ellipsis-horizontal" size={24} color={iconColor} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
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
  header: {
    paddingHorizontal: 24,
    paddingTop: 34,
    paddingBottom: 24,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  playlistsSection: {
    gap: 20,
  },
  playlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  lastPlaylistCard: {
    marginBottom: 0,
  },
  playlistImage: {
    width: 72,
    height: 72,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  playlistInfo: {
    flex: 1,
    marginLeft: 20,
    marginRight: 12,
  },
  playlistTitle: {
    fontSize: 17,
    marginBottom: 6,
    lineHeight: 22,
  },
  playlistStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  playlistListens: {
    fontSize: 14,
    opacity: 0.65,
    lineHeight: 18,
  },
  menuButton: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
});