import { useEffect, useCallback } from 'react';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import type { DeepLinkData } from '../types/audio';

export function useDeepLinking() {
  const handleDeepLink = useCallback((url: string) => {
    console.log('🔗 Deep link received:', url);
    
    try {
      const parsed = Linking.parse(url);
      console.log('🔗 Parsed URL:', parsed);
      
      // Handle https://manifest-app.com/playlist/{id} format
      if (parsed.hostname === 'manifest-app.com' && parsed.path) {
        const pathSegments = parsed.path.split('/').filter(Boolean);
        
        if (pathSegments[0] === 'playlist' && pathSegments[1]) {
          const playlistId = pathSegments[1];
          console.log('🔗 Navigating to playlist:', playlistId);
          
          // Navigate to playlist detail screen
          router.push({
            pathname: '/playlists/[id]',
            params: { id: playlistId }
          });
          
          return;
        }
      }
      
      // Handle custom scheme: manifest://playlist/{id}
      if (parsed.scheme === 'manifest' && parsed.hostname === 'playlist' && parsed.path) {
        const playlistId = parsed.path.replace('/', '');
        console.log('🔗 Navigating to playlist via custom scheme:', playlistId);
        
        router.push({
          pathname: '/playlists/[id]',
          params: { id: playlistId }
        });
        
        return;
      }
      
      console.log('🔗 Unhandled deep link format:', url);
    } catch (error) {
      console.error('🔗 Error parsing deep link:', error);
    }
  }, []);

  const setupDeepLinking = useCallback(() => {
    // Handle initial URL when app opens from link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('🔗 Initial URL detected:', url);
        handleDeepLink(url);
      }
    });

    // Handle URLs when app is already open
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription?.remove();
    };
  }, [handleDeepLink]);

  useEffect(() => {
    const cleanup = setupDeepLinking();
    return cleanup;
  }, [setupDeepLinking]);

  const createPlaylistLink = useCallback((playlistId: string): string => {
    return `https://manifest-app.com/playlist/${playlistId}`;
  }, []);

  const createCustomSchemeLink = useCallback((playlistId: string): string => {
    return `manifest://playlist/${playlistId}`;
  }, []);

  return {
    createPlaylistLink,
    createCustomSchemeLink,
    handleDeepLink
  };
}