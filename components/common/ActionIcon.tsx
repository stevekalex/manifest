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
} from 'react-native-reanimated';
import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface ActionIconProps extends Omit<TouchableOpacityProps, 'style'> {
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  style?: ViewStyle;
}

export function ActionIcon({
  iconName,
  label,
  style,
  onPressIn,
  onPressOut,
  ...props
}: ActionIconProps) {
  const scale = useSharedValue(1);
  
  const glassMorphic = useThemeColor({}, 'glassMorphic');
  const glassMorphicBorder = useThemeColor({}, 'glassMorphicBorder');
  const shadowColor = useThemeColor({}, 'shadowColor');
  const tintColor = useThemeColor({}, 'tint');

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (event: any) => {
    scale.value = withSpring(0.9, { damping: 15 });
    onPressIn?.(event);
  };

  const handlePressOut = (event: any) => {
    scale.value = withSpring(1, { damping: 15 });
    onPressOut?.(event);
  };

  return (
    <AnimatedTouchableOpacity
      style={[animatedStyle, style]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...props}
    >
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: glassMorphic,
            borderColor: glassMorphicBorder,
            shadowColor,
          },
        ]}
      >
        <Ionicons name={iconName} size={20} color={tintColor} />
      </Animated.View>
      <ThemedText type="caption" style={styles.label}>
        {label}
      </ThemedText>
    </AnimatedTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 4,
  },
  label: {
    textAlign: 'center',
    fontSize: 11,
  },
});