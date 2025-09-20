import { useThemeColor } from '@/hooks/useThemeColor';
import React, { useEffect, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type AuthMode = 'signin' | 'signup';

interface SegmentedControlProps {
  selectedMode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
}

export function SegmentedControl({ selectedMode, onModeChange }: SegmentedControlProps) {
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  
  const [containerWidth, setContainerWidth] = useState(0);
  const thumbPosition = useSharedValue(selectedMode === 'signin' ? 0 : 1);
  const signInScale = useSharedValue(1);
  const signUpScale = useSharedValue(1);

  // Update thumb position when selectedMode changes
  useEffect(() => {
    thumbPosition.value = withSpring(selectedMode === 'signin' ? 0 : 1, {
      damping: 20,
      stiffness: 300,
    });
  }, [selectedMode, thumbPosition]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth(width);
  };

  const thumbAnimatedStyle = useAnimatedStyle(() => {
    const thumbWidth = (containerWidth - 8) / 2; // Account for padding
    const translateX = thumbPosition.value * thumbWidth;
    
    return {
      transform: [{ translateX }],
    };
  });

  const signInAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: signInScale.value }],
  }));

  const signUpAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: signUpScale.value }],
  }));

  const handlePress = (mode: AuthMode) => {
    if (selectedMode !== mode) {
      // Animate the button press
      if (mode === 'signin') {
        signInScale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
        setTimeout(() => {
          signInScale.value = withSpring(1, { damping: 15, stiffness: 400 });
        }, 100);
      } else {
        signUpScale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
        setTimeout(() => {
          signUpScale.value = withSpring(1, { damping: 15, stiffness: 400 });
        }, 100);
      }
      
      // Call the mode change
      onModeChange(mode);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: `${textColor}08` }]} onLayout={onLayout}>
      {/* Animated thumb */}
      <Animated.View 
        style={[
          styles.thumb,
          thumbAnimatedStyle,
          { 
            backgroundColor: tintColor,
            width: containerWidth > 0 ? (containerWidth - 8) / 2 : '48%',
          }
        ]} 
      />
      
      {/* Sign In Button */}
      <AnimatedPressable
        style={[styles.tab, signInAnimatedStyle]}
        onPress={() => handlePress('signin')}
        accessibilityRole="button"
        accessibilityLabel="Sign In"
        accessibilityState={{ selected: selectedMode === 'signin' }}
      >
        <Text style={[
          styles.tabText,
          { 
            color: selectedMode === 'signin' ? '#FFFFFF' : textColor,
            fontWeight: selectedMode === 'signin' ? '600' : '500',
          }
        ]}>
          Sign In
        </Text>
      </AnimatedPressable>
      
      {/* Sign Up Button */}
      <AnimatedPressable
        style={[styles.tab, signUpAnimatedStyle]}
        onPress={() => handlePress('signup')}
        accessibilityRole="button"
        accessibilityLabel="Sign Up"
        accessibilityState={{ selected: selectedMode === 'signup' }}
      >
        <Text style={[
          styles.tabText,
          { 
            color: selectedMode === 'signup' ? '#FFFFFF' : textColor,
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
    height: 48,
    borderRadius: 24,
    padding: 4,
    marginBottom: 32,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  thumb: {
    position: 'absolute',
    top: 4,
    left: 4,
    height: 40,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    minHeight: 48,
    zIndex: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    paddingBottom: 8,
    letterSpacing: 0.2,
  },
});