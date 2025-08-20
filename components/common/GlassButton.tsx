import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TouchableOpacityProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface GlassButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  label: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  glow?: boolean;
  style?: ViewStyle;
}

export function GlassButton({
  label,
  iconName,
  glow = false,
  style,
  onPressIn,
  onPressOut,
  ...props
}: GlassButtonProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  
  const glassMorphic = useThemeColor({}, 'glassMorphic');
  const glassMorphicBorder = useThemeColor({}, 'glassMorphicBorder');
  const shadowColor = useThemeColor({}, 'shadowColor');
  const tintColor = useThemeColor({}, 'tint');

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = (event: any) => {
    scale.value = withSpring(0.95, { damping: 15 });
    opacity.value = withTiming(0.8, { duration: 120 });
    onPressIn?.(event);
  };

  const handlePressOut = (event: any) => {
    scale.value = withSpring(1, { damping: 15 });
    opacity.value = withTiming(1, { duration: 120 });
    onPressOut?.(event);
  };

  return (
    <AnimatedTouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: glassMorphic,
          borderColor: glassMorphicBorder,
          shadowColor: glow ? tintColor : shadowColor,
        },
        glow && styles.glowButton,
        animatedStyle,
        style,
      ]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...props}
    >
      {iconName && (
        <Ionicons
          name={iconName}
          size={20}
          color={glow ? '#fff' : tintColor}
          style={styles.icon}
        />
      )}
      <ThemedText
        type="defaultSemiBold"
        style={[
          styles.label,
          { color: glow ? '#fff' : tintColor },
        ]}
      >
        {label}
      </ThemedText>
    </AnimatedTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  glowButton: {
    backgroundColor: '#6C5CE7',
    borderColor: '#8B7EFF',
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  icon: {
    marginRight: 8,
  },
  label: {
    fontSize: 16,
  },
});