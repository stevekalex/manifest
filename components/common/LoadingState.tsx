import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useEffect } from 'react';

const { width: screenWidth } = Dimensions.get('window');

interface LoadingStateProps {
  itemCount?: number;
}

export function LoadingState({ itemCount = 3 }: LoadingStateProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0.3, { duration: 1000 })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.container}>
      {Array.from({ length: itemCount }).map((_, index) => (
        <Animated.View 
          key={index} 
          style={[
            styles.skeleton, 
            animatedStyle,
            { backgroundColor: colors.glassMorphic }
          ]}
        >
          <View style={styles.skeletonContent}>
            <View style={[styles.skeletonTitle, { backgroundColor: colors.glassMorphicBorder }]} />
            <View style={[styles.skeletonDescription, { backgroundColor: colors.glassMorphicBorder }]} />
            <View style={[styles.skeletonMeta, { backgroundColor: colors.glassMorphicBorder }]} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  skeleton: {
    width: screenWidth - 40,
    height: 200,
    borderRadius: 20,
    marginVertical: 10,
    padding: 20,
    justifyContent: 'flex-end',
  },
  skeletonContent: {
    gap: 12,
  },
  skeletonTitle: {
    height: 28,
    width: '70%',
    borderRadius: 8,
  },
  skeletonDescription: {
    height: 20,
    width: '90%',
    borderRadius: 6,
  },
  skeletonMeta: {
    height: 16,
    width: '40%',
    borderRadius: 4,
    marginTop: 4,
  },
});