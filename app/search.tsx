import { ThemedText, ThemedView } from '@/components/theme/Themed';
import { SearchBar } from '@/components/search/SearchBar';
import { SearchResults } from '@/components/search/SearchResults';
import { useThemeColor } from '@/hooks/useThemeColor';
import { usePlaylistSearchHybrid } from '@/hooks/usePlaylistSearchHybrid';
import { audioLog } from '@/utils/logger';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { StatusBar, StyleSheet, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SearchScreen() {
  const tintColor = useThemeColor({}, 'tint');

  // Initialize hybrid search hook
  const {
    searchQuery,
    filteredPlaylists,
    isSearching,
    isLoadingPlaylists,
    error,
    handleSearch,
    refreshPlaylists,
    hasQuery,
    isCacheStale,
  } = usePlaylistSearchHybrid();

  const handleSearchSubmit = (query: string) => {
    audioLog('[SEARCH] Search submitted:', query);
  };

  const handleBackPress = () => {
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: `${tintColor}20` }]}
            onPress={handleBackPress}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={tintColor} />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <ThemedText style={styles.headerTitle}>Search</ThemedText>
          </View>
          
          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: `${tintColor}20` }]}
            onPress={refreshPlaylists}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={20} color={tintColor} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <SearchBar
          placeholder="Search playlists..."
          onSearch={handleSearchSubmit}
          onChangeText={handleSearch}
          autoFocus={!isLoadingPlaylists}
        />

        {/* Loading State */}
        {isLoadingPlaylists ? (
          <ThemedView style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={tintColor} />
            <ThemedText style={[styles.loadingText, { color: `${tintColor}80` }]}>
              Loading playlists...
            </ThemedText>
          </ThemedView>
        ) : (
          <>
            {/* Cache Status */}
            {isCacheStale && (
              <View style={[styles.statusBar, { backgroundColor: `#ff6b6b20` }]}>
                <ThemedText style={[styles.statusText, { color: '#ff6b6b' }]}>
                  ⚠️ Data may be outdated. Tap refresh to update.
                </ThemedText>
              </View>
            )}

            {/* Search Results */}
            <SearchResults
              results={filteredPlaylists}
              query={searchQuery}
              isSearching={isSearching}
              hasQuery={hasQuery}
            />
            
            {/* Error Display */}
            {error && (
              <ThemedView style={styles.errorContainer}>
                <ThemedText style={styles.errorText}>
                  {error}
                </ThemedText>
                <TouchableOpacity 
                  style={[styles.retryButton, { borderColor: tintColor }]}
                  onPress={refreshPlaylists}
                  activeOpacity={0.7}
                >
                  <ThemedText style={[styles.retryText, { color: tintColor }]}>
                    Retry
                  </ThemedText>
                </TouchableOpacity>
              </ThemedView>
            )}
          </>
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  statusBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  errorContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    color: '#ff6b6b',
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 8,
  },
  retryButton: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '500',
  },
});