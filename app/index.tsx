import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useThemeColor } from '@/hooks/useThemeColor';
import { GlassButton } from '@/components/common/GlassButton';

export default function WelcomeScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const glassMorphic = useThemeColor({}, 'glassMorphic');
  const glassMorphicBorder = useThemeColor({}, 'glassMorphicBorder');

  const handleSignIn = () => {
    router.push('/auth');
  };

  const handleContinueAsGuest = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Background Pattern */}
      <View style={styles.backgroundPattern}>
        <Animated.View 
          entering={FadeInUp.delay(200).springify()}
          style={[styles.floatingElement, { backgroundColor: `${tintColor}10` }]}
        />
        <Animated.View 
          entering={FadeInUp.delay(400).springify()}
          style={[styles.floatingElement2, { backgroundColor: `${tintColor}15` }]}
        />
        <Animated.View 
          entering={FadeInUp.delay(600).springify()}
          style={[styles.floatingElement3, { backgroundColor: `${tintColor}20` }]}
        />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Logo and App Name */}
        <Animated.View 
          entering={FadeInUp.delay(400).springify()}
          style={styles.logoContainer}
        >
          <View style={[
            styles.logo,
            { 
              backgroundColor: tintColor,
              shadowColor: tintColor,
            }
          ]}>
            <Ionicons name="sparkles" size={40} color="#fff" />
          </View>
          <Text style={[styles.appName, { color: textColor }]}>Manifest</Text>
          <Text style={[styles.tagline, { color: `${textColor}80` }]}>
            Transform your mindset with guided affirmations
          </Text>
        </Animated.View>

        {/* Features */}
        <Animated.View 
          entering={FadeInDown.delay(600).springify()}
          style={styles.featuresContainer}
        >
          <View style={styles.feature}>
            <View style={[styles.featureIcon, { backgroundColor: `${tintColor}20` }]}>
              <Ionicons name="headset-outline" size={24} color={tintColor} />
            </View>
            <View style={styles.featureText}>
              <Text style={[styles.featureTitle, { color: textColor }]}>Personalized Audio</Text>
              <Text style={[styles.featureDesc, { color: `${textColor}70` }]}>
                AI-generated affirmations tailored to your goals
              </Text>
            </View>
          </View>

          <View style={styles.feature}>
            <View style={[styles.featureIcon, { backgroundColor: `${tintColor}20` }]}>
              <Ionicons name="infinite-outline" size={24} color={tintColor} />
            </View>
            <View style={styles.featureText}>
              <Text style={[styles.featureTitle, { color: textColor }]}>Endless Playlists</Text>
              <Text style={[styles.featureDesc, { color: `${textColor}70` }]}>
                Curated collections for every aspect of life
              </Text>
            </View>
          </View>

          <View style={styles.feature}>
            <View style={[styles.featureIcon, { backgroundColor: `${tintColor}20` }]}>
              <Ionicons name="analytics-outline" size={24} color={tintColor} />
            </View>
            <View style={styles.featureText}>
              <Text style={[styles.featureTitle, { color: textColor }]}>Track Progress</Text>
              <Text style={[styles.featureDesc, { color: `${textColor}70` }]}>
                Monitor your mindset transformation journey
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View 
          entering={FadeInDown.delay(800).springify()}
          style={styles.actionsContainer}
        >
          <GlassButton
            label="Get Started"
            iconName="person-outline"
            glow={true}
            onPress={handleSignIn}
            style={styles.primaryButton}
          />
          
          <TouchableOpacity 
            style={[
              styles.secondaryButton,
              { 
                backgroundColor: glassMorphic,
                borderColor: glassMorphicBorder,
              }
            ]}
            onPress={handleContinueAsGuest}
            activeOpacity={0.8}
          >
            <Text style={[styles.secondaryButtonText, { color: textColor }]}>
              Continue as Guest
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Footer */}
        <Animated.View 
          entering={FadeInDown.delay(1000).springify()}
          style={styles.footer}
        >
          <Text style={[styles.footerText, { color: `${textColor}50` }]}>
            By continuing, you agree to our Terms & Privacy Policy
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  floatingElement: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: 100,
    right: -50,
    opacity: 0.6,
  },
  floatingElement2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    top: 300,
    left: -30,
    opacity: 0.4,
  },
  floatingElement3: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    bottom: 200,
    right: 20,
    opacity: 0.3,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
    marginBottom: 24,
  },
  appName: {
    fontSize: 36,
    fontWeight: '200',
    letterSpacing: 2,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  featuresContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 32,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionsContainer: {
    gap: 16,
    marginBottom: 20,
  },
  primaryButton: {
    paddingVertical: 18,
  },
  secondaryButton: {
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});