import React, { useEffect, useState, useRef } from 'react';
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
import { BackgroundMusicModal } from './BackgroundMusicModal';
import { VoiceSettingsModal } from './VoiceSettingsModal';
import { StarField } from './StarField';
import { PRODUCTION_PLAYLIST } from '../../data/productionPlaylist';
import { useAudioSystem } from '../../hooks/useAudioSystem';

const SimpleManifestationPlayerComponent: React.FC = () => {
  const router = useRouter();
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const [selectedSound, setSelectedSound] = useState('ethereal');

  // New machine-backed audio system
  const audio = useAudioSystem();

  // Animation values for swipe up effect
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const breatheScale = useSharedValue(1);

  // Text to display based on currentTrackIndex from machine/store
  const currentAffirmationText = PRODUCTION_PLAYLIST.affirmations[audio.currentTrackIndex]?.text
    || PRODUCTION_PLAYLIST.affirmations[0]?.text
    || 'Loading affirmation...';
  const [displayedText, setDisplayedText] = useState(currentAffirmationText);

  // Start gentle breathing pulse when playing
  useEffect(() => {
    if (audio.isPlaying) {
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
  }, [audio.isPlaying]);

  // Animate on currentTrackIndex/text change
  useEffect(() => {
    const newText = currentAffirmationText;
    if (displayedText !== newText) {
      translateY.value = withTiming(-150, { duration: 400, easing: Easing.in(Easing.quad) });
      opacity.value = withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) });
      setTimeout(() => {
        setDisplayedText(newText);
        translateY.value = 150;
        translateY.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) });
        opacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) });
      }, 400);
    }
  }, [audio.currentTrackIndex, currentAffirmationText, displayedText]);

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
    // audio.stop();
    router.back();
  };

  // Auto-start playlist once on mount via machine
  useEffect(() => {
    if (!hasStartedPlaying) {
      audio.playPlaylist(PRODUCTION_PLAYLIST, PRODUCTION_PLAYLIST.defaultVoiceId);
      setHasStartedPlaying(true);
    }
  }, [hasStartedPlaying, audio]);

  // // If still idle shortly after mount, try again (defensive)
  // useEffect(() => {
  //   if (hasStartedPlaying && audio.playerState === 'idle') {
  //     audio.playPlaylist(PRODUCTION_PLAYLIST, PRODUCTION_PLAYLIST.defaultVoiceId);
  //   }
  // }, [hasStartedPlaying, audio.playerState]);

  const handlePlayPause = () => {
    audio.togglePlayback();
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
            onPress={() => {
              setShowVoiceModal(true);
              audio.openVoiceModal();
            }}
          >
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={24} color="#6C5CE7" />
            </View>
            <Text style={styles.controlLabel}>Voice</Text>
          </TouchableOpacity>

          {/* Play/Pause Button */}
          <TouchableOpacity onPress={handlePlayPause} style={styles.centerPlayButton}>
            <Ionicons 
              name={audio.isPlaying ? 'pause' : 'play'} 
              size={32} 
              color="#1A252F" 
              style={!audio.isPlaying ? { marginLeft: 3 } : {}}
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
        currentVolume={audio.backgroundVolume}
        onVolumeChange={async (volume: number) => {
          console.log('🎵 UI: Background volume slider changed to:', volume);
          await audio.setBackgroundVolume(volume);
          console.log('✅ UI: Background volume change completed');
        }}
        selectedSound={selectedSound}
        onSoundSelect={async (soundId: string) => {
          console.log('🎵 UI: Background music selection changed to:', soundId);
          console.log('🎵 UI: Previous selection was:', selectedSound);
          
          // Update selection immediately for responsive UI - triggers re-render!
          setSelectedSound(soundId);
          
          try {
            console.log('🎵 UI: Starting background track switch...');
            await audio.switchBackgroundTrack(soundId);
            console.log('✅ UI: Background track switching completed successfully');
          } catch (error) {
            console.error('❌ UI: Background track switching failed:', error);
            // Revert selection on failure
            // Note: You might want to store the previous selection to revert to
          }
        }}
      />

      <VoiceSettingsModal
        visible={showVoiceModal}
        onClose={() => {
          setShowVoiceModal(false);
          audio.closeVoiceModal();
        }}
        currentVolume={audio.affirmationVolume}
        onVolumeChange={async (volume: number) => {
          console.log('🎤 UI: Affirmation volume slider changed to:', volume);
          await audio.setAffirmationVolume(volume);
          console.log('✅ UI: Affirmation volume change completed');
        }}
        selectedVoice={audio.currentVoiceId}
        onVoiceSelect={(voiceId) => {
          // Preview the selected voice using the machine; machine handles pausing/snapshot
          audio.previewVoice(voiceId as any);
        }}
        affirmationDelay={audio.globalDelayMs}
        onDelayChange={(delayMs) => {
          console.log('🎛️ Delay slider changed to:', delayMs, 'ms');
          audio.updateDelay(delayMs);
        }}
      />

      {/* Debug Panel */}
      <View style={{ position: 'absolute', top: 80, right: 10, backgroundColor: 'rgba(0,0,0,0.85)', padding: 10, borderRadius: 8 }}>
        <Text style={{ color: '#0f0', fontWeight: 'bold', marginBottom: 6 }}>Debug (Machine)</Text>
        {/* <Text style={{ color: '#0f0' }}>State: {audio.playerState}</Text> */}
        <Text style={{ color: '#0f0' }}>Playing: {audio.isPlaying ? 'YES' : 'NO'}</Text>
        <Text style={{ color: '#0f0' }}>Index: {audio.currentTrackIndex}</Text>
        <Text style={{ color: '#0f0' }}>Voice: {audio.currentVoiceId}</Text>
        <Text style={{ color: '#0f0' }}>Modal: {audio.modalOpen ? 'OPEN' : 'CLOSED'}</Text>
        <Text style={{ color: '#0f0' }}>Delay(ms): {audio.globalDelayMs}</Text>
        <Text style={{ color: '#0f0' }}>Displayed: &quot;{displayedText}&quot;</Text>
      </View>
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