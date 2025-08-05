import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAudioSystem } from '../../hooks/useAudioSystem';
import { SAMPLE_PLAYLIST } from '../../data/samplePlaylist';

/**
 * Test component to verify the new audio system works
 * This will be integrated into SimpleManifestationPlayer once tested
 */
export const TestAudioSystem: React.FC = () => {
  const {
    playerState,
    currentVoiceId,
    currentTrackIndex,
    modalOpen,
    isPlaying,
    error,
    playPlaylist,
    pause,
    resume,
    stop,
    togglePlayback,
    setVoice,
    openVoiceModal,
    closeVoiceModal,
  } = useAudioSystem();

  const handlePlayPlaylist = () => {
    playPlaylist(SAMPLE_PLAYLIST, 'serenity');
  };

  const handleVoiceChange = () => {
    const newVoice = currentVoiceId === 'serenity' ? 'titan' : 'serenity';
    setVoice(newVoice);
  };

  const currentAffirmation = SAMPLE_PLAYLIST.affirmations[currentTrackIndex];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audio System Test</Text>
      
      {/* State Display */}
      <View style={styles.stateContainer}>
        <Text style={styles.stateText}>State: {playerState}</Text>
        <Text style={styles.stateText}>Voice: {currentVoiceId}</Text>
        <Text style={styles.stateText}>Track: {currentTrackIndex}</Text>
        <Text style={styles.stateText}>Playing: {isPlaying ? 'Yes' : 'No'}</Text>
        <Text style={styles.stateText}>Modal: {modalOpen ? 'Open' : 'Closed'}</Text>
        {error && <Text style={styles.errorText}>Error: {error}</Text>}
      </View>

      {/* Current Affirmation */}
      {currentAffirmation && (
        <View style={styles.affirmationContainer}>
          <Text style={styles.affirmationText}>{currentAffirmation.text}</Text>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.button} onPress={handlePlayPlaylist}>
          <Text style={styles.buttonText}>Play Playlist</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={togglePlayback}>
          <Text style={styles.buttonText}>{isPlaying ? 'Pause' : 'Resume'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={stop}>
          <Text style={styles.buttonText}>Stop</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleVoiceChange}>
          <Text style={styles.buttonText}>Switch Voice</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={modalOpen ? closeVoiceModal : openVoiceModal}
        >
          <Text style={styles.buttonText}>
            {modalOpen ? 'Close Modal' : 'Open Modal'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  stateContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  stateText: {
    fontSize: 16,
    marginBottom: 5,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 5,
    color: 'red',
  },
  affirmationContainer: {
    backgroundColor: '#e8f4f8',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  affirmationText: {
    fontSize: 18,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  controlsContainer: {
    gap: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});