import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useThemeColor } from '@/hooks/useThemeColor';
import { GlassButton } from '@/components/common/GlassButton';
import { useAuth } from '@/hooks/useAuth';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

type AuthMode = 'signin' | 'signup';

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [, setMagicLinkToken] = useState<string | null>(null);
  const [showVerification, setShowVerification] = useState(false);
  
  const { sendMagicLink, verifyMagicLink, isLoading } = useAuth();

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const glassMorphic = useThemeColor({}, 'glassMorphic');
  const glassMorphicBorder = useThemeColor({}, 'glassMorphicBorder');
  const shadowColor = useThemeColor({}, 'shadowColor');

  const formScale = useSharedValue(1);

  const animatedFormStyle = useAnimatedStyle(() => ({
    transform: [{ scale: formScale.value }],
  }));

  const handleModeSwitch = (newMode: AuthMode) => {
    if (newMode === mode) return;
    
    // First, animate the scale down
    formScale.value = withSpring(0.95, { damping: 15 });
    
    // Use setTimeout to update state after animation starts
    setTimeout(() => {
      setMode(newMode);
      setEmail('');
      setName('');
      
      // Then animate back up
      formScale.value = withSpring(1, { damping: 15 });
    }, 100);
  };

  const validateForm = () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    if (mode === 'signup' && !name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return false;
    }

    return true;
  };

  const handleSendMagicLink = async () => {
    if (!validateForm()) return;

    try {
      const firstName = mode === 'signup' ? name.split(' ')[0] : undefined;
      const lastName = mode === 'signup' ? name.split(' ').slice(1).join(' ') : undefined;
      
      const result = await sendMagicLink(email, firstName, lastName);
      
      if (result.success) {
        if (result.token) {
          // Development: Auto-verify with returned token
          setMagicLinkToken(result.token);
          handleVerifyToken(result.token);
        } else {
          // Production: Show verification message
          setShowVerification(true);
          Alert.alert('Magic Link Sent!', 'Check your email and click the link to sign in.');
        }
      } else {
        // Handle specific error cases
        if (result.code === 'NETWORK_ERROR') {
          Alert.alert('Connection Error', 'Please check your internet connection and try again.');
        } else if (result.error?.includes('already registered')) {
          Alert.alert('Account Exists', 'This email is already registered. Try signing in instead.');
          setMode('signin');
        } else {
          Alert.alert('Error', result.message || 'Failed to send magic link');
        }
      }
    } catch (error) {
      console.error('Magic link error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const handleVerifyToken = async (token: string) => {
    try {
      const result = await verifyMagicLink(token, mode);
      
      if (result.success) {
        Alert.alert('Success!', result.message, [
          { text: 'Continue', onPress: () => router.replace('/(tabs)') }
        ]);
      } else {
        Alert.alert('Verification Failed', result.message);
        setShowVerification(false);
        setMagicLinkToken(null);
      }
    } catch (error) {
      console.error('Verification error:', error);
      Alert.alert('Error', 'Verification failed. Please try again.');
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
        >
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        
        <View style={styles.logoContainer}>
          <Animated.View 
            style={[
              styles.logo,
              { 
                backgroundColor: tintColor,
                shadowColor: tintColor,
              }
            ]}
          >
            <Ionicons name="sparkles" size={32} color="#fff" />
          </Animated.View>
          <Text style={[styles.appName, { color: textColor }]}>Manifest</Text>
        </View>
      </Animated.View>

      {/* Mode Toggle */}
      <Animated.View 
        entering={FadeInDown.delay(300).springify()}
        style={[styles.modeToggle, { backgroundColor: glassMorphic, borderColor: glassMorphicBorder }]}
      >
        <AnimatedTouchableOpacity
          style={[
            styles.modeButton,
            mode === 'signin' && [styles.activeModeButton, { backgroundColor: tintColor }]
          ]}
          onPress={() => handleModeSwitch('signin')}
        >
          <Text style={[
            styles.modeButtonText,
            { color: mode === 'signin' ? '#fff' : textColor }
          ]}>
            Sign In
          </Text>
        </AnimatedTouchableOpacity>
        
        <AnimatedTouchableOpacity
          style={[
            styles.modeButton,
            mode === 'signup' && [styles.activeModeButton, { backgroundColor: tintColor }]
          ]}
          onPress={() => handleModeSwitch('signup')}
        >
          <Text style={[
            styles.modeButtonText,
            { color: mode === 'signup' ? '#fff' : textColor }
          ]}>
            Sign Up
          </Text>
        </AnimatedTouchableOpacity>
      </Animated.View>

      {/* Form */}
      <Animated.View 
        entering={FadeInDown.delay(400).springify()}
        style={[
          styles.form,
          { 
            backgroundColor: glassMorphic,
            borderColor: glassMorphicBorder,
            shadowColor: shadowColor,
          },
          animatedFormStyle
        ]}
      >
        {mode === 'signup' && (
          <Animated.View 
            entering={FadeInDown.delay(100).springify()}
            style={styles.inputContainer}
          >
            <Ionicons name="person-outline" size={22} color={tintColor} style={styles.inputIcon} />
            <TextInput
              style={[styles.textInput, { color: textColor }]}
              placeholder="Full Name"
              placeholderTextColor={`${textColor}60`}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </Animated.View>
        )}
        
        <Animated.View 
          entering={FadeInDown.delay(mode === 'signup' ? 200 : 100).springify()}
          style={styles.inputContainer}
        >
          <Ionicons name="mail-outline" size={22} color={tintColor} style={styles.inputIcon} />
          <TextInput
            style={[styles.textInput, { color: textColor }]}
            placeholder="Email Address"
            placeholderTextColor={`${textColor}60`}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
          />
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(mode === 'signup' ? 300 : 200).springify()}
          style={styles.buttonContainer}
        >
          <GlassButton
            label={isLoading ? 'Sending...' : (mode === 'signin' ? 'Send Magic Link' : 'Create Account')}
            iconName={isLoading ? undefined : (mode === 'signin' ? 'mail-outline' : 'person-add-outline')}
            glow={true}
            onPress={handleSendMagicLink}
            disabled={isLoading}
            style={[
              styles.authButton,
              isLoading && styles.disabledButton
            ]}
          />
        </Animated.View>

        {showVerification && (
          <Animated.View 
            entering={FadeInDown.delay(100).springify()}
            style={styles.verificationContainer}
          >
            <View style={[styles.verificationBox, { backgroundColor: `${tintColor}10`, borderColor: `${tintColor}30` }]}>
              <Ionicons name="mail-outline" size={32} color={tintColor} />
              <Text style={[styles.verificationTitle, { color: textColor }]}>
                Check Your Email
              </Text>
              <Text style={[styles.verificationText, { color: `${textColor}70` }]}>
                We&apos;ve sent a magic link to {email}. Click the link to complete your {mode === 'signin' ? 'sign in' : 'account creation'}.
              </Text>
              <TouchableOpacity 
                style={[styles.resendButton, { borderColor: `${tintColor}30` }]}
                onPress={handleSendMagicLink}
                disabled={isLoading}
              >
                <Text style={[styles.resendButtonText, { color: tintColor }]}>
                  Resend Magic Link
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {!showVerification && mode === 'signin' && (
          <Animated.View 
            entering={FadeInDown.delay(300).springify()}
            style={styles.helpTextContainer}
          >
            <Text style={[styles.helpText, { color: `${textColor}70` }]}>
              We&apos;ll send you a secure link to sign in
            </Text>
          </Animated.View>
        )}
      </Animated.View>

      {/* Social Login Options */}
      <Animated.View 
        entering={FadeInDown.delay(500).springify()}
        style={styles.socialContainer}
      >
        <View style={styles.dividerContainer}>
          <View style={[styles.dividerLine, { backgroundColor: `${textColor}20` }]} />
          <Text style={[styles.orText, { color: `${textColor}60` }]}>
            Or continue with
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: `${textColor}20` }]} />
        </View>
        
        <View style={styles.socialButtons}>
          <TouchableOpacity 
            style={[
              styles.socialButton,
              { 
                backgroundColor: glassMorphic,
                borderColor: glassMorphicBorder,
                shadowColor: shadowColor,
              }
            ]}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-google" size={24} color="#4285F4" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.socialButton,
              { 
                backgroundColor: glassMorphic,
                borderColor: glassMorphicBorder,
                shadowColor: shadowColor,
              }
            ]}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-apple" size={24} color={textColor} />
          </TouchableOpacity>
        </View>
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
    paddingTop: 50,
    paddingBottom: 32,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 50,
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
  modeToggle: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 40,
    padding: 6,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 16,
  },
  activeModeButton: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  modeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  form: {
    borderRadius: 28,
    padding: 32,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  inputIcon: {
    marginRight: 16,
    opacity: 0.8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 2,
  },
  buttonContainer: {
    marginTop: 24,
  },
  authButton: {
    paddingVertical: 20,
    borderRadius: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  helpTextContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  helpText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  verificationContainer: {
    marginTop: 24,
  },
  verificationBox: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 16,
  },
  verificationTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  verificationText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  resendButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  resendButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  socialContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  orText: {
    fontSize: 13,
    paddingHorizontal: 16,
    fontWeight: '500',
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 20,
  },
  socialButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
});