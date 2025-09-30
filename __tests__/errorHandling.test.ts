import { API_ERROR_CODES, getUserFriendlyErrorMessage, isAuthError, isValidationError } from '../utils/errorConstants';
import { ErrorHandler } from '../utils/errorHandler';
import type { ApiResponse } from '../utils/api';

describe('Error Handling System', () => {
  describe('API_ERROR_CODES', () => {
    it('should have all expected error codes', () => {
      expect(API_ERROR_CODES.UNAUTHENTICATED).toBe('UNAUTHENTICATED');
      expect(API_ERROR_CODES.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(API_ERROR_CODES.NOT_FOUND).toBe('NOT_FOUND');
      expect(API_ERROR_CODES.ALREADY_EXISTS).toBe('ALREADY_EXISTS');
      expect(API_ERROR_CODES.NETWORK_ERROR).toBe('NETWORK_ERROR');
    });
  });

  describe('Error Type Checkers', () => {
    it('should correctly identify auth errors', () => {
      expect(isAuthError(API_ERROR_CODES.UNAUTHENTICATED)).toBe(true);
      expect(isAuthError(API_ERROR_CODES.UNAUTHORIZED)).toBe(true);
      expect(isAuthError(API_ERROR_CODES.NOT_FOUND)).toBe(false);
      expect(isAuthError(undefined)).toBe(false);
    });

    it('should correctly identify validation errors', () => {
      expect(isValidationError(API_ERROR_CODES.MISSING_REQUIRED_FIELDS)).toBe(true);
      expect(isValidationError(API_ERROR_CODES.INVALID_INPUT)).toBe(true);
      expect(isValidationError(API_ERROR_CODES.NOT_FOUND)).toBe(false);
      expect(isValidationError(undefined)).toBe(false);
    });
  });

  describe('getUserFriendlyErrorMessage', () => {
    it('should return user-friendly messages for known codes', () => {
      expect(getUserFriendlyErrorMessage(API_ERROR_CODES.UNAUTHENTICATED))
        .toBe('Please log in to continue');
      
      expect(getUserFriendlyErrorMessage(API_ERROR_CODES.RATE_LIMIT_EXCEEDED))
        .toBe('Please slow down and try again in a moment');
      
      expect(getUserFriendlyErrorMessage(API_ERROR_CODES.NETWORK_ERROR))
        .toBe('Please check your internet connection and try again');
    });

    it('should return fallback message for unknown codes', () => {
      expect(getUserFriendlyErrorMessage('UNKNOWN_CODE', 'Custom fallback'))
        .toBe('Custom fallback');
      
      expect(getUserFriendlyErrorMessage(undefined))
        .toBe('An unexpected error occurred');
    });
  });

  describe('ErrorHandler', () => {
    it('should return false for successful responses', () => {
      const response: ApiResponse<any> = {
        data: { success: true }
      };

      const result = ErrorHandler.handleApiError(response, { showAlert: false });
      expect(result).toBe(false);
    });

    it('should return true and handle error responses', () => {
      const response: ApiResponse<any> = {
        error: 'User not authenticated',
        code: API_ERROR_CODES.UNAUTHENTICATED
      };

      let handledError: string | undefined;
      let handledCode: string | undefined;

      const result = ErrorHandler.handleApiError(response, {
        showAlert: false,
        onError: (error, code) => {
          handledError = error;
          handledCode = code;
        }
      });

      expect(result).toBe(true);
      expect(handledError).toBe('Please log in to continue');
      expect(handledCode).toBe(API_ERROR_CODES.UNAUTHENTICATED);
    });

    it('should execute auth callback for auth errors', () => {
      const response: ApiResponse<any> = {
        error: 'Authentication required',
        code: API_ERROR_CODES.UNAUTHENTICATED
      };

      let authCallbackCalled = false;

      ErrorHandler.handleApiError(response, {
        showAlert: false,
        onAuthError: () => {
          authCallbackCalled = true;
        }
      });

      expect(authCallbackCalled).toBe(true);
    });
  });

  describe('Backend Compatibility', () => {
    it('should handle new standardized error format', () => {
      const backendResponse: ApiResponse<any> = {
        error: 'This email is already registered',
        code: API_ERROR_CODES.ALREADY_EXISTS
      };

      let capturedError: string | undefined;

      ErrorHandler.handleApiError(backendResponse, {
        showAlert: false,
        onError: (error) => {
          capturedError = error;
        }
      });

      // Should use user-friendly message for known error codes
      expect(capturedError).toBe('This item already exists');
    });

    it('should gracefully handle responses without error codes', () => {
      const legacyResponse: ApiResponse<any> = {
        error: 'Something went wrong'
        // No code property
      };

      let capturedError: string | undefined;

      ErrorHandler.handleApiError(legacyResponse, {
        showAlert: false,
        onError: (error) => {
          capturedError = error;
        }
      });

      expect(capturedError).toBe('Something went wrong');
    });
  });
});