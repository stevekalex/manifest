import { GlassButton } from '@/components/common/GlassButton';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
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

const MAX_PROMPT_LENGTH = 500;

const promptSuggestions = [
  "Help me build confidence at work",
  "Healing from past relationships",
  "Finding inner peace and calm",
  "Boost my self-love and self-worth",
  "Manifest my dream career",
];

export default function PlaylistPromptScreen() {
  const { initialPrompt } = useLocalSearchParams<{ initialPrompt?: string }>();
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const placeholderColor = useThemeColor({}, 'placeholderText');

  // Breathing glow animation for the icon
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

  const handlePromptChange = (text: string) => {
    if (text.length <= MAX_PROMPT_LENGTH) {
      setPrompt(text);
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    setPrompt(suggestion);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      Alert.alert('Please enter a prompt', 'Describe what kind of playlist you\'d like to create.');
      return;
    }

    if (prompt.trim().length < 10) {
      Alert.alert('Too short', 'Please provide a more detailed description (at least 10 characters).');
      return;
    }

    setIsGenerating(true);
    
    try {
      // Navigate to loading screen with the prompt
      router.push({
        pathname: '/playlist-loading',
        params: { prompt: prompt.trim() }
      });
    } catch (error) {
      setIsGenerating(false);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const handleBack = () => {
    router.push('/(tabs)');
  };

  const remainingChars = MAX_PROMPT_LENGTH - prompt.length;

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          
          {/* Header */}
          <Animated.View 
            entering={FadeInUp.delay(200).springify()}
            style={styles.header}
          >
            <TouchableOpacity
              onPress={handleBack}
              style={[styles.backButton, { backgroundColor: `${tintColor}20`, borderColor: `${tintColor}30` }]}
              disabled={isGenerating}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color={textColor} />
            </TouchableOpacity>
          </Animated.View>

          {/* Title and Description */}
          <Animated.View 
            entering={FadeInUp.delay(400).springify()}
            style={styles.titleContainer}
          >
            <Text style={[styles.title, { color: textColor }]}>
              Create Your Playlist
            </Text>
            <Text style={[styles.subtitle, { color: `${textColor}70` }]}>
              Tell me what you&apos;d like to manifest and I&apos;ll create a personalized playlist of affirmations for you.
            </Text>
          </Animated.View>

          {/* Text Input */}
          <Animated.View 
            entering={FadeInDown.delay(600).springify()}
            style={styles.inputContainer}
          >
            <TextInput
              style={[
                styles.textInput,
                { 
                  color: textColor,
                  backgroundColor: `${tintColor}10`,
                  borderColor: `${tintColor}20`,
                }
              ]}
              value={prompt}
              onChangeText={handlePromptChange}
              placeholder="Example: I want to build confidence for my upcoming presentation..."
              placeholderTextColor={placeholderColor}
              multiline
              textAlignVertical="top"
              maxLength={MAX_PROMPT_LENGTH}
              editable={!isGenerating}
            />
            <View style={styles.charCounter}>
              <Text style={[
                styles.charCountText, 
                { 
                  color: remainingChars < 50 ? '#FF6B6B' : `${textColor}50` 
                }
              ]}>
                {remainingChars} characters remaining
              </Text>
            </View>

            {/* Generate Button - Moved here */}
            <Animated.View 
              entering={FadeInDown.delay(700).springify()}
              style={styles.generateButtonContainer}
            >
              <GlassButton
                label={isGenerating ? "Creating..." : "Generate Playlist"}
                glow={true}
                onPress={handleGenerate}
                style={[
                  styles.generateButton,
                  { opacity: prompt.trim().length >= 10 ? 1 : 0.5 }
                ]}
                disabled={isGenerating || prompt.trim().length < 10}
              />
            </Animated.View>
          </Animated.View>

          {/* Suggestions */}
          <Animated.View 
            entering={FadeInDown.delay(800).springify()}
            style={styles.suggestionsContainer}
          >
            <Text style={[styles.suggestionsTitle, { color: `${textColor}80` }]}>
              Need inspiration? Try these:
            </Text>
            <View style={styles.suggestionsGrid}>
              {promptSuggestions.map((suggestion, index) => (
                <Animated.View
                  key={index}
                  entering={FadeInDown.delay(900 + (index * 100)).springify()}
                  style={styles.suggestionItemContainer}
                >
                  <GlassButton
                    label={suggestion}
                    onPress={() => handleSuggestionPress(suggestion)}
                    style={styles.suggestionButton}
                    disabled={isGenerating}
                  />
                </Animated.View>
              ))}
            </View>
          </Animated.View>

        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
  titleContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  inputContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  textInput: {
    height: 120,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    lineHeight: 24,
  },
  charCounter: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  charCountText: {
    fontSize: 12,
  },
  generateButtonContainer: {
    marginTop: 24,
  },
  suggestionsContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 20,
    textAlign: 'center',
  },
  suggestionsGrid: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
  },
  suggestionItemContainer: {
    width: '100%',
  },
  suggestionButton: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButton: {
    paddingVertical: 18,
  },
});