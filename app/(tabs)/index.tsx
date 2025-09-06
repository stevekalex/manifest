import { ThemedView } from '@/components/theme/Themed';
import { StateHandler } from '@/components/common/StateHandler';
import { RecentlyPlayedCarousel } from '@/components/home/RecentlyPlayedCarousel';
import { ThemeCarousel } from '@/components/home/ThemeCarousel';
import { WelcomePage } from '@/components/welcome';
import { getAllThemes } from '@/data/themes';
import { themesService } from '@/utils/themesService';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useAudioSystem } from '@/hooks/useAudioSystem';
import type { Theme } from '@/types/audio';
import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, TouchableOpacity, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function HomeScreen() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const glassMorphic = useThemeColor({}, 'glassMorphic');
  const glassMorphicBorder = useThemeColor({}, 'glassMorphicBorder');
  const audio = useAudioSystem();
  const { signOut } = useAuth();

  const loadData = async () => {
    try {
      setError(null);
      
      // Load themes from API with fallback to hardcoded data
      console.log('🏠 HomeScreen: Fetching themes from API...');
      const themesResponse = await themesService.getAllThemes();
      
      if (themesResponse.data) {
        const sortedThemes = [...themesResponse.data].sort((a, b) => (a.order || 0) - (b.order || 0));
        console.log('🏠 HomeScreen: Successfully loaded themes from API:', sortedThemes);
        console.log('🏠 HomeScreen: Sample theme playlist:', sortedThemes[0]?.playlists[0]);
        setThemes(sortedThemes);
      } else {
        // Unexpected response structure, use fallback
        console.warn('🏠 HomeScreen: Unexpected API response structure, using fallback themes');
        const fallbackThemes = getAllThemes();
        console.log('🏠 HomeScreen: Using fallback themes after unexpected response:', fallbackThemes);
        setThemes(fallbackThemes);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      // Final fallback - try to load hardcoded themes
      try {
        const fallbackThemes = getAllThemes();
        setThemes(fallbackThemes);
      } catch (fallbackErr) {
        setError('Failed to load content. Please try again.');
        console.error('Fallback themes also failed:', fallbackErr);
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Stop any playing audio first
              await audio.stopAll();
              
              // Sign out from backend
              const result = await signOut();
              
              if (result.success) {
                // Navigate back to welcome screen
                router.replace('/');
              } else {
                Alert.alert('Error', 'Failed to sign out completely, but you have been logged out locally.');
                router.replace('/');
              }
            } catch (error) {
              console.error('Logout error:', error);
              // Still navigate away even if there was an error
              router.replace('/');
            }
          }
        }
      ]
    );
  };


  return (
    <ThemedView style={styles.container}>
      <StateHandler 
        loading={isLoading} 
        error={error} 
        onRetry={loadData} 
        loadingItemCount={2}
      >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={tintColor}
            />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {/* Welcome Section */}
          <WelcomePage userName="Steve Alex" />

          {/* Content Container with better spacing */}
          <View style={styles.contentContainer}>
            {/* Recently Played Section */}
            <View style={styles.sectionWrapper}>
              <RecentlyPlayedCarousel userId="8" />
            </View>

            {/* Theme-based Carousel Sections */}
            {themes.map((theme, index) => (
              <View key={theme.id} style={styles.sectionWrapper}>
                <ThemeCarousel theme={theme} />
              </View>
            ))}

            {/* Logout Button */}
            <View style={styles.logoutContainer}>
              <TouchableOpacity
                style={[
                  styles.logoutButton,
                  {
                    backgroundColor: glassMorphic,
                    borderColor: glassMorphicBorder,
                  }
                ]}
                onPress={handleLogout}
                activeOpacity={0.8}
              >
                <Ionicons name="log-out-outline" size={20} color={textColor} />
                <Text style={[styles.logoutButtonText, { color: textColor }]}>
                  Sign Out
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Bottom spacing for better scroll experience */}
            <View style={styles.bottomSpacing} />
          </View>
        </ScrollView>
      </SafeAreaView>
      </StateHandler>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentContainer: {
    paddingTop: 8,
  },
  sectionWrapper: {
    marginBottom: 8,
  },
  logoutContainer: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    alignItems: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 140,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  bottomSpacing: {
    height: 40,
  },
});