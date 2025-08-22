import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface SessionItem {
  id: string;
  title: string;
  gradient: string[];
}

const mockSessions: SessionItem[] = [
  {
    id: 'production-affirmations',
    title: 'My playlist #3',
    gradient: ['#FF6B9D', '#8B5CF6', '#3B82F6'],
  },
  {
    id: 'abundance-mindset',
    title: 'Six-Pack Abs',
    gradient: ['#1E40AF', '#3B82F6', '#06B6D4'],
  },
  {
    id: 'inner-peace',
    title: 'Navigate Grief',
    gradient: ['#059669', '#10B981', '#34D399'],
  },
  {
    id: 'believe-in-yourself',
    title: 'Believe In Yourself',
    gradient: ['#F59E0B', '#FBBF24', '#FCD34D'],
  },
  {
    id: 'money-magnetism',
    title: 'Love Yourself',
    gradient: ['#DC2626', '#EF4444', '#F87171'],
  },
  {
    id: 'morning-motivation',
    title: 'My first playlist',
    gradient: ['#7C2D12', '#EA580C', '#FB923C'],
  },
];

export function LastSessions() {
  const handleSessionPress = (sessionId: string) => {
    router.push(`/playlists/${sessionId}`);
  };

  const renderSession = (session: SessionItem, index: number) => {
    const isLarge = index % 3 === 0; // Make every third item larger

    return (
      <Animated.View
        key={session.id}
        entering={FadeInDown.delay(index * 100).springify()}
        style={[
          styles.sessionItem,
          isLarge ? styles.largeSession : styles.smallSession,
        ]}
      >
        <TouchableOpacity
          onPress={() => handleSessionPress(session.id)}
          activeOpacity={0.8}
          style={styles.sessionButton}
        >
          <LinearGradient
            colors={session.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.sessionBackground,
              isLarge ? styles.largeBackground : styles.smallBackground,
            ]}
          >
            <View style={styles.sessionOverlay} />
          </LinearGradient>
          <View style={styles.sessionContent}>
            <Text style={[
              styles.sessionTitle,
              isLarge ? styles.largeTitleText : styles.smallTitleText,
            ]} numberOfLines={2}>
              {session.title}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Last sessions</Text>
      
      <ScrollView
        style={styles.sessionsContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sessionsGrid}>
          {mockSessions.map((session, index) => renderSession(session, index))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  sessionsContainer: {
    maxHeight: 400,
  },
  sessionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  sessionItem: {
    marginBottom: 16,
  },
  largeSession: {
    width: '48%',
    height: 120,
  },
  smallSession: {
    width: '48%',
    height: 80,
  },
  sessionButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  sessionBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  largeBackground: {
    borderRadius: 16,
  },
  smallBackground: {
    borderRadius: 12,
  },
  sessionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 16,
  },
  sessionContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-end',
  },
  sessionTitle: {
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 4,
  },
  largeTitleText: {
    fontSize: 16,
    lineHeight: 20,
  },
  smallTitleText: {
    fontSize: 14,
    lineHeight: 18,
  },
});