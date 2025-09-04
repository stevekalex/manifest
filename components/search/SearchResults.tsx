import { SearchResultCard } from '@/components/search/SearchResultCard';
import { ThemedText, ThemedView } from '@/components/theme/Themed';
import { useThemeColor } from '@/hooks/useThemeColor';
import type { PlaylistSearchResult } from '@/types/audio';
import { router } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

interface SearchResultsProps {
  results?: PlaylistSearchResult[];
  query?: string;
  isSearching?: boolean;
  hasQuery?: boolean;
}

export function SearchResults({ 
  results = [], 
  query = '', 
  isSearching = false,
  hasQuery = false 
}: SearchResultsProps) {
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  const handlePlaylistPress = (playlistId: string) => {
    router.push(`/playlists/${playlistId}`);
  };

  const renderPlaylistItem = ({ item }: { item: PlaylistSearchResult }) => {
    // Safety check to ensure we have valid data
    if (!item || !item.id || !item.name) {
      console.warn('[SEARCH] Invalid playlist item:', item);
      return null;
    }
    
    return (
      <View style={styles.playlistItem}>
        <SearchResultCard
          playlist={item}
          onPress={() => handlePlaylistPress(item.id)}
          showListensCount={true}
        />
      </View>
    );
  };

  const renderEmptyState = () => {
    if (isSearching) {
      return (
        <View style={styles.emptyState}>
          <ThemedText style={[styles.emptyText, { color: `${textColor}80` }]}>
            Searching...
          </ThemedText>
        </View>
      );
    }

    if (!hasQuery) {
      return (
        <View style={styles.emptyState}>
          <ThemedText style={[styles.emptyText, { color: `${textColor}60` }]}>
            Start typing to search for meditations, affirmations, and more...
          </ThemedText>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <ThemedText style={[styles.emptyText, { color: `${textColor}80` }]}>
          No results found for &ldquo;{query}&rdquo;
        </ThemedText>
        <ThemedText style={[styles.suggestionText, { color: `${textColor}60` }]}>
          Try searching for different keywords or check your spelling
        </ThemedText>
      </View>
    );
  };

  const renderResultsHeader = () => {
    if (!hasQuery || isSearching || !results || results.length === 0) {
      return null;
    }

    return (
      <View style={styles.resultsHeader}>
        <ThemedText style={[styles.resultsCount, { color: tintColor }]}>
          {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
        </ThemedText>
      </View>
    );
  };

  if (!hasQuery || (hasQuery && (!results || results.length === 0))) {
    return (
      <ThemedView style={styles.container}>
        {renderEmptyState()}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={results}
        renderItem={renderPlaylistItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderResultsHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    padding: 20,
    paddingTop: 10,
  },
  resultsHeader: {
    marginBottom: 16,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  playlistItem: {
    marginBottom: 2,
  },
  separator: {
    height: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});