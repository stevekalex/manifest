import { Alert } from 'react-native';
import { API_ERROR_CODES, getUserFriendlyErrorMessage, isAuthError } from './errorConstants';
import type { ApiResponse } from './api';

export interface ErrorHandlerOptions {
  /** Custom title for the alert */
  title?: string;
  /** Custom fallback message if no specific error handling is found */
  fallbackMessage?: string;
  /** Whether to show an alert dialog (default: true) */
  showAlert?: boolean;
  /** Callback function to execute after handling the error */
  onError?: (error: string, code?: string) => void;
  /** Callback for authentication errors (e.g., redirect to login) */
  onAuthError?: () => void;
}

/**
 * Centralized error handler for API responses
 * Provides consistent error messaging and handling across the app
 */
export class ErrorHandler {
  /**
   * Handle API response errors with consistent user-friendly messaging
   */
  static handleApiError<T>(
    response: ApiResponse<T>,
    options: ErrorHandlerOptions = {}
  ): boolean {
    const {
      title = 'Error',
      fallbackMessage = 'Something went wrong. Please try again.',
      showAlert = true,
      onError,
      onAuthError,
    } = options;

    // No error - success case  
    if (!response.error && response.error !== '') {
      return false;
    }

    const { error, code } = response;
    
    // Handle authentication errors specially
    if (isAuthError(code)) {
      const authMessage = getUserFriendlyErrorMessage(code, error);
      
      if (showAlert) {
        Alert.alert('Authentication Required', authMessage);
      }
      
      // Execute auth error callback
      if (onAuthError) {
        onAuthError();
      }
      
      if (onError) {
        onError(authMessage, code);
      }
      
      return true;
    }

    // Use user-friendly message for known codes, otherwise use server message
    const userMessage = code && getUserFriendlyErrorMessage(code) !== 'An unexpected error occurred'
      ? getUserFriendlyErrorMessage(code, fallbackMessage)
      : error || fallbackMessage;
    
    if (showAlert) {
      Alert.alert(title, userMessage);
    }
    
    if (onError) {
      onError(userMessage, code);
    }
    
    return true;
  }

  /**
   * Handle generic errors (non-API errors like network issues, unexpected errors)
   */
  static handleGenericError(
    error: unknown,
    options: ErrorHandlerOptions = {}
  ): void {
    const {
      title = 'Error',
      fallbackMessage = 'Something went wrong. Please try again.',
      showAlert = true,
      onError,
    } = options;

    const errorMessage = error instanceof Error ? error.message : fallbackMessage;
    
    if (showAlert) {
      Alert.alert(title, errorMessage);
    }
    
    if (onError) {
      onError(errorMessage);
    }
  }

  /**
   * Quick shorthand for handling API errors with auth redirect
   */
  static handleApiErrorWithAuth<T>(
    response: ApiResponse<T>,
    onAuthError: () => void,
    options: Omit<ErrorHandlerOptions, 'onAuthError'> = {}
  ): boolean {
    return this.handleApiError(response, {
      ...options,
      onAuthError,
    });
  }

  /**
   * Handle specific error codes with custom logic
   */
  static handleSpecificError(
    code: string | undefined,
    handlers: Record<string, () => void>,
    defaultHandler?: () => void
  ): void {
    if (code && handlers[code]) {
      handlers[code]();
    } else if (defaultHandler) {
      defaultHandler();
    }
  }
}

/**
 * Convenience functions for common error handling patterns
 */

/**
 * Handle API response with automatic auth error handling
 */
export const handleApiResponse = <T>(
  response: ApiResponse<T>,
  onAuthError: () => void,
  options?: Omit<ErrorHandlerOptions, 'onAuthError'>
): boolean => {
  return ErrorHandler.handleApiErrorWithAuth(response, onAuthError, options);
};

/**
 * Create a reusable error handler for a specific context
 */
export const createErrorHandler = (
  defaultOptions: ErrorHandlerOptions
) => {
  return <T>(response: ApiResponse<T>, overrideOptions: ErrorHandlerOptions = {}) => {
    return ErrorHandler.handleApiError(response, {
      ...defaultOptions,
      ...overrideOptions,
    });
  };
};

/**
 * Error handler specifically for authentication flows
 */
export const handleAuthError = (
  response: ApiResponse<any>,
  onRedirectToLogin: () => void
): boolean => {
  return ErrorHandler.handleApiError(response, {
    title: 'Authentication Error',
    onAuthError: onRedirectToLogin,
    onError: (message, code) => {
      console.error('[AUTH ERROR]', { message, code });
    },
  });
};