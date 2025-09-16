import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useThemeColor } from '@/hooks/useThemeColor';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ProviderType = 'apple' | 'google' | 'email';

interface ProviderButtonProps {
  provider: ProviderType;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  isExpanded?: boolean;
}

const getProviderConfig = (provider: ProviderType) => {
  switch (provider) {
    case 'apple':
      return {
        label: 'Continue with Apple',
        icon: 'logo-apple' as const,
        colors: {
          background: '#000000',
          text: '#FFFFFF',
          border: '#000000',
        },
      };
    case 'google':
      return {
        label: 'Continue with Google',
        icon: 'logo-google' as const,
        colors: {
          background: '#FFFFFF',
          text: '#1F1F1F',
          border: '#E0E0E0',
        },
      };
    case 'email':
      return {
        label: 'Continue with Email',
        icon: 'mail-outline' as const,
        colors: {
          background: 'transparent',
          text: null, // Will use theme color
          border: null, // Will use theme color
        },
      };
  }
};

export function ProviderButton({
  provider,
  onPress,
  loading = false,
  disabled = false,
  isExpanded = false,
}: ProviderButtonProps) {
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const glassMorphic = useThemeColor({}, 'glassMorphic');
  
  const config = getProviderConfig(provider);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const getButtonStyle = () => {
    const baseStyle = [styles.button];
    
    switch (provider) {
      case 'apple':
        return [
          ...baseStyle,
          {
            backgroundColor: config.colors.background,
            borderColor: config.colors.border,
          },
        ];
      case 'google':
        return [
          ...baseStyle,
          {
            backgroundColor: config.colors.background,
            borderColor: config.colors.border,
            borderWidth: 1,
          },
        ];
      case 'email':
        return [
          ...baseStyle,
          styles.emailButton,
          {
            backgroundColor: glassMorphic,
            borderColor: tintColor,
            borderWidth: 1,
          },
        ];
    }
  };

  const getTextStyle = () => {
    switch (provider) {
      case 'apple':
        return [styles.buttonText, { color: config.colors.text }];
      case 'google':
        return [styles.buttonText, { color: config.colors.text }];
      case 'email':
        return [styles.buttonText, { color: textColor }];
    }
  };

  const getIconColor = () => {
    switch (provider) {
      case 'apple':
        return config.colors.text;
      case 'google':
        return '#4285F4';
      case 'email':
        return tintColor;
    }
  };

  const displayLabel = isExpanded && provider === 'email' 
    ? 'Hide email sign-in' 
    : config.label;

  return (
    <AnimatedPressable
      style={[getButtonStyle(), animatedStyle, (disabled || loading) && styles.disabled]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={config.label}
      accessibilityState={{ disabled: disabled || loading }}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          {loading ? (
            <ActivityIndicator 
              size="small" 
              color={provider === 'apple' ? '#FFFFFF' : tintColor} 
            />
          ) : (
            <Ionicons 
              name={config.icon} 
              size={20} 
              color={getIconColor()} 
            />
          )}
        </View>
        
        <Text style={getTextStyle()}>
          {loading ? 'Loading...' : displayLabel}
        </Text>
        
        {provider === 'email' && (
          <View style={styles.expandIcon}>
            <Ionicons 
              name={isExpanded ? 'chevron-up' : 'chevron-down'} 
              size={16} 
              color={tintColor} 
            />
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emailButton: {
    borderStyle: 'solid',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginLeft: -36, // Compensate for icon width to center text
  },
  expandIcon: {
    width: 24,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
});