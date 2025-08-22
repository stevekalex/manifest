import { useThemeColor } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AISearchBar } from './AISearchBar';

interface WelcomePageProps {
  userName?: string;
}

export function WelcomePage({ userName = "Steve Alex" }: WelcomePageProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  const handleSearch = (query: string) => {
    // TODO: Implement AI search functionality
    console.log('AI Search query:', query);
  };

  const handleSearchIconPress = () => {
    router.push('/search');
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Header Icons */}
      <View style={styles.header}>
        <TouchableOpacity style={[styles.headerIcon, { backgroundColor: `${tintColor}20` }]}>
          <Ionicons name="notifications-outline" size={24} color={tintColor} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.headerIcon, { backgroundColor: `${tintColor}20` }]}
          onPress={handleSearchIconPress}
          activeOpacity={0.7}
        >
          <Ionicons name="search-outline" size={24} color={tintColor} />
        </TouchableOpacity>
      </View>

      {/* Glowing Logo */}

      {/* Greeting Section */}
      <Animated.View
        entering={FadeInDown.delay(200).springify()}
        style={styles.greetingSection}
      >
        <Text style={[styles.greeting, { color: `${textColor}CC` }]}>Hi, {userName}</Text>
        <Text style={[styles.mainQuestion, { color: textColor }]}>
          What mindset do you{'\n'}want to cultivate?
        </Text>
      </Animated.View>

      {/* AI Search Bar */}
      <Animated.View entering={FadeInDown.delay(400).springify()}>
        <AISearchBar
          placeholder="Feel confident and..."
          onSearch={handleSearch}
        />
      </Animated.View>

      {/* Last Sessions */}
      {/* <Animated.View entering={FadeInDown.delay(600).springify()}>
        <LastSessions />
      </Animated.View> */}

      {/* Promo Banner */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 400,
    position: 'relative',
    marginBottom: 32,
    marginTop: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 30, // Account for status bar
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingSection: {
    alignItems: 'center',
    marginVertical: 30,
    paddingHorizontal: 20,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  mainQuestion: {
    fontSize: 32,
    fontWeight: '300',
    textAlign: 'center',
    lineHeight: 40,
    letterSpacing: 0.3,
  },
});