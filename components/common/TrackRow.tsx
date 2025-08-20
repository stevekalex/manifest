import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  View,
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

interface TrackRowProps extends Omit<TouchableOpacityProps, 'style'> {
  title: string;
  durationSec?: number;
  onPreviewPress: () => void;
  onMenuPress: () => void;
}

export function TrackRow({
  title,
  durationSec,
  onPreviewPress,
  onMenuPress,
  onPressIn,
  onPressOut,
  ...props
}: TrackRowProps) {
  const scale = useSharedValue(1);
  
  const glassMorphic = useThemeColor({}, 'glassMorphic');
  const glassMorphicBorder = useThemeColor({}, 'glassMorphicBorder');
  const shadowColor = useThemeColor({}, 'shadowColor');
  const tintColor = useThemeColor({}, 'tint');

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (event: any) => {
    scale.value = withSpring(0.98, { damping: 15 });
    onPressIn?.(event);
  };

  const handlePressOut = (event: any) => {
    scale.value = withSpring(1, { damping: 15 });
    onPressOut?.(event);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatedTouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: glassMorphic,
          borderColor: glassMorphicBorder,
          shadowColor,
        },
        animatedStyle,
      ]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...props}
    >
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <ThemedText numberOfLines={2} style={styles.title}>
            {title}
          </ThemedText>
          {durationSec && (
            <ThemedText type="caption" style={styles.duration}>
              {formatDuration(durationSec)}
            </ThemedText>
          )}
        </View>
        
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onPreviewPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="volume-high-outline" size={20} color={tintColor} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onMenuPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="ellipsis-vertical" size={16} color={tintColor} />
          </TouchableOpacity>
        </View>
      </View>
    </AnimatedTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  duration: {
    opacity: 0.7,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginLeft: 16,
    padding: 4,
  },
});