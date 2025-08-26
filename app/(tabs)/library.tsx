import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useLikedPlaylists } from '@/hooks/useLikedPlaylists';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';


export default function LibraryScreen() {
  const iconColor = useThemeColor({}, 'icon');
  const tintColor = useThemeColor({}, 'tint');
  // Fallback to tinted background using existing palette
  const cardBackground = useThemeColor({}, 'glassMorphic');

  const { likedPlaylists, loading, error, refetch } = useLikedPlaylists();

  // Refetch when the Library tab/screen gains focus so liked state stays in sync
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

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
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refetch} />
          }
        >
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={tintColor} />
              <ThemedText style={styles.loadingText}>Loading your saved playlists...</ThemedText>
            </View>
          ) : error ? (
            <View style={styles.centerContainer}>
              <Ionicons name="alert-circle-outline" size={48} color={iconColor} />
              <ThemedText style={styles.errorText}>{error}</ThemedText>
              <TouchableOpacity style={styles.retryButton} onPress={refetch}>
                <ThemedText style={[styles.retryButtonText, { color: tintColor }]}>Retry</ThemedText>
              </TouchableOpacity>
            </View>
          ) : likedPlaylists.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="heart-outline" size={48} color={iconColor} />
              <ThemedText style={styles.emptyTitle}>No saved playlists yet</ThemedText>
              <ThemedText style={styles.emptyDescription}>
                Tap the heart icon on any playlist to save it here.
              </ThemedText>
            </View>
          ) : (
            <View style={styles.playlistsSection}>
              {likedPlaylists.map((item, index) => (
                <TouchableOpacity 
                  key={item.playlist_id} 
                  style={[
                    styles.playlistCard,
                    index === likedPlaylists.length - 1 && styles.lastPlaylistCard
                  ]}
                  onPress={() => router.push(`/playlists/${item.playlist_id}`)}
                  activeOpacity={0.7}
                  accessibilityLabel={`Play ${item.playlists?.name || 'playlist'} playlist`}
                  accessibilityRole="button"
                >
                  <View style={styles.playlistImageContainer}>
                    <View style={[styles.playlistImagePlaceholder, { backgroundColor: cardBackground }]}>
                      <Ionicons name="musical-notes" size={32} color={iconColor} opacity={0.3} />
                    </View>
                  </View>
                  <View style={styles.playlistInfo}>
                    <ThemedText type="defaultSemiBold" style={styles.playlistTitle}>
                      {item.playlists?.name || 'Untitled playlist'}
                    </ThemedText>
                    {item.playlists?.description && (
                      <ThemedText style={styles.playlistDescription}>
                        {item.playlists?.description}
                      </ThemedText>
                    )}
                  </View>
                  <TouchableOpacity 
                    style={styles.menuButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityLabel={`More options for ${item.playlists?.name || 'playlist'}`}
                    accessibilityRole="button"
                    activeOpacity={0.6}
                  >
                    <Ionicons name="ellipsis-horizontal" size={24} color={iconColor} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}
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
  playlistImageContainer: {
    width: 72,
    height: 72,
  },
  playlistImagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
  playlistDescription: {
    fontSize: 14,
    opacity: 0.65,
    lineHeight: 18,
    marginTop: 2,
  },
  menuButton: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    opacity: 0.7,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyDescription: {
    marginTop: 8,
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 22,
  },
});