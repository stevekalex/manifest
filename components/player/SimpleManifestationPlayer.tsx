import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSimpleTTS } from '../../hooks/useSimpleTTS';
import { useBackgroundAudio } from '../../hooks/useBackgroundAudio';
import { BackgroundMusicModal } from './BackgroundMusicModal';

const SimpleManifestationPlayerComponent: React.FC = () => {
  const router = useRouter();
  const [showMusicModal, setShowMusicModal] = useState(false);
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
    getCurrentAffirmation
  } = useSimpleTTS(duckVolume, restoreVolume);

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
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460', '#1a1a2e']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <SafeAreaView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#ffffff" />
          </TouchableOpacity>
          
          <Text style={styles.title}>Believe In Yourself</Text>
          
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="infinite-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
        
        {/* Affirmation Display */}
        <View style={styles.centerContent}>
          <Text style={styles.affirmationText}>
            {getCurrentAffirmation()}
          </Text>
          
        </View>
        
        {/* Secondary Controls */}
        <View style={styles.secondaryControls}>
          <TouchableOpacity style={styles.controlButton}>
            <Ionicons name="shuffle" size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.controlButton}>
            <Ionicons name="add" size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.controlButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          <TouchableOpacity style={styles.bottomControlButton}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={24} color="#ffffff" />
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
              color="#ffffff" 
              style={!isPlaying ? { marginLeft: 3 } : {}}
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.bottomControlButton}
            onPress={() => setShowMusicModal(true)}
          >
            <View style={styles.musicAvatarCircle}>
              <Ionicons name="musical-notes" size={24} color="#ffffff" />
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
    color: '#ffffff',
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
    gap: 40,
    marginBottom: 30,
  },
  controlButton: {
    padding: 12,
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
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 42,
    textShadowColor: 'rgba(255, 255, 255, 0.2)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 40,
  },
  bottomControlButton: {
    alignItems: 'center',
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  musicAvatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  centerPlayButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -32, // Move up to align center with avatar circles
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  controlLabel: {
    fontSize: 14,
    color: '#ffffff',
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