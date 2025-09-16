import { useThemeColor } from '@/hooks/useThemeColor';
import React from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function TermsScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');


  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Content */}
      <Animated.View 
        entering={FadeInDown.delay(200).springify()}
        style={styles.contentContainer}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Terms of Service */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: tintColor }]}>Terms of Service</Text>
            <Text style={[styles.sectionText, { color: `${textColor}90` }]}>
              Welcome to Manifest. By using our app, you agree to the following terms:
            </Text>
            
            <Text style={[styles.subsectionTitle, { color: textColor }]}>1. Acceptance of Terms</Text>
            <Text style={[styles.subsectionText, { color: `${textColor}80` }]}>
              By accessing and using Manifest, you accept and agree to be bound by the terms and provision of this agreement.
            </Text>

            <Text style={[styles.subsectionTitle, { color: textColor }]}>2. Use License</Text>
            <Text style={[styles.subsectionText, { color: `${textColor}80` }]}>
              Permission is granted to temporarily use Manifest for personal, non-commercial transitory viewing only.
            </Text>

            <Text style={[styles.subsectionTitle, { color: textColor }]}>3. Content</Text>
            <Text style={[styles.subsectionText, { color: `${textColor}80` }]}>
              All audio content, affirmations, and materials are for personal use only. Users may not redistribute or share content outside the app.
            </Text>

            <Text style={[styles.subsectionTitle, { color: textColor }]}>4. User Conduct</Text>
            <Text style={[styles.subsectionText, { color: `${textColor}80` }]}>
              Users agree to use the app in a manner consistent with all applicable laws and regulations.
            </Text>
          </View>

          {/* Privacy Policy */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: tintColor }]}>Privacy Policy</Text>
            <Text style={[styles.sectionText, { color: `${textColor}90` }]}>
              Your privacy is important to us. This policy explains how we collect, use, and protect your information.
            </Text>

            <Text style={[styles.subsectionTitle, { color: textColor }]}>Information We Collect</Text>
            <Text style={[styles.subsectionText, { color: `${textColor}80` }]}>
              • Usage data and app interaction patterns{'\n'}
              • Device information and app performance metrics{'\n'}
              • Audio playback preferences and session duration
            </Text>

            <Text style={[styles.subsectionTitle, { color: textColor }]}>How We Use Information</Text>
            <Text style={[styles.subsectionText, { color: `${textColor}80` }]}>
              • To improve app functionality and user experience{'\n'}
              • To personalize content recommendations{'\n'}
              • To provide customer support and resolve issues
            </Text>

            <Text style={[styles.subsectionTitle, { color: textColor }]}>Data Protection</Text>
            <Text style={[styles.subsectionText, { color: `${textColor}80` }]}>
              We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
            </Text>

            <Text style={[styles.subsectionTitle, { color: textColor }]}>Third-Party Services</Text>
            <Text style={[styles.subsectionText, { color: `${textColor}80` }]}>
              We may use third-party services for analytics and app functionality. These services have their own privacy policies governing the use of your information.
            </Text>
          </View>

          {/* Contact */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: tintColor }]}>Contact Us</Text>
            <Text style={[styles.sectionText, { color: `${textColor}90` }]}>
              If you have any questions about these Terms or Privacy Policy, please contact us at:
            </Text>
            <Text style={[styles.contactText, { color: textColor }]}>
              support@manifestapp.com
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: `${textColor}60` }]}>
              Last updated: December 2024
            </Text>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    paddingTop: 60,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  sectionText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  subsectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 20,
  },
  subsectionText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  contactText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  footerText: {
    fontSize: 14,
  },
});