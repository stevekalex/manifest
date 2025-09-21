import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function RootScreen() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        // User is authenticated, go to main app
        router.replace('/home');
      } else {
        // User is not authenticated, go to welcome screen
        router.replace('/welcome');
      }
    }
  }, [isAuthenticated, isLoading]);

  // Show nothing while determining route
  return null;
}