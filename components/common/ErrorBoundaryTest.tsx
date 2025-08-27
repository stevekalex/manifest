import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ErrorBoundary } from './ErrorBoundary';

// Component that can throw an error for testing
const ErrorThrowingComponent: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error for ErrorBoundary validation');
  }
  
  return (
    <View style={styles.successContainer}>
      <Text style={styles.successText}>✅ No error - component working normally</Text>
    </View>
  );
};

export const ErrorBoundaryTest: React.FC = () => {
  const [shouldThrow, setShouldThrow] = useState(false);
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>ErrorBoundary Test</Text>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => setShouldThrow(!shouldThrow)}
      >
        <Text style={styles.buttonText}>
          {shouldThrow ? 'Fix Error' : 'Trigger Error'}
        </Text>
      </TouchableOpacity>
      
      <View style={styles.testArea}>
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow={shouldThrow} />
        </ErrorBoundary>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#0066cc',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  testArea: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 10,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successText: {
    color: '#00ff00',
    fontSize: 18,
    textAlign: 'center',
  },
});