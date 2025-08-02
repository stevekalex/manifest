import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSimpleTTS } from '../../hooks/useSimpleTTS';
import { useBackgroundAudio } from '../../hooks/useBackgroundAudio';

export const SimpleManifestationPlayer: React.FC = () => {
  const router = useRouter();
  
  const {
    start: startBackground,
    pause: pauseBackground,
    stop: stopBackground,
    setVolume,
    duckVolume,
    restoreVolume,
    isLoaded: backgroundIsLoaded,
    volume,
    error: backgroundError
  } = useBackgroundAudio();
  
  const { 
    isPlaying,
    currentIndex, 
    startPlaying, 
    pausePlaying,
    stopPlaying, 
    getCurrentAffirmation,
    totalAffirmations 
  } = useSimpleTTS(duckVolume, restoreVolume);

  // Auto-start TTS immediately when component mounts
  useEffect(() => {
    startPlaying();
  }, [startPlaying]);

  // Start background music as soon as it's loaded
  useEffect(() => {
    if (backgroundIsLoaded && isPlaying) {
      startBackground();
    }
  }, [backgroundIsLoaded, isPlaying, startBackground]);

  const handleBack = () => {
    stopPlaying();
    stopBackground();
    router.back();
  };

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
        
        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity 
            onPress={handlePlayPause} 
            style={styles.playButton}
          >
            <Ionicons 
              name={isPlaying ? "pause" : "play"} 
              size={40} 
              color="#ffffff" 
              style={!isPlaying ? { marginLeft: 4 } : {}}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

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
  controls: {
    alignItems: 'center',
    paddingBottom: 40
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