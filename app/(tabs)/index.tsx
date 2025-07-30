import { Image } from 'expo-image';
import { Platform, StyleSheet } from 'react-native';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useUserStore, useAppStore } from '@/store';

export default function HomeScreen() {
  const { user, setUser } = useUserStore();
  const { isFirstLaunch, setFirstLaunch, lastOpenedTab, settings } = useAppStore();

  const handleCreateUser = () => {
    const newUser = {
      id: Date.now().toString(),
      name: 'Demo User',
      email: 'demo@example.com',
      preferences: {
        theme: 'auto' as const,
        notifications: true,
      },
    };
    setUser(newUser);
    setFirstLaunch(false);
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome{user ? `, ${user.name}` : ''}!</ThemedText>
        <HelloWave />
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">App State Demo</ThemedText>
        <ThemedText>
          First launch: {isFirstLaunch ? 'Yes' : 'No'}
        </ThemedText>
        <ThemedText>
          Last opened tab: {lastOpenedTab}
        </ThemedText>
        <ThemedText>
          Haptic feedback: {settings.hapticFeedback ? 'Enabled' : 'Disabled'}
        </ThemedText>
        {!user && (
          <ThemedText onPress={handleCreateUser} style={styles.button}>
            Create Demo User
          </ThemedText>
        )}
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">User Info</ThemedText>
        {user ? (
          <>
            <ThemedText>ID: {user.id}</ThemedText>
            <ThemedText>Email: {user.email}</ThemedText>
            <ThemedText>Theme: {user.preferences.theme}</ThemedText>
            <ThemedText>Notifications: {user.preferences.notifications ? 'On' : 'Off'}</ThemedText>
          </>
        ) : (
          <ThemedText>No user logged in</ThemedText>
        )}
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Development</ThemedText>
        <ThemedText>
          Press{' '}
          <ThemedText type="defaultSemiBold">
            {Platform.select({
              ios: 'cmd + d',
              android: 'cmd + m',
              web: 'F12',
            })}
          </ThemedText>{' '}
          to open developer tools.
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  button: {
    color: '#007AFF',
    marginTop: 8,
    textDecorationLine: 'underline',
  },
});
