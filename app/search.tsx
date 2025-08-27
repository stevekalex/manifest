import { ThemedText, ThemedView } from '@/components/theme/Themed';
import { SearchBar } from '@/components/search/SearchBar';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // TODO: Implement search functionality
    console.log('Search query:', query);
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
          
          <ThemedText style={styles.headerTitle}>Search</ThemedText>
          
          <View style={styles.headerSpacer} />
        </View>

        {/* Search Bar */}
        <SearchBar
          placeholder="Search meditations, affirmations..."
          onSearch={handleSearch}
          autoFocus={true}
        />

        {/* Search Results Area */}
        <View style={styles.resultsContainer}>
          {searchQuery ? (
            <ThemedText style={[styles.resultsText, { color: `${textColor}80` }]}>
              Search results for &ldquo;{searchQuery}&rdquo; will appear here
            </ThemedText>
          ) : (
            <ThemedText style={[styles.placeholderText, { color: `${textColor}60` }]}>
              Start typing to search for meditations, affirmations, and more...
            </ThemedText>
          )}
        </View>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  headerSpacer: {
    width: 40,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  placeholderText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
  },
});