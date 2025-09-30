/**
 * Standardized API Error Codes
 * 
 * These constants match the backend's centralized error handling system.
 * All API responses now use the format: {error: string, code: string}
 */

export const API_ERROR_CODES = {
  // Authentication errors
  UNAUTHENTICATED: 'UNAUTHENTICATED',           // 401 - Not logged in
  UNAUTHORIZED: 'UNAUTHORIZED',                 // 403 - Logged in but no permission
  
  // Data/Resource errors  
  NOT_FOUND: 'NOT_FOUND',                      // 404 - Resource doesn't exist
  ALREADY_EXISTS: 'ALREADY_EXISTS',            // 409 - Conflict, resource exists
  
  // Validation errors
  MISSING_REQUIRED_FIELDS: 'MISSING_REQUIRED_FIELDS',  // 400 - Required fields missing
  INVALID_INPUT: 'INVALID_INPUT',              // 400 - Invalid data format
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',  // 429 - Too many requests
  
  // Client-side errors (not from backend)
  NETWORK_ERROR: 'NETWORK_ERROR',              // Network/connection issues
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',              // Request timeout
  CIRCUIT_BREAKER_OPEN: 'CIRCUIT_BREAKER_OPEN', // Circuit breaker protection
  INVALID_RESPONSE: 'INVALID_RESPONSE',        // Malformed response
  
  // Generic fallback
  REQUEST_FAILED: 'REQUEST_FAILED',            // Generic HTTP error
} as const;

export type ApiErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES];

/**
 * Check if an error code indicates an authentication issue
 */
export const isAuthError = (code?: string): boolean => {
  return code === API_ERROR_CODES.UNAUTHENTICATED || code === API_ERROR_CODES.UNAUTHORIZED;
};

/**
 * Check if an error code indicates a validation issue
 */
export const isValidationError = (code?: string): boolean => {
  return code === API_ERROR_CODES.MISSING_REQUIRED_FIELDS || code === API_ERROR_CODES.INVALID_INPUT;
};

/**
 * Check if an error code indicates a client-side issue
 */
export const isClientError = (code?: string): boolean => {
  return code === API_ERROR_CODES.NETWORK_ERROR || 
         code === API_ERROR_CODES.TIMEOUT_ERROR || 
         code === API_ERROR_CODES.CIRCUIT_BREAKER_OPEN;
};

/**
 * Get a user-friendly error message for common error codes
 */
export const getUserFriendlyErrorMessage = (code?: string, fallbackMessage?: string): string => {
  switch (code) {
    case API_ERROR_CODES.UNAUTHENTICATED:
      return 'Please log in to continue';
    case API_ERROR_CODES.UNAUTHORIZED:
      return 'You do not have permission to perform this action';
    case API_ERROR_CODES.NOT_FOUND:
      return 'The requested item could not be found';
    case API_ERROR_CODES.ALREADY_EXISTS:
      return 'This item already exists';
    case API_ERROR_CODES.MISSING_REQUIRED_FIELDS:
      return 'Please fill in all required fields';
    case API_ERROR_CODES.INVALID_INPUT:
      return 'Please check your input and try again';
    case API_ERROR_CODES.RATE_LIMIT_EXCEEDED:
      return 'Please slow down and try again in a moment';
    case API_ERROR_CODES.NETWORK_ERROR:
      return 'Please check your internet connection and try again';
    case API_ERROR_CODES.TIMEOUT_ERROR:
      return 'Request timed out. Please try again';
    case API_ERROR_CODES.CIRCUIT_BREAKER_OPEN:
      return 'Service temporarily unavailable. Please try again later';
    default:
      return fallbackMessage || 'An unexpected error occurred';
  }
};