import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat, 
  withSequence,
  Easing 
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSimpleTTS } from '../../hooks/useSimpleTTS';
import { useBackgroundAudio } from '../../hooks/useBackgroundAudio';
import { BackgroundMusicModal } from './BackgroundMusicModal';
import { VoiceSettingsModal } from './VoiceSettingsModal';
import { StarField } from './StarField';

const SimpleManifestationPlayerComponent: React.FC = () => {
  const router = useRouter();
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const selectedSoundRef = useRef('ethereal');
  const isChangingSoundRef = useRef(false);
  
  const {
    start: startBackground,
    pause: pauseBackground,
    stop: stopBackground,
    setVolume,
    duckVolume,
    restoreVolume,
    isLoaded: backgroundIsLoaded,
    volume,
    changeSound
  } = useBackgroundAudio('ethereal'); // Fixed initial value to prevent hook recreation
  
  const { 
    isPlaying,
    startPlaying, 
    pausePlaying,
    stopPlaying, 
    getCurrentAffirmation,
    setVoiceSettings,
    selectedVoice,
    voiceVolume,
    affirmationDelay,
    remainingDelay
  } = useSimpleTTS(duckVolume, restoreVolume);

  // Animation values for swipe up effect
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const breatheScale = useSharedValue(1);
  
  // Use state for displayed text (cleaner than refs)
  const [displayedText, setDisplayedText] = useState(getCurrentAffirmation());
  
  // Start gentle breathing pulse when playing (keep this - it's great!)
  useEffect(() => {
    if (isPlaying) {
      breatheScale.value = withRepeat(
        withSequence(
          withTiming(1.015, { 
            duration: 2000, 
            easing: Easing.inOut(Easing.sin) 
          }),
          withTiming(1, { 
            duration: 2000, 
            easing: Easing.inOut(Easing.sin) 
          })
        ),
        -1,
        false
      );
    } else {
      breatheScale.value = withTiming(1, { duration: 500 });
    }
  }, [isPlaying]);

  // Listen to currentIndex changes (more reliable than text changes)
  useEffect(() => {
    const newText = getCurrentAffirmation();
    
    // If text is different, animate the transition
    if (displayedText !== newText) {
      // Slide current text up and out (higher!)
      translateY.value = withTiming(-150, {
        duration: 400,
        easing: Easing.in(Easing.quad)
      });
      opacity.value = withTiming(0, {
        duration: 300,
        easing: Easing.in(Easing.quad)
      });
      
      // After exit animation, update text and slide new one in
      setTimeout(() => {
        setDisplayedText(newText);
        translateY.value = 150; // Position lower below screen (no animation)
        
        // Slide new text up into view
        translateY.value = withTiming(0, {
          duration: 500,
          easing: Easing.out(Easing.quad)
        });
        opacity.value = withTiming(1, {
          duration: 400,
          easing: Easing.out(Easing.quad)
        });
      }, 400); // Match exit animation duration
    }
  }, [getCurrentAffirmation(), displayedText]);

  // Animated styles
  const animatedTextStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateY: translateY.value },
        { scale: breatheScale.value }
      ],
    };
  });

  const handleBack = () => {
    stopPlaying();
    stopBackground();
    router.back();
  };

  // Handle sound selection via changeSound function instead of state
  const handleSoundSelect = useCallback(async (newSound: string) => {
    console.log('🎵 Changing sound to:', newSound);
    selectedSoundRef.current = newSound;
    isChangingSoundRef.current = true;
    
    try {
      await changeSound(newSound as any);
      console.log('🎵 Sound change completed');
      isChangingSoundRef.current = false;
      // Remove the duplicate restart logic - let the hook handle it
    } catch (error) {
      console.error('🎵 Sound change failed:', error);
      isChangingSoundRef.current = false;
    }
  }, [changeSound]);

  // Auto-start TTS only once when component mounts
  useEffect(() => {
    if (!hasStartedPlaying) {
      console.log('Starting TTS for the first time');
      startPlaying();
      setHasStartedPlaying(true);
    }
  }, [hasStartedPlaying, startPlaying]);

  // Start background music as soon as it's loaded, but only if TTS is playing and not changing sounds
  useEffect(() => {
    if (backgroundIsLoaded && isPlaying && hasStartedPlaying && !isChangingSoundRef.current) {
      console.log('Starting background music');
      startBackground();
    }
  }, [backgroundIsLoaded, isPlaying, hasStartedPlaying, startBackground]);


  const handlePlayPause = () => {
    if (isPlaying) {
      // Pause both TTS and background music
      pausePlaying();
      pauseBackground();
    } else {
      // Start both TTS and background music together
      if (backgroundIsLoaded) {
        startBackground();
      }
      startPlaying();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      <LinearGradient
        colors={['#F2F2F2', '#C8D5E3', '#E8DFF5', '#C8D5E3']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Starry Background Animation */}
      <StarField />
      
      <SafeAreaView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#1A252F" />
          </TouchableOpacity>
          
          <Text style={styles.title}>Believe In Yourself</Text>
          
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="infinite-outline" size={24} color="#1A252F" />
          </TouchableOpacity>
        </View>
        
        {/* Affirmation Display */}
        <View style={styles.centerContent}>
          <Animated.Text style={[styles.affirmationText, animatedTextStyle]}>
            {displayedText}
          </Animated.Text>
          
        </View>
        
        {/* Secondary Controls */}
        <View style={styles.secondaryControls}>
          <TouchableOpacity style={styles.controlButton}>
            <Ionicons name="shuffle" size={24} color="#6C5CE7" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.controlButton}>
            <Ionicons name="add" size={24} color="#6C5CE7" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.controlButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#6C5CE7" />
          </TouchableOpacity>
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          <TouchableOpacity 
            style={styles.bottomControlButton}
            onPress={() => setShowVoiceModal(true)}
          >
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={24} color="#6C5CE7" />
            </View>
            <Text style={styles.controlLabel}>Voice</Text>
          </TouchableOpacity>
          
          {/* Play/Pause Button */}
          <TouchableOpacity 
            onPress={handlePlayPause} 
            style={styles.centerPlayButton}
          >
            <Ionicons 
              name={isPlaying ? "pause" : "play"} 
              size={32} 
              color="#1A252F" 
              style={!isPlaying ? { marginLeft: 3 } : {}}
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.bottomControlButton}
            onPress={() => setShowMusicModal(true)}
          >
            <View style={styles.musicAvatarCircle}>
              <Ionicons name="musical-notes" size={24} color="#6C5CE7" />
            </View>
            <Text style={styles.controlLabel}>Music</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      
      <BackgroundMusicModal
        visible={showMusicModal}
        onClose={() => setShowMusicModal(false)}
        currentVolume={volume}
        onVolumeChange={(newVolume) => {
          console.log('📢 Modal requesting volume change to:', newVolume);
          setVolume(newVolume);
        }}
        selectedSound={selectedSoundRef.current}
        onSoundSelect={handleSoundSelect}
      />
      
      <VoiceSettingsModal
        visible={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        currentVolume={voiceVolume}
        onVolumeChange={(newVolume) => {
          console.log('🎤 Voice volume change to:', newVolume);
          setVoiceSettings(selectedVoice, newVolume, affirmationDelay);
        }}
        selectedVoice={selectedVoice}
        onVoiceSelect={(voiceId) => {
          console.log('🎤 Voice selection change to:', voiceId);
          const wasPlaying = isPlaying;
          
          // Stop current speech to apply new voice immediately
          if (wasPlaying) {
            pausePlaying();
          }
          
          // Update voice settings
          setVoiceSettings(voiceId, voiceVolume, affirmationDelay);
          
          // Restart with new voice if it was playing
          if (wasPlaying) {
            // Small delay to ensure voice settings are applied
            setTimeout(() => {
              startPlaying();
            }, 100);
          }
        }}
        affirmationDelay={affirmationDelay}
        onDelayChange={(delay) => {
          console.log('⏱️ Affirmation delay change to:', delay);
          setVoiceSettings(selectedVoice, voiceVolume, delay);
        }}
      />
    </View>
  );
};

SimpleManifestationPlayerComponent.displayName = 'SimpleManifestationPlayer';

export const SimpleManifestationPlayer = React.memo(SimpleManifestationPlayerComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 20
  },
  backButton: {
    padding: 8,
    marginLeft: -8
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    letterSpacing: 0.5
  },
  menuButton: {
    padding: 8,
    marginRight: -8
  },
  secondaryControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
    marginBottom: 30,
    marginTop: -40,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  affirmationText: {
    fontSize: 28,
    fontWeight: '500',
    color: '#2C3E50',
    textAlign: 'center',
    lineHeight: 42,
    textShadowColor: 'rgba(44, 62, 80, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
    marginBottom: 20
  },
  progressText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 20,
    gap: 20,
  },
  bottomControlButton: {
    alignItems: 'center',
  },
  avatarCircle: {
    width: 100,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(108, 92, 231, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  musicAvatarCircle: {
    width: 100,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(108, 92, 231, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  centerPlayButton: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(108, 92, 231, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  controlLabel: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '500',
  },
  countdownText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '500',
  },
  playButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 40,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  }
});