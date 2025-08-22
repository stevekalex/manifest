import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';

export function PromoBanner() {
  const handlePromoPress = () => {
    Alert.alert(
      'Contribute and Support',
      'Unlock premium features and help support the development of Innertune AI.',
      [
        { text: 'Maybe Later', style: 'cancel' },
        { text: 'Learn More', style: 'default' },
      ]
    );
  };

  return (
    <Animated.View
      entering={FadeInUp.duration(600).springify()}
      style={styles.container}
    >
      <TouchableOpacity
        style={styles.bannerButton}
        onPress={handlePromoPress}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#FCD34D', '#F59E0B', '#D97706']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <View style={styles.starIcon}>
                <Text style={styles.starText}>⭐</Text>
              </View>
            </View>
            
            <View style={styles.textContainer}>
              <Text style={styles.title}>Contribute and Support</Text>
              <Text style={styles.subtitle}>Unlock all features, no commitment</Text>
            </View>
            
            <View style={styles.arrowContainer}>
              <Ionicons name="chevron-forward" size={24} color="#1F2937" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 100, // Space for tab bar
  },
  bannerButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gradient: {
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 16,
  },
  starIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starText: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    opacity: 0.8,
    letterSpacing: 0.2,
  },
  arrowContainer: {
    marginLeft: 12,
  },
});