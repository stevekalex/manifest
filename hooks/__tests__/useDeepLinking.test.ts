import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useDeepLinking } from '../useDeepLinking';

// Mock expo-linking
jest.mock('expo-linking', () => ({
  getInitialURL: jest.fn(),
  addEventListener: jest.fn(),
  parse: jest.fn(),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

describe('useDeepLinking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('URL creation functions', () => {
    it('should create correct playlist link', () => {
      const deepLinking = useDeepLinking();
      
      const link = deepLinking.createPlaylistLink('test-playlist-123');
      
      expect(link).toBe('https://manifest-app.com/playlist/test-playlist-123');
    });

    it('should create correct custom scheme link', () => {
      const deepLinking = useDeepLinking();
      
      const link = deepLinking.createCustomSchemeLink('test-playlist-123');
      
      expect(link).toBe('manifest://playlist/test-playlist-123');
    });
  });

  describe('handleDeepLink', () => {
    it('should handle HTTPS playlist URLs correctly', () => {
      (Linking.parse as jest.Mock).mockReturnValue({
        scheme: 'https',
        hostname: 'manifest-app.com',
        path: '/playlist/test-123',
      });

      const deepLinking = useDeepLinking();
      
      deepLinking.handleDeepLink('https://manifest-app.com/playlist/test-123');
      
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/playlists/[id]',
        params: { id: 'test-123' }
      });
    });

    it('should handle custom scheme URLs correctly', () => {
      (Linking.parse as jest.Mock).mockReturnValue({
        scheme: 'manifest',
        hostname: 'playlist',
        path: '/test-123',
      });

      const deepLinking = useDeepLinking();
      
      deepLinking.handleDeepLink('manifest://playlist/test-123');
      
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/playlists/[id]',
        params: { id: 'test-123' }
      });
    });

    it('should handle parsing errors gracefully', () => {
      (Linking.parse as jest.Mock).mockImplementation(() => {
        throw new Error('Parse error');
      });

      const deepLinking = useDeepLinking();
      
      // Should not throw
      expect(() => {
        deepLinking.handleDeepLink('invalid-url');
      }).not.toThrow();
      
      expect(router.push).not.toHaveBeenCalled();
    });

    it('should ignore unhandled URL formats', () => {
      (Linking.parse as jest.Mock).mockReturnValue({
        scheme: 'https',
        hostname: 'other-domain.com',
        path: '/something',
      });

      const deepLinking = useDeepLinking();
      
      deepLinking.handleDeepLink('https://other-domain.com/something');
      
      expect(router.push).not.toHaveBeenCalled();
    });
  });
});