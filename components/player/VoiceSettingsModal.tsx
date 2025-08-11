import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Modal, 
  Pressable,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

type VoiceSettingsModalProps = {
  visible: boolean;
  onClose: () => void;
  currentVolume: number;
  onVolumeChange: (volume: number) => Promise<void> | void;
  selectedVoice: string;
  onVoiceSelect: (voiceId: string) => void;
  affirmationDelay: number;
  onDelayChange: (delay: number) => void;
};

type VoiceOption = {
  id: string;
  name: string;
  gender: 'male' | 'female';
  locked: boolean;
};

const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: 'serenity',
    name: 'Serenity',
    gender: 'female',
    locked: false,
  },
  {
    id: 'titan',
    name: 'Titan',
    gender: 'male',
    locked: false,
  },
  {
    id: 'whisper',
    name: 'Whisper',
    gender: 'female',
    locked: false,
  },
  {
    id: 'sage',
    name: 'Sage',
    gender: 'male',
    locked: false,
  },
  {
    id: 'aurora',
    name: 'Aurora',
    gender: 'female',
    locked: true,
  },
  {
    id: 'thunder',
    name: 'Thunder',
    gender: 'male',
    locked: true,
  },
  {
    id: 'crystal',
    name: 'Crystal',
    gender: 'female',
    locked: true,
  },
  {
    id: 'mystic',
    name: 'Mystic',
    gender: 'male',
    locked: true,
  },
  {
    id: 'harmony',
    name: 'Harmony',
    gender: 'female',
    locked: true,
  },
  {
    id: 'echo',
    name: 'Echo',
    gender: 'male',
    locked: true,
  },
];

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  visible,
  onClose,
  currentVolume,
  onVolumeChange,
  selectedVoice,
  onVoiceSelect,
  affirmationDelay,
  onDelayChange,
}) => {
  const [sliderValue, setSliderValue] = useState(currentVolume);
  const [, setDelaySliderValue] = useState(affirmationDelay / 1000); // Convert ms to seconds
  const sliderWidth = width - 48; // Modal padding
  const translateX = useSharedValue(currentVolume * sliderWidth);
  const delayTranslateX = useSharedValue((affirmationDelay / 15000) * sliderWidth); // 0-15s range

  // Sync sliders with external changes
  useEffect(() => {
    setSliderValue(currentVolume);
    translateX.value = currentVolume * sliderWidth;
  }, [currentVolume, sliderWidth, translateX]);

  useEffect(() => {
    const delayInSeconds = affirmationDelay / 1000;
    console.log('🔧 [DELAY-SYNC] useEffect syncing delay slider:', {
      affirmationDelay,
      delayInSeconds,
      sliderWidth,
      newTranslateX: (delayInSeconds / 15) * sliderWidth
    });
    setDelaySliderValue(delayInSeconds);
    delayTranslateX.value = (delayInSeconds / 15) * sliderWidth;
  }, [affirmationDelay, sliderWidth, delayTranslateX]);

  const handleVolumeChange = async (newValue: number) => {
    const clampedValue = Math.max(0, Math.min(1, newValue));
    setSliderValue(clampedValue);
    try {
      console.log('🔊 Voice volume slider changed to:', clampedValue);
      await onVolumeChange(clampedValue);
      console.log('✅ Voice volume changed successfully');
    } catch (error) {
      console.error('❌ Error changing voice volume:', error);
    }
  };

  const handleDelayChange = async (newValue: number) => {
    const delayInSeconds = Math.max(0, Math.min(15, newValue));
    const delayInMs = delayInSeconds * 1000;
    console.log('🔧 [DELAY-SLIDER] handleDelayChange called:', {
      inputValue: newValue,
      clampedSeconds: delayInSeconds,
      delayInMs: delayInMs,
      currentAffirmationDelay: affirmationDelay
    });
    setDelaySliderValue(delayInSeconds);
    try {
      console.log('⏱️ Delay slider changed to:', delayInSeconds, 'seconds');
      onDelayChange(delayInMs);
      console.log('✅ Delay changed successfully');
    } catch (error) {
      console.error('❌ Error changing delay:', error);
    }
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      // Store initial position
    })
    .onUpdate((event) => {
      const newX = Math.max(0, Math.min(sliderWidth, event.absoluteX - 24)); // Account for modal padding
      translateX.value = newX;
      const newValue = newX / sliderWidth;
      runOnJS(setSliderValue)(newValue);
    })
    .onEnd(() => {
      const newValue = translateX.value / sliderWidth;
      runOnJS(handleVolumeChange)(newValue);
    });

  const delayPanGesture = Gesture.Pan()
    .onStart(() => {
      // Store initial position
    })
    .onUpdate((event) => {
      const newX = Math.max(0, Math.min(sliderWidth, event.absoluteX - 24)); // Account for modal padding
      delayTranslateX.value = newX;
      const newValue = (newX / sliderWidth) * 15; // 0-15 seconds
      runOnJS(setDelaySliderValue)(newValue);
    })
    .onEnd(() => {
      const newValue = (delayTranslateX.value / sliderWidth) * 15;
      runOnJS(handleDelayChange)(newValue);
    });

  const thumbAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const fillAnimatedStyle = useAnimatedStyle(() => {
    return {
      width: translateX.value,
    };
  });

  const delayThumbAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: delayTranslateX.value }],
    };
  });

  const delayFillAnimatedStyle = useAnimatedStyle(() => {
    return {
      width: delayTranslateX.value,
    };
  });

  const renderVoiceCard = (voice: VoiceOption) => {
    const isSelected = selectedVoice === voice.id;
    
    const getAvatarGradient = (voiceId: string, gender: 'male' | 'female'): [string, string, string] => {
      if (gender === 'female') {
        switch (voiceId) {
          case 'serenity':
            return ['#E8DFF5', '#C8D5E3', '#6C5CE7']; // Pale Lilac to Misty Blue to Rich Purple
          case 'whisper':
            return ['#F2F2F2', '#E8DFF5', '#B19CD9']; // Pearl White to Pale Lilac to Light Purple
          case 'aurora':
            return ['#B19CD9', '#C8D5E3', '#E8DFF5']; // Light Purple to Misty Blue to Pale Lilac
          case 'crystal':
            return ['#C8D5E3', '#6C5CE7', '#E8DFF5']; // Misty Blue to Rich Purple to Pale Lilac
          case 'harmony':
            return ['#E8DFF5', '#6C5CE7', '#B19CD9']; // Pale Lilac to Rich Purple to Light Purple
          default:
            return ['#E8DFF5', '#C8D5E3', '#6C5CE7'];
        }
      } else {
        switch (voiceId) {
          case 'titan':
            return ['#1A252F', '#6C5CE7', '#C8D5E3']; // Deep Navy to Rich Purple to Misty Blue
          case 'sage':
            return ['#6C5CE7', '#C8D5E3', '#E8DFF5']; // Rich Purple to Misty Blue to Pale Lilac
          case 'thunder':
            return ['#1A252F', '#6C5CE7', '#B19CD9']; // Deep Navy to Rich Purple to Light Purple
          case 'mystic':
            return ['#6C5CE7', '#1A252F', '#C8D5E3']; // Rich Purple to Deep Navy to Misty Blue
          case 'echo':
            return ['#B19CD9', '#C8D5E3', '#F2F2F2']; // Light Purple to Misty Blue to Pearl White
          default:
            return ['#1A252F', '#6C5CE7', '#C8D5E3'];
        }
      }
    };

    return (
      <TouchableOpacity
        key={voice.id}
        style={[styles.voiceCard, isSelected && styles.selectedCard]}
        onPress={() => !voice.locked && onVoiceSelect(voice.id)}
        disabled={voice.locked}
      >
        <View style={[styles.avatarContainer, isSelected && styles.selectedAvatarContainer]}>
          <LinearGradient
            colors={getAvatarGradient(voice.id, voice.gender)}
            style={styles.voiceAvatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.avatarInitial}>
              {voice.name.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
        </View>
        
        {voice.locked && (
          <View style={styles.lockOverlay}>
            <View style={styles.lockIconContainer}>
              <Ionicons name="lock-closed" size={18} color="#ffffff" />
            </View>
          </View>
        )}
        
        <Text style={styles.voiceName}>{voice.name}</Text>
      </TouchableOpacity>
    );
  };

  const formatDelayDisplay = (delayMs: number) => {
    // Handle undefined/null values and ensure we have a valid number
    const validDelayMs = typeof delayMs === 'number' && !isNaN(delayMs) ? delayMs : 0;
    const seconds = Math.max(0, Math.round(validDelayMs / 1000));
    return `${seconds}s`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
            <LinearGradient
              colors={['#F2F2F2', '#C8D5E3', '#E8DFF5', '#C8D5E3']}
              style={styles.modalBackground}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            
            <SafeAreaView style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
              
              <Text style={styles.headerTitle}>Voice settings</Text>
              
              <View style={styles.headerSpacer} />
            </View>

            <View style={styles.sectionsContainer}>
              {/* Voice Selection Grid */}
              <View style={styles.voiceGrid}>
                {VOICE_OPTIONS.map(renderVoiceCard)}
              </View>

              {/* Affirmation Delay */}
              <View style={styles.delaySection}>
              <View style={styles.delayHeader}>
                <Text style={styles.delayLabel}>Affirmation Delay</Text>
                <Text style={styles.delayValue}>{formatDelayDisplay(affirmationDelay)}</Text>
              </View>
              
              <View style={styles.sliderContainer}>
                <TouchableOpacity 
                  style={styles.sliderTrack}
                  onPress={(event) => {
                    const { locationX } = event.nativeEvent;
                    const newValue = Math.max(0, Math.min(15, (locationX / sliderWidth) * 15));
                    console.log('Delay slider tapped:', { locationX, sliderWidth, newValue });
                    delayTranslateX.value = locationX;
                    handleDelayChange(newValue);
                  }}
                  activeOpacity={0.8}
                >
                  <Animated.View 
                    style={[styles.sliderFill, delayFillAnimatedStyle]} 
                  />
                  <GestureDetector gesture={delayPanGesture}>
                    <Animated.View 
                      style={[styles.sliderThumb, delayThumbAnimatedStyle]}
                    />
                  </GestureDetector>
                </TouchableOpacity>
              </View>
            </View>

              {/* Voice Volume Control */}
              <View style={styles.volumeSection}>
              <View style={styles.volumeHeader}>
                <Text style={styles.volumeLabel}>Voice volume</Text>
                <Text style={styles.volumePercentage}>{Math.round(sliderValue * 100)}%</Text>
              </View>
              
              <View style={styles.sliderContainer}>
                <TouchableOpacity 
                  style={styles.sliderTrack}
                  onPress={(event) => {
                    const { locationX } = event.nativeEvent;
                    const newValue = Math.max(0, Math.min(1, locationX / sliderWidth));
                    console.log('Voice volume slider tapped:', { locationX, sliderWidth, newValue });
                    translateX.value = locationX;
                    handleVolumeChange(newValue);
                  }}
                  activeOpacity={0.8}
                >
                  <Animated.View 
                    style={[styles.sliderFill, fillAnimatedStyle]} 
                  />
                  <GestureDetector gesture={panGesture}>
                    <Animated.View 
                      style={[styles.sliderThumb, thumbAnimatedStyle]}
                    />
                  </GestureDetector>
                </TouchableOpacity>
              </View>
            </View>
            </View>
          </SafeAreaView>
          </Pressable>
        </Pressable>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  modalBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionsContainer: {
    flex: 1,
    justifyContent: 'space-evenly',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingBottom: 0,
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 16,
    color: '#1A252F',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 50,
  },
  voiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  voiceCard: {
    width: (width - 60) / 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  selectedCard: {
    // Selection styling handled by avatarContainer
  },
  avatarContainer: {
    borderRadius: 32,
    padding: 2,
  },
  selectedAvatarContainer: {
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 6,
  },
  voiceAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
  },
  lockOverlay: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIconContainer: {
    backgroundColor: '#6366F1',
    borderRadius: 18,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  lockText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2C3E50',
    letterSpacing: 0.5,
  },
  voiceName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2C3E50',
    textAlign: 'center',
  },
  delaySection: {
  },
  delayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  delayLabel: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '500',
  },
  delayValue: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '500',
  },
  delayControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 16,
  },
  delayButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  delayDisplay: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 8,
    minWidth: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  volumeSection: {
  },
  volumeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  volumeLabel: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '500',
  },
  volumePercentage: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '500',
  },
  sliderContainer: {
    paddingHorizontal: 4,
  },
  sliderTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    position: 'relative',
  },
  sliderFill: {
    height: 6,
    backgroundColor: '#ffffff',
    borderRadius: 3,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  sliderThumb: {
    width: 20,
    height: 20,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    position: 'absolute',
    top: -7,
    left: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});