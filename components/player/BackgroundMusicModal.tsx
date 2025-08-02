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

type BackgroundMusicModalProps = {
  visible: boolean;
  onClose: () => void;
  currentVolume: number;
  onVolumeChange: (volume: number) => Promise<void> | void;
  selectedSound: string;
  onSoundSelect: (soundId: string) => void;
};

type SoundOption = {
  id: string;
  title: string;
  image: any;
  locked: boolean;
};

const SOUND_OPTIONS: SoundOption[] = [
  {
    id: 'ethereal',
    title: 'Ethereal',
    image: null,
    locked: false,
  },
  {
    id: 'atmospheric',
    title: 'Atmospheric',
    image: null,
    locked: false,
  },
  {
    id: 'amazonian',
    title: 'Amazonian',
    image: null,
    locked: true,
  },
  {
    id: 'blue-beings',
    title: 'Blue Beings',
    image: null,
    locked: true,
  },
];

export const BackgroundMusicModal: React.FC<BackgroundMusicModalProps> = ({
  visible,
  onClose,
  currentVolume,
  onVolumeChange,
  selectedSound,
  onSoundSelect,
}) => {
  const [sliderValue, setSliderValue] = useState(currentVolume);
  const sliderWidth = width - 48; // Modal padding
  const translateX = useSharedValue(currentVolume * sliderWidth);

  // Sync slider with external volume changes
  useEffect(() => {
    setSliderValue(currentVolume);
    translateX.value = currentVolume * sliderWidth;
  }, [currentVolume, sliderWidth, translateX]);

  const handleVolumeChange = async (newValue: number) => {
    const clampedValue = Math.max(0, Math.min(1, newValue));
    setSliderValue(clampedValue);
    try {
      console.log('🔊 Volume slider changed to:', clampedValue);
      await onVolumeChange(clampedValue);
      console.log('✅ Volume changed successfully');
    } catch (error) {
      console.error('❌ Error changing volume:', error);
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

  const renderSoundCard = (sound: SoundOption) => {
    const isSelected = selectedSound === sound.id;
    
    const getCardGradient = (soundId: string): [string, string, string] => {
      switch (soundId) {
        case 'ethereal':
          return ['#8B4513', '#D2691E', '#CD853F'];
        case 'atmospheric':
          return ['#4169E1', '#87CEEB', '#E6E6FA'];
        case 'amazonian':
          return ['#228B22', '#32CD32', '#90EE90'];
        case 'blue-beings':
          return ['#1E90FF', '#4169E1', '#0000CD'];
        default:
          return ['#666', '#888', '#AAA'];
      }
    };

    return (
      <TouchableOpacity
        key={sound.id}
        style={[styles.soundCard, isSelected && styles.selectedCard]}
        onPress={() => !sound.locked && onSoundSelect(sound.id)}
        disabled={sound.locked}
      >
        <LinearGradient
          colors={getCardGradient(sound.id)}
          style={styles.soundImage}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        {sound.locked && (
          <View style={styles.lockOverlay}>
            <Ionicons name="lock-closed" size={24} color="#ffffff" />
          </View>
        )}
        
        <Text style={styles.soundTitle}>{sound.title}</Text>
      </TouchableOpacity>
    );
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
              colors={['#1a1a2e', '#16213e', '#0f3460', '#1a1a2e']}
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
              
              <Text style={styles.headerTitle}>Background Music</Text>
              
              <View style={styles.headerSpacer} />
            </View>

            <View style={styles.sectionsContainer}>
              {/* Sound Selection Grid */}
              <View style={styles.soundGrid}>
                {SOUND_OPTIONS.map(renderSoundCard)}
              </View>

              {/* Volume Control */}
              <View style={styles.volumeSection}>
              <View style={styles.volumeHeader}>
                <Text style={styles.volumeLabel}>Music volume</Text>
                <Text style={styles.volumePercentage}>{Math.round(sliderValue * 100)}%</Text>
              </View>
              
              <View style={styles.sliderContainer}>
                <TouchableOpacity 
                  style={styles.sliderTrack}
                  onPress={(event) => {
                    const { locationX } = event.nativeEvent;
                    const newValue = Math.max(0, Math.min(1, locationX / sliderWidth));
                    console.log('Slider tapped:', { locationX, sliderWidth, newValue });
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
    height: '68%',
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingBottom: 15,
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 50,
  },
  soundGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  soundCard: {
    width: (width - 60) / 2,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  soundImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  soundTitle: {
    padding: 12,
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
    textAlign: 'center',
  },
  volumeSection: {
    paddingBottom: 0,
  },
  volumeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  volumeLabel: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  volumePercentage: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
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