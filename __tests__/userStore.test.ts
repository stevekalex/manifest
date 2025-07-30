import { useUserStore } from '../store/userStore';
import type { User } from '../store/userStore';
import { act, renderHook } from '@testing-library/react-native';

describe('useUserStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useUserStore.setState({
      user: null,
      isLoading: false,
      error: null,
    });
  });

  const mockUser: User = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    preferences: {
      theme: 'light',
      notifications: true,
    },
  };

  describe('setUser', () => {
    it('should set user and clear error', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.setUser(mockUser);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.error).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update existing user properties', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.setUser(mockUser);
      });

      const updates = { name: 'Updated Name' };

      act(() => {
        result.current.updateUser(updates);
      });

      expect(result.current.user).toEqual({
        ...mockUser,
        ...updates,
      });
      expect(result.current.error).toBeNull();
    });

    it('should not update when no user exists', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.updateUser({ name: 'Updated Name' });
      });

      expect(result.current.user).toBeNull();
    });

    it('should update nested preferences', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.setUser(mockUser);
      });

      const updates = {
        preferences: {
          ...mockUser.preferences,
          theme: 'dark' as const,
        },
      };

      act(() => {
        result.current.updateUser(updates);
      });

      expect(result.current.user?.preferences.theme).toBe('dark');
    });
  });

  describe('clearUser', () => {
    it('should clear user and error', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.setUser(mockUser);
        result.current.setError('Some error');
      });

      act(() => {
        result.current.clearUser();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('should set loading state', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      const { result } = renderHook(() => useUserStore());
      const errorMessage = 'Test error';

      act(() => {
        result.current.setError(errorMessage);
      });

      expect(result.current.error).toBe(errorMessage);
    });

    it('should clear error when set to null', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.setError('Test error');
      });

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });
});