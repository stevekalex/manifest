import { ThemedText, ThemedView } from '@/components/theme/Themed';
import { useAuth } from '@/hooks/useAuth';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { useSettings } from '@/hooks/useSettings';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedGestureHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// Draggable Slider Component
interface DraggableSliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onValueChange: (value: number) => void;
  tintColor: string;
  width?: number;
}

function DraggableSlider({ value, min, max, step, onValueChange, tintColor, width = 200 }: DraggableSliderProps) {
  const translateX = useSharedValue(0);
  const sliderWidth = width - 20; // Full range for thumb center movement (subtract thumb width)
  const [, setLocalValue] = React.useState(value);
  
  // Calculate initial position based on value
  React.useEffect(() => {
    const percentage = (value - min) / (max - min);
    translateX.value = 10 + percentage * sliderWidth; // Start at thumb radius + percentage of range
    setLocalValue(value);
  }, [value, min, max, sliderWidth, translateX]);

  // Debounced update function
  const debouncedUpdate = React.useRef<NodeJS.Timeout>();
  
  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (debouncedUpdate.current) {
        clearTimeout(debouncedUpdate.current);
      }
    };
  }, []);
  
  const updateValue = useCallback((newTranslateX: number, immediate = false) => {
    const adjustedX = newTranslateX - 10; // Subtract thumb radius offset
    const percentage = Math.max(0, Math.min(1, adjustedX / sliderWidth));
    const rawValue = min + percentage * (max - min);
    const steppedValue = Math.round(rawValue / step) * step;
    const clampedValue = Math.max(min, Math.min(max, steppedValue));
    
    // Update local state immediately for UI responsiveness
    setLocalValue(clampedValue);
    
    // Debounce the actual settings update
    if (debouncedUpdate.current) {
      clearTimeout(debouncedUpdate.current);
    }
    
    if (immediate) {
      onValueChange(clampedValue);
    } else {
      debouncedUpdate.current = setTimeout(() => {
        onValueChange(clampedValue);
      }, 150); // 150ms debounce
    }
  }, [min, max, step, sliderWidth, onValueChange]);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, context) => {
      context.startX = translateX.value;
    },
    onActive: (event, context) => {
      const newTranslateX = context.startX + event.translationX;
      const clampedTranslateX = Math.max(10, Math.min(width - 10, newTranslateX)); // Keep thumb within bounds
      translateX.value = clampedTranslateX;
      runOnJS(updateValue)(clampedTranslateX, false); // Not immediate during drag
    },
    onEnd: (event, context) => {
      const newTranslateX = context.startX + event.translationX;
      const clampedTranslateX = Math.max(10, Math.min(width - 10, newTranslateX)); // Keep thumb within bounds
      runOnJS(updateValue)(clampedTranslateX, true); // Immediate on end
    },
  });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value - 10 }], // Subtract radius to center the thumb
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: Math.max(6, translateX.value), // Minimum width of 6px (track height) for visibility
  }));

  return (
    <View style={[styles.sliderContainer, { width }]}>
      <View style={[styles.sliderTrack, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
        <Animated.View style={[styles.sliderProgress, { backgroundColor: tintColor }, progressStyle]} />
      </View>
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[styles.sliderThumb, { backgroundColor: '#fff' }, thumbStyle]}>
          <View style={[styles.sliderThumbInner, { backgroundColor: tintColor }]} />
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
}

// Constants
const SLIDER_WIDTH = 250;
const ICON_SIZE = 24;
const SECTION_MARGIN_BOTTOM = 32;

export default function SettingsScreen() {
  const iconColor = useThemeColor({}, 'icon');
  const glassMorphic = useThemeColor({}, 'glassMorphic');
  const glassMorphicBorder = useThemeColor({}, 'glassMorphicBorder');
  const tintColor = useThemeColor({}, 'tint');

  // Helper function to format slider values consistently
  const formatSliderValue = (value: number, suffix: string): string => {
    return suffix === 's' ? value.toFixed(1) + suffix : Math.round(value) + suffix;
  };

  
  const { signOut, isAuthenticated, user } = useAuth();
  const { signOutFromGoogle } = useGoogleAuth();
  const { 
    settings, 
    isLoading, 
    error, 
    updateSetting, 
    saveSettings, 
    hasUnsavedChanges 
  } = useSettings();

  // Debug: Log auth state when component mounts
  React.useEffect(() => {
    console.log('🔍 [SETTINGS SCREEN DEBUG] Auth state:', {
      isAuthenticated,
      hasUser: !!user,
      userEmail: user?.email,
      userId: user?.id,
      timestamp: new Date().toISOString()
    });
  }, [isAuthenticated, user]);

  // Save settings when leaving the page
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        // This runs when the screen loses focus (user navigates away)
        if (hasUnsavedChanges) {
          console.log('⚙️ [SETTINGS SCREEN DEBUG] Page lost focus, saving changes...');
          console.log('🔍 [SETTINGS SCREEN DEBUG] Pre-save auth state:', {
            isAuthenticated,
            hasUser: !!user,
            userId: user?.id,
            hasUnsavedChanges
          });
          saveSettings().catch(error => {
            console.error('❌ [SETTINGS SCREEN DEBUG] Failed to save settings on page leave:', error);
          });
        }
      };
    }, [hasUnsavedChanges, saveSettings, isAuthenticated, user])
  );

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🚪 Starting sign out process...');
              
              // Navigate first to avoid auth state race conditions
              router.replace('/welcome');
              console.log('✅ Navigated to welcome screen');
              
              // Then sign out from Google if applicable
              await signOutFromGoogle();
              console.log('✅ Google sign out completed');
              
              // Finally sign out from main auth service (clears tokens and state)
              await signOut();
              console.log('✅ Main auth sign out completed');
              
            } catch (error) {
              console.error('❌ Sign out error:', error);
              // Still navigate even if sign out fails
              router.replace('/welcome');
              Alert.alert('Error', 'Failed to sign out completely, but you have been redirected to login.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Show loading or error states
  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>Settings</ThemedText>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={tintColor} />
            <ThemedText style={styles.loadingText}>Loading settings...</ThemedText>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>Settings</ThemedText>
          </View>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
            <ThemedText style={styles.errorText}>Failed to load settings</ThemedText>
            <ThemedText style={styles.errorSubtext}>{error}</ThemedText>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!settings) {
    return null;
  }

  const settingsSections = [
    {
      title: 'Preferences',
      items: [
        {
          icon: 'moon-outline',
          label: 'Dark Mode',
          value: settings.dark_mode,
          onPress: () => updateSetting('dark_mode', !settings.dark_mode),
          isSwitch: true,
        },
        {
          icon: 'notifications-outline',
          label: 'Notifications',
          value: settings.notifications,
          onPress: () => updateSetting('notifications', !settings.notifications),
          isSwitch: true,
        },
      ],
    },
    {
      title: 'Audio',
      items: [
        {
          icon: 'volume-high-outline',
          label: 'Default Volume',
          value: `${settings.default_volume}%`,
          isSlider: true,
          sliderValue: settings.default_volume,
          sliderMin: 0,
          sliderMax: 100,
          sliderStep: 1,
          sliderSuffix: '%',
          onSliderChange: (value: number) => updateSetting('default_volume', Math.round(value)),
        },
        {
          icon: 'timer-outline',
          label: 'Delay Between Affirmations',
          value: `${settings.delay_between_affirmations}s`,
          isSlider: true,
          sliderValue: settings.delay_between_affirmations,
          sliderMin: 0,
          sliderMax: 10,
          sliderStep: 0.5,
          sliderSuffix: 's',
          onSliderChange: (value: number) => updateSetting('delay_between_affirmations', Math.round(value * 2) / 2),
        },
      ],
    },
    {
      title: 'About',
      items: [
        {
          icon: 'information-circle-outline',
          label: 'Version',
          value: '1.0.0',
          onPress: () => {},
        },
        {
          icon: 'document-text-outline',
          label: 'Terms of Service',
          onPress: () => router.push('/terms'),
        },
      ],
    },
  ];

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              Settings
            </ThemedText>
          </View>

          <ScrollView 
            style={styles.content} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
          {settingsSections.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.section}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                {section.title}
              </ThemedText>
              
              <View style={[
                styles.sectionContent,
                { backgroundColor: glassMorphic, borderColor: glassMorphicBorder }
              ]}>
                {section.items.map((item, itemIndex) => (
                  <View
                    key={itemIndex}
                    style={[
                      item.isSlider ? styles.sliderItem : styles.settingItem,
                      itemIndex < section.items.length - 1 && styles.settingItemBorder
                    ]}
                  >
                    {item.isSlider ? (
                      // Slider layout
                      <View style={styles.sliderContainer}>
                        <View style={styles.sliderHeader}>
                          <View style={styles.settingLeft}>
                            <Ionicons name={item.icon as any} size={ICON_SIZE} color={iconColor} />
                            <ThemedText style={styles.settingLabel}>{item.label}</ThemedText>
                          </View>
                          <ThemedText type="caption" style={styles.settingValue}>
                            {formatSliderValue((item as any).sliderValue, (item as any).sliderSuffix)}
                          </ThemedText>
                        </View>
                        <View style={styles.sliderWrapper}>
                          <DraggableSlider
                            value={(item as any).sliderValue}
                            min={(item as any).sliderMin}
                            max={(item as any).sliderMax}
                            step={(item as any).sliderStep}
                            onValueChange={(item as any).onSliderChange}
                            tintColor={tintColor}
                            width={SLIDER_WIDTH}
                          />
                        </View>
                      </View>
                    ) : (
                      // Regular setting layout
                      <TouchableOpacity
                        style={styles.settingContent}
                        onPress={item.onPress}
                        disabled={item.isSwitch}
                      >
                        <View style={styles.settingLeft}>
                          <Ionicons name={item.icon as any} size={ICON_SIZE} color={iconColor} />
                          <ThemedText style={styles.settingLabel}>{item.label}</ThemedText>
                        </View>
                        
                        <View style={styles.settingRight}>
                          {item.isSwitch ? (
                            <Switch
                              value={item.value as boolean}
                              onValueChange={item.onPress}
                              trackColor={{ false: '#767577', true: tintColor }}
                              thumbColor={item.value ? '#f4f3f4' : '#f4f3f4'}
                            />
                          ) : (
                            <>
                              {item.value && (
                                <ThemedText type="caption" style={styles.settingValue}>
                                  {item.value as string}
                                </ThemedText>
                              )}
                              <Ionicons name="chevron-forward" size={20} color={iconColor} />
                            </>
                          )}
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            </View>
          ))}
          
          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.logoutButton, { borderColor: '#FF3B30' }]}
              onPress={handleSignOut}
            >
              <ThemedText style={[styles.logoutText, { color: '#FF3B30' }]}>
                Sign Out
              </ThemedText>
            </TouchableOpacity>
          </View>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    marginBottom: SECTION_MARGIN_BOTTOM,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionContent: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingItem: {
    padding: 16,
    minHeight: 56,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sliderItem: {
    padding: 16,
    minHeight: 80,
    marginBottom: 8,
  },
  sliderContainer: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sliderWrapper: {
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
    position: 'relative',
    width: '100%',
  },
  sliderProgress: {
    height: '100%',
    borderRadius: 3,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  sliderThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    top: 9.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 1,
  },
  sliderThumbInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    marginLeft: 16,
    fontSize: 16,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    marginRight: 8,
    opacity: 0.6,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    paddingBottom: 40,
  },
  logoutButton: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.7,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
});