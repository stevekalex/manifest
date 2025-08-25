import { useState, useEffect } from 'react';
import { authService, type AuthState, type User } from '@/services/authService';

export interface UseAuthReturn extends AuthState {
  sendMagicLink: (email: string, firstName?: string, lastName?: string) => Promise<{
    success: boolean;
    message: string;
    token?: string;
    error?: string;
    code?: string;
  }>;
  verifyMagicLink: (token: string, type: 'signup' | 'signin') => Promise<{
    success: boolean;
    message: string;
    user?: User;
    error?: string;
    code?: string;
  }>;
  signOut: () => Promise<{
    success: boolean;
    message: string;
  }>;
  refreshToken: () => Promise<boolean>;
}

export function useAuth(): UseAuthReturn {
  const [authState, setAuthState] = useState<AuthState>(authService.getState());

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange(setAuthState);
    return unsubscribe;
  }, []);

  return {
    ...authState,
    sendMagicLink: authService.sendMagicLink.bind(authService),
    verifyMagicLink: authService.verifyMagicLink.bind(authService),
    signOut: authService.signOut.bind(authService),
    refreshToken: authService.refreshTokenIfNeeded.bind(authService),
  };
}