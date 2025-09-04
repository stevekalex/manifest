import { useThemeColor } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onChangeText?: (query: string) => void;
  autoFocus?: boolean;
}

export function SearchBar({ 
  placeholder = "Search...",
  onSearch,
  onChangeText,
  autoFocus = false
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(autoFocus);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  
  const expandValue = useSharedValue(autoFocus ? 1 : 0);
  const scaleValue = useSharedValue(1);
  
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');

  const handleContainerPress = () => {
    if (!isExpanded) {
      setIsExpanded(true);
      expandValue.value = withSpring(1, { damping: 20, stiffness: 300 });
      // Focus the input after animation starts
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    scaleValue.value = withSpring(1.02, { damping: 15, stiffness: 200 });
  };

  const handleBlur = () => {
    setIsFocused(false);
    scaleValue.value = withSpring(1, { damping: 15, stiffness: 200 });
    
    // If query is empty, collapse the search bar
    if (!query.trim()) {
      setIsExpanded(false);
      expandValue.value = withSpring(0, { damping: 20, stiffness: 300 });
    }
  };

  const handleSearch = () => {
    if (query.trim()) {
      onSearch?.(query.trim());
    }
  };

  const handleClear = () => {
    setQuery('');
    onChangeText?.('');
    inputRef.current?.focus();
  };

  const handleTextChange = (text: string) => {
    setQuery(text);
    onChangeText?.(text);
  };

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaleValue.value }],
    };
  });

  const animatedInputStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(expandValue.value, { duration: 300 }),
      transform: [
        { 
          scaleX: withSpring(expandValue.value, { damping: 20, stiffness: 300 })
        }
      ],
    };
  });

  const animatedPlaceholderStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(1 - expandValue.value, { duration: 200 }),
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[animatedContainerStyle]}>
        <TouchableOpacity
          style={[
            styles.searchContainer,
            { 
              backgroundColor,
              borderColor: isFocused ? `${tintColor}60` : `${tintColor}40`,
              shadowColor: tintColor,
            }
          ]}
          onPress={handleContainerPress}
          activeOpacity={isExpanded ? 1 : 0.8}
        >
          {/* Search Icon */}
          <View style={styles.iconContainer}>
            <Ionicons 
              name="search-outline" 
              size={20} 
              color={isFocused ? tintColor : `${textColor}80`} 
            />
          </View>

          {/* Placeholder text when collapsed */}
          {!isExpanded && (
            <Animated.Text 
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[
                styles.placeholderText, 
                { color: `${textColor}80` },
                animatedPlaceholderStyle
              ]}
            >
              {placeholder}
            </Animated.Text>
          )}

          {/* Search Input when expanded */}
          <Animated.View style={[styles.inputContainer, animatedInputStyle]}>
            <TextInput
              ref={inputRef}
              style={[styles.searchInput, { color: textColor }]}
              placeholder={placeholder}
              placeholderTextColor={`${textColor}60`}
              value={query}
              onChangeText={handleTextChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoFocus={autoFocus}
            />
          </Animated.View>

          {/* Action Buttons */}
          {isExpanded && (
            <View style={styles.actionsContainer}>
              {query.length > 0 && (
                <TouchableOpacity
                  style={[styles.actionButton]}
                  onPress={handleClear}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={18} color={`${textColor}80`} />
                </TouchableOpacity>
              )}
              
              {query.length > 0 && (
                <TouchableOpacity
                  style={[styles.searchButton, { backgroundColor: `${tintColor}20` }]}
                  onPress={handleSearch}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-forward" size={18} color={tintColor} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginVertical: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1.5,
    minHeight: 48,
  },
  iconContainer: {
    marginRight: 12,
  },
  placeholderText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  inputContainer: {
    flex: 1,
    transformOrigin: 'left',
  },
  searchInput: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.3,
    minHeight: 24,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});