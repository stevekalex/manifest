import React, { useEffect } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useThemeColor } from '@/hooks/useThemeColor';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type AuthMode = 'signin' | 'signup';

interface SegmentedControlProps {
  selectedMode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
}

export function SegmentedControl({ selectedMode, onModeChange }: SegmentedControlProps) {
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const glassMorphic = useThemeColor({}, 'glassMorphic');
  const glassMorphicBorder = useThemeColor({}, 'glassMorphicBorder');

  // Animated thumb position (0 = left, 1 = right)
  const thumbPosition = useSharedValue(selectedMode === 'signin' ? 0 : 1);
  const signInScale = useSharedValue(1);
  const signUpScale = useSharedValue(1);

  useEffect(() => {
    thumbPosition.value = withTiming(selectedMode === 'signin' ? 0 : 1, {
      duration: 200,
    });
  }, [selectedMode]);

  const thumbAnimatedStyle = useAnimatedStyle(() => {
    // For Sign In (0): left: 2, right: 50%
    // For Sign Up (1): left: 50%, right: 2
    if (thumbPosition.value === 0) {
      return {
        left: 2,
        right: '50%',
      };
    } else {
      return {
        left: '50%',
        right: 2,
      };
    }
  });

  const signInAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: signInScale.value }],
  }));

  const signUpAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: signUpScale.value }],
  }));

  const handleSignInPress = () => {
    if (selectedMode !== 'signin') {
      signInScale.value = withSpring(0.96, { damping: 15 });
      setTimeout(() => {
        signInScale.value = withSpring(1, { damping: 15 });
        onModeChange('signin');
      }, 50);
    }
  };

  const handleSignUpPress = () => {
    if (selectedMode !== 'signup') {
      signUpScale.value = withSpring(0.96, { damping: 15 });
      setTimeout(() => {
        signUpScale.value = withSpring(1, { damping: 15 });
        onModeChange('signup');
      }, 50);
    }
  };

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: glassMorphic,
        borderColor: glassMorphicBorder,
      }
    ]}>
      {/* Animated Thumb */}
      <Animated.View
        style={[
          styles.thumb,
          { backgroundColor: tintColor },
          thumbAnimatedStyle,
        ]}
      />
      
      {/* Sign In Tab */}
      <AnimatedPressable
        style={[styles.tab, signInAnimatedStyle]}
        onPress={handleSignInPress}
        accessibilityRole="tab"
        accessibilityLabel="Sign In"
        accessibilityState={{ selected: selectedMode === 'signin' }}
        accessibilityHint="Switch to sign in mode"
      >
        <Text style={[
          styles.tabText,
          { 
            color: selectedMode === 'signin' ? '#FFFFFF' : `${textColor}70`,
            fontWeight: selectedMode === 'signin' ? '600' : '500',
          }
        ]}>
          Sign In
        </Text>
      </AnimatedPressable>
      
      {/* Sign Up Tab */}
      <AnimatedPressable
        style={[styles.tab, signUpAnimatedStyle]}
        onPress={handleSignUpPress}
        accessibilityRole="tab"
        accessibilityLabel="Sign Up"
        accessibilityState={{ selected: selectedMode === 'signup' }}
        accessibilityHint="Switch to sign up mode"
      >
        <Text style={[
          styles.tabText,
          { 
            color: selectedMode === 'signup' ? '#FFFFFF' : `${textColor}70`,
            fontWeight: selectedMode === 'signup' ? '600' : '500',
          }
        ]}>
          Sign Up
        </Text>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    padding: 2,
    marginBottom: 32,
    position: 'relative',
  },
  thumb: {
    position: 'absolute',
    top: 2,
    height: 36,
    borderRadius: 18,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44, // Accessibility requirement
    zIndex: 1,
  },
  tabText: {
    fontSize: 16,
    letterSpacing: 0.2,
  },
});