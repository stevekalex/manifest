import React, { useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Dimensions } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ThemedText, ThemedView } from '@/components/theme/Themed';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const { width: screenWidth } = Dimensions.get('window');

interface StateHandlerProps {
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  children?: React.ReactNode;
  loadingItemCount?: number;
}

export function StateHandler({ 
  loading = false, 
  error = null, 
  onRetry, 
  children,
  loadingItemCount = 3 
}: StateHandlerProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    if (loading) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000 }),
          withTiming(0.3, { duration: 1000 })
        ),
        -1,
        false
      );
    }
  }, [loading, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Show loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        {Array.from({ length: loadingItemCount }).map((_, index) => (
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

  // Show error state
  if (error) {
    return (
      <ThemedView style={styles.errorContainer}>
        <View style={styles.errorContent}>
          <Ionicons 
            name="alert-circle-outline" 
            size={64} 
            color={colors.icon} 
            style={styles.errorIcon}
          />
          
          <ThemedText type="subtitle" style={styles.errorTitle}>
            Oops!
          </ThemedText>
          
          <ThemedText type="default" style={styles.errorMessage}>
            {error}
          </ThemedText>

          {onRetry && (
            <TouchableOpacity 
              style={[styles.retryButton, { backgroundColor: colors.tint }]}
              onPress={onRetry}
              activeOpacity={0.8}
            >
              <ThemedText type="defaultSemiBold" style={styles.retryText}>
                Try Again
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </ThemedView>
    );
  }

  // Show content
  return <>{children}</>;
}

const styles = StyleSheet.create({
  // Loading styles
  loadingContainer: {
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
  
  // Error styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  errorIcon: {
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    marginBottom: 10,
    textAlign: 'center',
  },
  errorMessage: {
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
    opacity: 0.8,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 120,
    minHeight: 44,
  },
  retryText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
  },
});