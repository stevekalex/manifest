import { GlassButton } from '@/components/common/GlassButton';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export default function WelcomeScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  // Breathing glow animation
  const glowOpacity = useSharedValue(0.3);
  const glowAnimatedStyle = useAnimatedStyle(() => {
    return {
      shadowOpacity: glowOpacity.value,
    };
  });

  React.useEffect(() => {
    glowOpacity.value = withRepeat(
      withTiming(0.6, { duration: 2000 }),
      -1,
      true
    );
  }, []);

  const handleSignIn = () => {
    router.push('/auth');
  };

  const handleTermsPress = () => {
    router.push('/terms');
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
          <Animated.View style={[
            styles.logo,
            glowAnimatedStyle,
            { 
              backgroundColor: tintColor,
              shadowColor: tintColor,
            }
          ]}>
            <Ionicons name="sparkles" size={40} color="#fff" />
          </Animated.View>
          <Text style={[styles.appName, { color: textColor }]}>Manifest</Text>
          <Text style={[styles.tagline, { color: `${textColor}80` }]}>
            Align with your highest self
          </Text>
        </Animated.View>

        {/* Features */}
        <View style={styles.featuresWrapper}>
          <Animated.View 
            entering={FadeInDown.delay(600).springify()}
            style={styles.featuresContainer}
          >
          <Animated.View 
            entering={FadeInDown.delay(700).springify()}
            style={styles.feature}
          >
            <View style={[styles.featureIcon, { backgroundColor: `${tintColor}20` }]}>
              <Ionicons name="headset-outline" size={20} color={tintColor} />
            </View>
            <View style={styles.featureText}>
              <Text style={[styles.featureTitle, { color: textColor }]}>Personalized Audio</Text>
              <Text style={[styles.featureDesc, { color: `${textColor}70` }]}>
                Record affirmations in your style & voice
              </Text>
            </View>
          </Animated.View>

          <Animated.View 
            entering={FadeInDown.delay(800).springify()}
            style={styles.feature}
          >
            <View style={[styles.featureIcon, { backgroundColor: `${tintColor}20` }]}>
              <Ionicons name="infinite-outline" size={20} color={tintColor} />
            </View>
            <View style={styles.featureText}>
              <Text style={[styles.featureTitle, { color: textColor }]}>Smart Playlists</Text>
              <Text style={[styles.featureDesc, { color: `${textColor}70` }]}>
                Mixes for focus, sleep, and confidence
              </Text>
            </View>
          </Animated.View>

          <Animated.View 
            entering={FadeInDown.delay(900).springify()}
            style={styles.feature}
          >
            <View style={[styles.featureIcon, { backgroundColor: `${tintColor}20` }]}>
              <Ionicons name="analytics-outline" size={20} color={tintColor} />
            </View>
            <View style={styles.featureText}>
              <Text style={[styles.featureTitle, { color: textColor }]}>Progress That Sticks</Text>
              <Text style={[styles.featureDesc, { color: `${textColor}70` }]}>
                Streaks, minutes, and mood lift
              </Text>
            </View>
          </Animated.View>
        </Animated.View>
        </View>

        {/* Action Buttons */}
        <Animated.View 
          entering={FadeInDown.delay(800).springify()}
          style={styles.actionsContainer}
        >
          <GlassButton
            label="Get Started"
            glow={true}
            onPress={handleSignIn}
            style={styles.primaryButton}
          />
          
        </Animated.View>

        {/* Footer */}
        <Animated.View 
          entering={FadeInDown.delay(1000).springify()}
          style={styles.footer}
        >
          <Text style={[styles.footerText, { color: `${textColor}50` }]}>
            By continuing, you agree to our{' '}
            <Text 
              style={[styles.termsLinkText, { color: `${textColor}70` }]}
              onPress={handleTermsPress}
            >
              Terms & Privacy Policy
            </Text>
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
    marginBottom: 0,
    marginTop: 30,
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
    fontSize: 34,
    fontWeight: '400',
    letterSpacing: 2,
    marginBottom: 12,
    lineHeight: 40,
  },
  tagline: {
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  featuresWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  featuresContainer: {
    gap: 24,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    lineHeight: 22,
  },
  featureDesc: {
    fontSize: 15,
    lineHeight: 20,
    color: '#5A5A5A',
  },
  actionsContainer: {
    gap: 16,
    marginBottom: 20,
  },
  primaryButton: {
    paddingVertical: 18,
    paddingBottom: 15,
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
  termsLinkText: {
    fontSize: 12,
    textDecorationLine: 'underline',
    lineHeight: 18,
  },
});