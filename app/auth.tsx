import { EmailExpansion } from '@/components/auth/EmailExpansion';
import { ProviderButton, type ProviderType } from '@/components/auth/ProviderButton';
import { SegmentedControl, type AuthMode } from '@/components/auth/SegmentedControl';
import { useAuth } from '@/hooks/useAuth';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [emailExpanded, setEmailExpanded] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<ProviderType | null>(null);

  const { sendMagicLink, isLoading } = useAuth();

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const glassMorphic = useThemeColor({}, 'glassMorphic');

  const handleTermsPress = () => {
    router.push('/terms');
  };

  const handleProviderPress = async (provider: ProviderType) => {
    // Handle email expansion instantly (no loading state)
    if (provider === 'email') {
      setEmailExpanded(!emailExpanded);
      return;
    }
    
    // For Apple/Google: collapse email first, then start auth
    if (emailExpanded) {
      setEmailExpanded(false);
      setEmail(''); // Clear email input
    }
    
    setLoadingProvider(provider);
    
    try {
      switch (provider) {
        case 'apple':
          await handleAppleAuth();
          break;
        case 'google':
          await handleGoogleAuth();
          break;
      }
    } catch (error) {
      console.error(`${provider} auth error:`, error);
      Alert.alert('Error', `Failed to authenticate with ${provider}`);
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleAppleAuth = async () => {
    // TODO: Install and configure expo-apple-authentication
    // import * as AppleAuthentication from 'expo-apple-authentication';
    
    try {
      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      Alert.alert(
        'Apple Authentication', 
        'Apple Sign In would be implemented here. This requires:\n\n• expo-apple-authentication package\n• Apple Developer account setup\n• iOS app configuration',
        [
          { text: 'OK', onPress: () => setLoadingProvider(null) }
        ]
      );
    } catch {
      Alert.alert('Error', 'Apple authentication failed');
      setLoadingProvider(null);
    }
  };

  const handleGoogleAuth = async () => {
    // TODO: Install and configure expo-auth-session for Google
    // import * as Google from 'expo-auth-session/providers/google';
    
    try {
      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      Alert.alert(
        'Google Authentication', 
        'Google Sign In would be implemented here. This requires:\n\n• expo-auth-session package\n• Google Cloud Console setup\n• OAuth client configuration',
        [
          { text: 'OK', onPress: () => setLoadingProvider(null) }
        ]
      );
    } catch {
      Alert.alert('Error', 'Google authentication failed');
      setLoadingProvider(null);
    }
  };

  const handleEmailSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      const result = await sendMagicLink(email);
      
      if (result.success) {
        Alert.alert(
          'Link sent!', 
          'Check your inbox and click the link to sign in.',
          [
            { 
              text: 'OK', 
              onPress: () => {
                setEmailExpanded(false);
                setEmail('');
              }
            }
          ]
        );
      } else {
        if (result.code === 'NETWORK_ERROR') {
          Alert.alert('Connection Error', 'Please check your internet connection and try again.');
        } else if (result.error?.includes('already registered') && mode === 'signup') {
          Alert.alert('Account Exists', 'This email is already registered. Try signing in instead.');
          setMode('signin');
        } else {
          Alert.alert('Error', result.message || 'Failed to send magic link');
        }
      }
    } catch (error) {
      console.error('Magic link error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    // Auto-collapse email form when switching tabs
    if (emailExpanded) {
      setEmailExpanded(false);
    }
    setEmail(''); // Clear email input
  };

  // Determine provider order based on platform
  const getProviderOrder = (): ProviderType[] => {
    if (Platform.OS === 'ios') {
      return ['apple', 'google', 'email'];
    } else {
      return ['google', 'apple', 'email'];
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Header */}
      <Animated.View 
        entering={FadeInUp.delay(200).springify()}
        style={styles.header}
      >
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: `${glassMorphic}80` }]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        
        <View style={styles.logoContainer}>
          <View style={[
            styles.logo,
            { 
              backgroundColor: tintColor,
              shadowColor: tintColor,
            }
          ]}>
            <Ionicons name="sparkles" size={32} color="#fff" />
          </View>
          <Text style={[styles.appName, { color: textColor }]}>Manifest</Text>
        </View>
      </Animated.View>

      {/* Content */}
      <View style={styles.content}>
        {/* Segmented Control */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <SegmentedControl 
            selectedMode={mode} 
            onModeChange={handleModeChange}
          />
        </Animated.View>

        {/* Provider Buttons */}
        <Animated.View 
          entering={FadeInDown.delay(400).springify()}
          style={styles.providersContainer}
        >
          {getProviderOrder().map((provider, index) => (
            <Animated.View
              key={provider}
              entering={FadeInDown.delay(500 + index * 100).springify()}
            >
              <ProviderButton
                provider={provider}
                onPress={() => handleProviderPress(provider)}
                loading={loadingProvider === provider}
                isExpanded={provider === 'email' && emailExpanded}
              />
              
              {provider === 'email' && (
                <EmailExpansion
                  isExpanded={emailExpanded}
                  email={email}
                  onEmailChange={setEmail}
                  onSubmit={handleEmailSubmit}
                  loading={isLoading}
                />
              )}
            </Animated.View>
          ))}
        </Animated.View>
      </View>

      {/* Footer */}
      <Animated.View 
        entering={FadeInDown.delay(900).springify()}
        style={styles.footer}
      >
        <Text style={[styles.footerText, { color: `${textColor}50` }]}>
          By continuing, you agree to our{' '}
          <Text 
            style={[styles.termsLink, { color: `${textColor}70` }]}
            onPress={handleTermsPress}
          >
            Terms & Privacy Policy
          </Text>
        </Text>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 60,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  appName: {
    fontSize: 24,
    fontWeight: '300',
    marginTop: 12,
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 32,
  },
  providersContainer: {
    marginTop: 20,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 6,
  },
  securityText: {
    fontSize: 13,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    textDecorationLine: 'underline',
  },
});