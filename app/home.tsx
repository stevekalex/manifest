import { useEffect } from 'react';
import { router } from 'expo-router';

export default function HomeScreen() {
  useEffect(() => {
    // Redirect to the main app tabs
    router.replace('/(tabs)');
  }, []);

  // Show nothing while redirecting
  return null;
}