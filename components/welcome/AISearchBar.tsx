import { useThemeColor } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface AISearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
}

export function AISearchBar({ 
  placeholder = "What mindset do you want to cultivate?",
  onSearch 
}: AISearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  
  const scaleValue = useSharedValue(1);
  const sparkleRotation = useSharedValue(0);
  
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');

  const handleFocus = () => {
    setIsFocused(true);
    scaleValue.value = withSpring(1.02, { damping: 15, stiffness: 200 });
    
    // Sparkle animation
    sparkleRotation.value = withSequence(
      withTiming(360, { duration: 600 }),
      withTiming(0, { duration: 0 })
    );
  };

  const handleBlur = () => {
    setIsFocused(false);
    scaleValue.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const handleSearch = () => {
    if (query.trim()) {
      onSearch?.(query.trim());
      // Add sparkle animation on search
      sparkleRotation.value = withSequence(
        withTiming(180, { duration: 300 }),
        withTiming(360, { duration: 300 }),
        withTiming(0, { duration: 0 })
      );
    }
  };

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaleValue.value }],
    };
  });

  const animatedSparkleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${sparkleRotation.value}deg` }],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[
        styles.searchContainer, 
        animatedContainerStyle,
        { 
          backgroundColor,
          borderColor: `${tintColor}40`,
          shadowColor: tintColor,
        }
      ]}>
        {/* Sparkle Icon */}
        <Animated.View style={[styles.iconContainer, animatedSparkleStyle]}>
          <Text style={[styles.sparkleIcon, { color: tintColor }]}>✦</Text>
        </Animated.View>

        {/* Search Input */}
        <TextInput
          style={[styles.searchInput, { color: textColor }]}
          placeholder={placeholder}
          placeholderTextColor={`${textColor}80`}
          value={query}
          onChangeText={setQuery}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          multiline={false}
        />

        {/* Search Button */}
        {query.length > 0 && (
          <TouchableOpacity
            style={[styles.searchButton, { backgroundColor: `${tintColor}20` }]}
            onPress={handleSearch}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-forward" size={20} color={tintColor} />
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginVertical: 30,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
  },
  iconContainer: {
    marginRight: 12,
  },
  sparkleIcon: {
    fontSize: 20,
    textShadowOffset: {
      width: 0,
      height: 0,
    },
    textShadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  searchButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  attribution: {
    textAlign: 'center',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 12,
    fontWeight: '400',
  },
  aiName: {
    color: '#FFD700',
    fontWeight: '600',
  },
});