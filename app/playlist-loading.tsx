import { useThemeColor } from '@/hooks/useThemeColor';
import { AIPlaylistService } from '@/services/aiPlaylistService';
import type { GeneratePlaylistResponse } from '@/types/aiPlaylist';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const loadingMessages = [
  "Crafting your personalized affirmations...",
  "Aligning with your intentions...", 
  "Channeling positive energy...",
  "Creating your manifestation journey...",
  "Weaving together powerful words...",
];

export default function PlaylistLoadingScreen() {
  const { prompt } = useLocalSearchParams<{ prompt: string }>();
  const [currentMessage, setCurrentMessage] = useState(0);
  const [hasStartedGeneration, setHasStartedGeneration] = useState(false);
  const generationStarted = useRef(false);
  
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  // Animation values
  const sparkleRotation = useSharedValue(0);
  const sparkleScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);
  const progressWidth = useSharedValue(0);

  // Animated styles
  const sparkleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${sparkleRotation.value}deg` },
      { scale: sparkleScale.value }
    ],
    shadowOpacity: glowOpacity.value,
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const startAnimations = () => {
    // Sparkle rotation
    sparkleRotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );

    // Sparkle breathing scale
    sparkleScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000 }),
        withTiming(0.9, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      false
    );

    // Glow breathing
    glowOpacity.value = withRepeat(
      withTiming(0.8, { duration: 2000 }),
      -1,
      true
    );

    // Progress bar animation (3 seconds)
    progressWidth.value = withTiming(100, { duration: 3000, easing: Easing.out(Easing.quad) });
  };

  const cycleMessages = () => {
    const interval = setInterval(() => {
      setCurrentMessage(prev => (prev + 1) % loadingMessages.length);
    }, 1200);

    return interval;
  };

  const handleGenerationComplete = (playlist: GeneratePlaylistResponse) => {
    router.replace({
      pathname: '/playlist-preview',
      params: {
        id: playlist.id,
        name: playlist.name,
        subtitle: playlist.subtitle,
        user_prompt: playlist.user_prompt,
        affirmations: JSON.stringify(playlist.affirmations),
      }
    });
  };

  const handleGenerationError = (error: string) => {
    Alert.alert(
      'Generation Failed',
      error,
      [
        {
          text: 'Try Again',
          onPress: () => router.back(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => router.push('/home'),
        }
      ]
    );
  };

  const generatePlaylist = async () => {
    if (!prompt || generationStarted.current) {
      return;
    }

    generationStarted.current = true;
    setHasStartedGeneration(true);

    try {
      const playlist = await AIPlaylistService.generatePlaylist(prompt);
      
      // Ensure we show loading for at least 2 seconds for good UX
      const minLoadingTime = new Promise(resolve => setTimeout(resolve, 2000));
      await minLoadingTime;
      
      handleGenerationComplete(playlist);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      handleGenerationError(errorMessage);
    }
  };

  useEffect(() => {
    if (!prompt) {
      router.replace('/home');
      return;
    }

    startAnimations();
    const messageInterval = cycleMessages();
    generatePlaylist();

    return () => {
      clearInterval(messageInterval);
    };
  }, [prompt]);

  if (!prompt) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Background Pattern */}
      <View style={styles.backgroundPattern}>
        <Animated.View 
          entering={FadeInUp.delay(200).springify()}
          style={[styles.floatingElement, { backgroundColor: `${tintColor}08` }]}
        />
        <Animated.View 
          entering={FadeInUp.delay(400).springify()}
          style={[styles.floatingElement2, { backgroundColor: `${tintColor}12` }]}
        />
        <Animated.View 
          entering={FadeInUp.delay(600).springify()}
          style={[styles.floatingElement3, { backgroundColor: `${tintColor}15` }]}
        />
      </View>

      {/* Header with Back Button */}
      <Animated.View 
        entering={FadeInUp.delay(100).springify()}
        style={styles.header}
      >
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: `${tintColor}20`, borderColor: `${tintColor}30` }]}
          onPress={() => router.push('/(tabs)')}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={textColor} />
        </TouchableOpacity>
      </Animated.View>

      {/* Main Content */}
      <View style={styles.content}>
        
        {/* Animated Icon */}
        <Animated.View 
          entering={FadeInUp.delay(400).springify()}
          style={styles.iconContainer}
        >
          <Animated.View style={[
            styles.sparkleIcon,
            sparkleAnimatedStyle,
            { 
              backgroundColor: tintColor,
              shadowColor: tintColor,
            }
          ]}>
            <Ionicons name="sparkles" size={48} color="#fff" />
          </Animated.View>
        </Animated.View>

        {/* Title */}
        <Animated.View 
          entering={FadeInUp.delay(600).springify()}
          style={styles.titleContainer}
        >
          <Text style={[styles.title, { color: textColor }]}>
            Creating Your Playlist
          </Text>
        </Animated.View>

        {/* Progress Bar */}
        <Animated.View 
          entering={FadeInUp.delay(800).springify()}
          style={styles.progressContainer}
        >
          <View style={[styles.progressTrack, { backgroundColor: `${tintColor}20` }]}>
            <Animated.View 
              style={[
                styles.progressBar,
                progressAnimatedStyle,
                { backgroundColor: tintColor }
              ]}
            />
          </View>
        </Animated.View>

        {/* Loading Message */}
        <Animated.View 
          entering={FadeInUp.delay(1000).springify()}
          style={styles.messageContainer}
        >
          <Text style={[styles.loadingMessage, { color: `${textColor}80` }]}>
            {loadingMessages[currentMessage]}
          </Text>
        </Animated.View>

        {/* User Prompt Preview */}
        <Animated.View 
          entering={FadeInUp.delay(1200).springify()}
          style={styles.promptContainer}
        >
          <Text style={[styles.promptLabel, { color: `${textColor}60` }]}>
            Your request:
          </Text>
          <Text style={[styles.promptText, { color: `${textColor}90` }]}>
            &ldquo;{prompt}&rdquo;
          </Text>
        </Animated.View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  floatingElement: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: 120,
    right: -60,
    opacity: 0.6,
  },
  floatingElement2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    top: 350,
    left: -40,
    opacity: 0.4,
  },
  floatingElement3: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    bottom: 180,
    right: 30,
    opacity: 0.3,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -80, // Adjust to account for header
  },
  iconContainer: {
    marginBottom: 32,
  },
  sparkleIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  titleContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 34,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 32,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  messageContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  loadingMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  promptContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    maxWidth: '90%',
  },
  promptLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: 'center',
  },
  promptText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});