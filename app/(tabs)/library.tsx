import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function LibraryScreen() {
  const iconColor = useThemeColor({}, 'icon');
  const tintColor = useThemeColor({}, 'tint');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            My Library
          </ThemedText>
        </View>

        <View style={styles.content}>
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={64} color={iconColor} style={styles.emptyIcon} />
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              Your library is empty
            </ThemedText>
            <ThemedText style={styles.emptyText}>
              Save your favorite playlists and affirmations here
            </ThemedText>
            
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: tintColor }]}
              onPress={() => router.push('/(tabs)')}
            >
              <ThemedText type="defaultSemiBold" style={styles.buttonText}>
                Browse Playlists
              </ThemedText>
            </TouchableOpacity>
          </View>
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
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  emptyIcon: {
    marginBottom: 24,
    opacity: 0.3,
  },
  emptyTitle: {
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 32,
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    minHeight: 44,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});