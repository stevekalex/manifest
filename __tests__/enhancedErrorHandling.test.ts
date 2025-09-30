import { ErrorHandler } from '../utils/errorHandler';
import type { ApiResponse } from '../utils/api';
import { API_ERROR_CODES } from '../utils/errorConstants';

describe('Enhanced Error Handling Integration', () => {
  describe('Hook Integration Patterns', () => {
    it('should handle search API errors with proper state updates', () => {
      const mockResponse: ApiResponse<any> = {
        error: 'Search service unavailable',
        code: API_ERROR_CODES.NETWORK_ERROR
      };

      let capturedError: string | undefined;
      let mockSetError = jest.fn((error: string) => {
        capturedError = error;
      });

      const result = ErrorHandler.handleApiError(mockResponse, {
        showAlert: false,
        title: 'Search Error',
        fallbackMessage: 'Failed to search playlists. Please try again.',
        onError: (error) => {
          mockSetError(error);
        }
      });

      expect(result).toBe(true);
      expect(mockSetError).toHaveBeenCalledWith('Please check your internet connection and try again');
      expect(capturedError).toBe('Please check your internet connection and try again');
    });

    it('should handle settings API errors with graceful degradation', () => {
      const mockResponse: ApiResponse<any> = {
        error: 'Settings database unavailable',
        code: API_ERROR_CODES.NOT_FOUND
      };

      let capturedError: string | undefined;

      const result = ErrorHandler.handleApiError(mockResponse, {
        showAlert: false,
        title: 'Settings Error',
        fallbackMessage: 'Failed to load settings. Using defaults.',
        onError: (error) => {
          capturedError = error;
        }
      });

      expect(result).toBe(true);
      // Should use user-friendly message for known error codes
      expect(capturedError).toBe('The requested item could not be found');
    });

    it('should handle liked playlists errors with proper fallbacks', () => {
      const mockResponse: ApiResponse<any> = {
        error: 'Unauthorized access to liked playlists',
        code: API_ERROR_CODES.UNAUTHORIZED
      };

      let authCallbackCalled = false;
      let capturedError: string | undefined;

      const result = ErrorHandler.handleApiError(mockResponse, {
        showAlert: false,
        title: 'Liked Playlists Error',
        fallbackMessage: 'Failed to load liked playlists.',
        onError: (error) => {
          capturedError = error;
        },
        onAuthError: () => {
          authCallbackCalled = true;
        }
      });

      expect(result).toBe(true);
      expect(authCallbackCalled).toBe(true);
      expect(capturedError).toBe('You do not have permission to perform this action');
    });
  });

  describe('Component Error Message Improvements', () => {
    it('should provide better error messages for playlist operations', () => {
      const networkError = new Error('Network request failed');
      
      let capturedTitle: string | undefined;
      let capturedMessage: string | undefined;

      ErrorHandler.handleGenericError(networkError, {
        title: 'Playlist Error',
        fallbackMessage: 'Failed to start playlist. Please check your connection and try again.',
        showAlert: false,
        onError: (message) => {
          capturedMessage = message;
          capturedTitle = 'Playlist Error'; // We know this from options
        }
      });

      expect(capturedTitle).toBe('Playlist Error');
      expect(capturedMessage).toBe('Network request failed');
    });

    it('should provide contextual error messages for authentication', () => {
      const authError = new Error('Token expired');
      
      let capturedTitle: string | undefined;
      let capturedMessage: string | undefined;

      ErrorHandler.handleGenericError(authError, {
        title: 'Authentication Error',
        fallbackMessage: 'Failed to send authentication link. Please check your connection and try again.',
        showAlert: false,
        onError: (message) => {
          capturedMessage = message;
          capturedTitle = 'Authentication Error'; // We know this from options
        }
      });

      expect(capturedTitle).toBe('Authentication Error');
      expect(capturedMessage).toBe('Token expired');
    });
  });

  describe('Backward Compatibility', () => {
    it('should handle legacy error responses gracefully', () => {
      // Legacy format without error codes
      const legacyResponse: ApiResponse<any> = {
        error: 'User not found'
        // No code field
      };

      let capturedError: string | undefined;

      const result = ErrorHandler.handleApiError(legacyResponse, {
        showAlert: false,
        onError: (error) => {
          capturedError = error;
        }
      });

      expect(result).toBe(true);
      expect(capturedError).toBe('User not found');
    });

    it('should handle empty error responses', () => {
      const emptyErrorResponse: ApiResponse<any> = {
        error: ''
      };

      let capturedError: string | undefined;

      const result = ErrorHandler.handleApiError(emptyErrorResponse, {
        showAlert: false,
        fallbackMessage: 'Something went wrong',
        onError: (error) => {
          capturedError = error;
        }
      });

      expect(result).toBe(true);
      expect(capturedError).toBe('Something went wrong');
    });
  });
});