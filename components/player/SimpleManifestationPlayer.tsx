import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PRODUCTION_PLAYLIST } from '../../data/productionPlaylist';
import { getPlaylistById } from '../../data/playlists';
import { useAudioSystem } from '../../hooks/useAudioSystem';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { BackgroundMusicModal } from './BackgroundMusicModal';
import { VoiceSettingsModal } from './VoiceSettingsModal';
import { StarField } from './StarField';

const SimpleManifestationPlayerComponent: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    playlistId?: string;
    playlistData?: string;
    trackId?: string; 
    voiceId?: string;
  }>();
  
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const [selectedSound, setSelectedSound] = useState('ethereal');

  // Get playlist from route params (prioritize API data, then ID lookup, then fallback)
  const selectedPlaylist = (() => {
    // First priority: Use API data if available
    if (params.playlistData) {
      try {
        console.log('🎵 [PLAYER] Using API playlist data');
        const parsed = JSON.parse(params.playlistData);
        console.log('🔍 [PLAYER] Parsed playlist structure:', {
          id: parsed.id,
          name: parsed.name,
          affirmationsCount: parsed.affirmations?.length || 0,
          backgroundUrl: parsed.backgroundTrackUrl,
          cdnUrlsKeys: Object.keys(parsed.cdnUrls || {}),
        });
        
        // Log first few affirmations and their URLs
        if (parsed.affirmations) {
          console.log('🔍 [PLAYER] First 3 affirmations from API:');
          parsed.affirmations.slice(0, 3).forEach((aff, index) => {
            console.log(`  [${index}] ID: ${aff.id}, Text: ${aff.text?.substring(0, 40)}...`);
          });
        }
        
        // Log CDN URLs structure  
        if (parsed.cdnUrls) {
          Object.keys(parsed.cdnUrls).forEach(voiceId => {
            const urls = parsed.cdnUrls[voiceId];
            console.log(`🔍 [PLAYER] Voice ${voiceId} CDN URLs (${Object.keys(urls).length} total):`);
            Object.keys(urls).slice(0, 3).forEach(key => {
              const url = urls[key];
              console.log(`    ${key} -> ${typeof url} ${typeof url === 'number' ? `(${url})` : `(${typeof url})`}`);
            });
          });
        }
        
        return parsed;
      } catch (error) {
        console.error('❌ [PLAYER] Failed to parse playlist data:', error);
      }
    }
    
    // Second priority: Lookup by ID in hardcoded data
    if (params.playlistId) {
      console.log('🎵 [PLAYER] Falling back to hardcoded playlist lookup for ID:', params.playlistId);
      return getPlaylistById(params.playlistId) || PRODUCTION_PLAYLIST;
    }
    
    // Final fallback
    console.log('🎵 [PLAYER] Using production playlist fallback');
    return PRODUCTION_PLAYLIST;
  })();

  // New machine-backed audio system
  const audio = useAudioSystem();

  // Animation values for swipe up effect
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const breatheScale = useSharedValue(1);

  // Text to display based on currentTrackIndex from machine/store
  const currentAffirmationText = selectedPlaylist.affirmations[audio.currentTrackIndex]?.text
    || selectedPlaylist.affirmations[0]?.text
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

  // Auto-start playlist or handle playlist switching
  useEffect(() => {
    const voiceId = params.voiceId || selectedPlaylist.defaultVoiceId;
    
    // Check if we need to switch to a different playlist
    const currentPlaylistId = audio.playlist?.id;
    const newPlaylistId = selectedPlaylist?.id;
    
    if (currentPlaylistId && newPlaylistId && currentPlaylistId !== newPlaylistId) {
      // Playlist switch detected
      console.log('🔄 [PLAYER] Playlist switch detected:', currentPlaylistId, '→', newPlaylistId);
      audio.switchPlaylist(selectedPlaylist, voiceId);
      return;
    }
    
    // Initial playlist start (no current playlist)
    if (!hasStartedPlaying && selectedPlaylist) {
      console.log('🎵 [PLAYER] Starting initial playlist:', selectedPlaylist.id);
      audio.playPlaylist(selectedPlaylist, voiceId);
      setHasStartedPlaying(true);
    }
  }, [hasStartedPlaying, audio, selectedPlaylist, params.voiceId]);


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
          <Text style={styles.title}>{selectedPlaylist.name}</Text>
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
          // No-op: preview and immediate voice switching are disabled
        }}
        affirmationDelay={audio.globalDelayMs}
        onDelayChange={(delayMs) => {
          console.log('🎛️ Delay slider changed to:', delayMs, 'ms');
          audio.updateDelay(delayMs);
        }}
      />

    </View>
  );
};

SimpleManifestationPlayerComponent.displayName = 'SimpleManifestationPlayer';

const WrappedSimpleManifestationPlayer = React.memo(SimpleManifestationPlayerComponent);

export const SimpleManifestationPlayer: React.FC = () => (
  <ErrorBoundary>
    <WrappedSimpleManifestationPlayer />
  </ErrorBoundary>
);

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