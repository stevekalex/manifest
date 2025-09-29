import { GlassButton } from '@/components/common/GlassButton';
import { useThemeColor } from '@/hooks/useThemeColor';
import type { AIGeneratedAffirmation } from '@/types/aiPlaylist';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export default function PlaylistPreviewScreen() {
  const { id, name, subtitle, user_prompt, affirmations: affirmationsParam } = useLocalSearchParams<{
    id: string;
    name: string;
    subtitle: string;
    user_prompt: string;
    affirmations: string;
  }>();

  const [isConfirming, setIsConfirming] = useState(false);
  
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  // Parse affirmations from string
  let affirmations: AIGeneratedAffirmation[] = [];
  try {
    affirmations = affirmationsParam ? JSON.parse(affirmationsParam) : [];
  } catch (error) {
    console.error('Failed to parse affirmations:', error);
    affirmations = [];
  }

  // Breathing glow animation
  const glowOpacity = useSharedValue(0.3);
  const glowAnimatedStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value,
  }));

  React.useEffect(() => {
    glowOpacity.value = withRepeat(
      withTiming(0.6, { duration: 2000 }),
      -1,
      true
    );
  }, []);

  const handleBack = () => {
    // Take user back to the playlist prompt screen with their original prompt
    router.push({
      pathname: '/playlist-prompt',
      params: { initialPrompt: user_prompt || '' }
    });
  };

  const handleRegenerate = () => {
    Alert.alert(
      'Regenerate Playlist?',
      'This will create a new playlist with the same prompt. Your current playlist will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          onPress: () => {
            router.push({
              pathname: '/playlist-loading',
              params: { prompt: user_prompt || '' }
            });
          }
        }
      ]
    );
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    
    try {
      // Create playlist data in the format expected by the player
      const playlistData = {
        id,
        name,
        description: subtitle,
        backgroundTrackUrl: "https://example.com/background.mp3", // Default background
        affirmations: affirmations.map((affirmation) => ({
          id: affirmation.id,
          text: affirmation.content,
          // Since these are AI-generated, we'll use TTS in the player
          // The player will handle TTS generation for these affirmations
          isAIGenerated: true,
          order: affirmation.order_index
        })),
        // Mark as AI-generated playlist
        isAIGenerated: true,
        userPrompt: user_prompt,
        // No pre-generated audio URLs since we'll use TTS
        cdnUrls: {}
      };

      // Navigate to player with the generated playlist
      router.push({
        pathname: '/player',
        params: {
          playlistData: JSON.stringify(playlistData)
        }
      });
    } catch (error) {
      setIsConfirming(false);
      Alert.alert('Error', 'Failed to start playlist. Please try again.');
    }
  };

  if (!id || !name || !affirmations.length) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <Text style={[styles.errorText, { color: textColor }]}>
          Invalid playlist data. Please try again.
        </Text>
        <GlassButton
          label="Go Back"
          onPress={() => router.push('/home')}
          style={styles.errorButton}
        />
      </View>
    );
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
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <Animated.View 
          entering={FadeInUp.delay(200).springify()}
          style={styles.header}
        >
          <TouchableOpacity
            onPress={handleBack}
            style={[styles.backButton, { backgroundColor: `${tintColor}20`, borderColor: `${tintColor}30` }]}
            disabled={isConfirming}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={textColor} />
          </TouchableOpacity>
        </Animated.View>

        {/* Title Section */}
        <Animated.View 
          entering={FadeInUp.delay(400).springify()}
          style={styles.titleSection}
        >
          <Text style={[styles.playlistName, { color: textColor }]}>
            {name}
          </Text>
          <Text style={[styles.playlistSubtitle, { color: `${textColor}70` }]}>
            {subtitle}
          </Text>
        </Animated.View>

        {/* Stats */}
        <Animated.View 
          entering={FadeInDown.delay(600).springify()}
          style={styles.statsContainer}
        >
          <View style={[styles.statCard, { backgroundColor: `${tintColor}15` }]}>
            <Text style={[styles.statNumber, { color: tintColor }]}>
              {affirmations.length}
            </Text>
            <Text style={[styles.statLabel, { color: `${textColor}70` }]}>
              Affirmations
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: `${tintColor}15` }]}>
            <Text style={[styles.statNumber, { color: tintColor }]}>
              AI
            </Text>
            <Text style={[styles.statLabel, { color: `${textColor}70` }]}>
              Generated
            </Text>
          </View>
        </Animated.View>

        {/* Affirmations List */}
        <Animated.View 
          entering={FadeInDown.delay(800).springify()}
          style={styles.affirmationsContainer}
        >
          <Text style={[styles.affirmationsTitle, { color: textColor }]}>
            Your Affirmations
          </Text>
          
          {affirmations.map((affirmation, index) => (
            <Animated.View
              key={affirmation.id}
              entering={FadeInDown.delay(900 + (index * 100)).springify()}
              style={[
                styles.affirmationCard,
                { backgroundColor: `${tintColor}10`, borderColor: `${tintColor}20` }
              ]}
            >
              <View style={styles.affirmationHeader}>
                <View style={[styles.affirmationNumber, { backgroundColor: tintColor }]}>
                  <Text style={styles.affirmationNumberText}>
                    {index + 1}
                  </Text>
                </View>
                <View style={styles.affirmationContent}>
                  <Text style={[styles.affirmationText, { color: textColor }]}>
                    {affirmation.content}
                  </Text>
                </View>
              </View>
            </Animated.View>
          ))}
        </Animated.View>

        {/* User Prompt Section */}
        <Animated.View 
          entering={FadeInDown.delay(1000).springify()}
          style={styles.promptSection}
        >
          <Text style={[styles.promptLabel, { color: `${textColor}60` }]}>
            Based on your request:
          </Text>
          <Text style={[styles.promptText, { color: `${textColor}80` }]}>
            &ldquo;{user_prompt}&rdquo;
          </Text>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View 
          entering={FadeInDown.delay(1200).springify()}
          style={styles.actionsContainer}
        >
          <GlassButton
            label="Regenerate"
            onPress={handleRegenerate}
            style={[styles.actionButton, styles.secondaryButton]}
            textStyle={[styles.secondaryButtonText, { color: `${textColor}90` }]}
            disabled={isConfirming}
          >
            <Ionicons name="refresh" size={20} color={`${textColor}90`} style={styles.buttonIcon} />
          </GlassButton>

          <GlassButton
            label={isConfirming ? "Starting..." : "Start Playlist"}
            glow={true}
            onPress={handleConfirm}
            style={[styles.actionButton, styles.primaryButton]}
            disabled={isConfirming}
          >
            <Ionicons 
              name={isConfirming ? "hourglass" : "play"} 
              size={20} 
              color="#fff" 
              style={styles.buttonIcon} 
            />
          </GlassButton>
        </Animated.View>

      </ScrollView>
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
    width: 180,
    height: 180,
    borderRadius: 90,
    top: 100,
    right: -50,
    opacity: 0.5,
  },
  floatingElement2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    bottom: 150,
    left: -40,
    opacity: 0.3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 60,
    marginBottom: 20,
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
  titleSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  playlistName: {
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 34,
  },
  playlistSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginBottom: 32,
    gap: 16,
  },
  statCard: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 100,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  affirmationsContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  affirmationsTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  affirmationCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  affirmationHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  affirmationNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    flexShrink: 0,
  },
  affirmationNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  affirmationContent: {
    flex: 1,
  },
  affirmationText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  promptSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
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
    paddingHorizontal: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    // GlassButton with glow handles the styling
  },
  secondaryButton: {
    // Custom secondary styling
  },
  secondaryButtonText: {
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    margin: 24,
  },
  errorButton: {
    margin: 24,
    paddingVertical: 16,
  },
});