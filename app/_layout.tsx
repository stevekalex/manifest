import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useDeepLinking } from '@/hooks/useDeepLinking';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Initialize deep linking
  useDeepLinking();

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack
          screenOptions={{
            animation: 'fade',
            animationDuration: 300,
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
          <Stack.Screen name="home" options={{ headerShown: false }} />
          <Stack.Screen 
            name="auth" 
            options={{ 
              headerShown: false,
              animation: 'slide_from_bottom',
              gestureEnabled: false,
            }} 
          />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="player" options={{ headerShown: false }} />
          <Stack.Screen 
            name="search" 
            options={{ 
              headerShown: false,
              animation: 'slide_from_right',
            }} 
          />
          <Stack.Screen 
            name="playlists/index" 
            options={{ 
              headerShown: false,
              animation: 'slide_from_right',
            }} 
          />
          <Stack.Screen 
            name="playlists/[id]" 
            options={{ 
              headerShown: false,
              animation: 'slide_from_right',
            }} 
          />
          <Stack.Screen 
            name="terms" 
            options={{ 
              title: "",
              headerBackTitle: "Back",
              animation: 'slide_from_right',
            }} 
          />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
