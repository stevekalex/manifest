import { useThemeColor } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface EmailExpansionProps {
  isExpanded: boolean;
  email: string;
  onEmailChange: (email: string) => void;
  onSubmit: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function EmailExpansion({
  isExpanded,
  email,
  onEmailChange,
  onSubmit,
  loading = false,
  disabled = false,
}: EmailExpansionProps) {
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  
  const emailInputRef = useRef<TextInput>(null);
  const height = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isExpanded) {
      height.value = withSpring(120, { damping: 20 });
      opacity.value = withTiming(1, { duration: 200 });
      // Auto-focus the email field with a slight delay
      setTimeout(() => {
        emailInputRef.current?.focus();
      }, 250);
    } else {
      // Smooth collapse animation (200ms ease-in-out)
      height.value = withTiming(0, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
      // Blur the field if it's focused
      emailInputRef.current?.blur();
    }
  }, [isExpanded]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: opacity.value,
  }));

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const canSubmit = isValidEmail(email) && !loading && !disabled;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.content}>
        <View style={[styles.inputContainer, { borderColor: `${tintColor}30` }]}>
          <TextInput
            ref={emailInputRef}
            style={[styles.textInput, { color: textColor }]}
            value={email}
            onChangeText={onEmailChange}
            placeholder="Enter your email"
            placeholderTextColor={`${textColor}60`}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            returnKeyType="done"
            onSubmitEditing={canSubmit ? onSubmit : undefined}
            accessibilityLabel="Email address"
            accessibilityHint="Enter your email address for magic link"
          />
        </View>
        
        <Pressable
          style={[
            styles.submitButton,
            { 
              backgroundColor: canSubmit ? tintColor : `${tintColor}40`,
              borderColor: tintColor,
            },
            !canSubmit && styles.disabledButton,
          ]}
          onPress={onSubmit}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel="Email me a magic link"
          accessibilityState={{ disabled: !canSubmit }}
        >
          <View style={styles.submitContent}>
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            )}
            <Text style={styles.submitText}>
              {loading ? 'Sending...' : 'Email me a magic link'}
            </Text>
          </View>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    marginTop: 8,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  textInput: {
    fontSize: 16,
    paddingVertical: 2,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});