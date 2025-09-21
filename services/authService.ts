import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/utils/api';

export interface User {
  id: string;
  email: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
  };
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type AuthListener = (state: AuthState) => void;

class AuthService {
  private listeners: AuthListener[] = [];
  private currentState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
  };

  constructor() {
    this.initializeAuth();
  }

  private async initializeAuth() {
    console.log('🔍 [AUTH SERVICE] Starting auth initialization...');
    try {
      const token = await AsyncStorage.getItem('access_token');
      console.log('🔍 [AUTH SERVICE] Token check:', {
        hasToken: !!token,
        tokenLength: token?.length,
        tokenPrefix: token?.substring(0, 20) + '...'
      });
      
      if (token) {
        console.log('🔍 [AUTH SERVICE] Token found, verifying with backend...');
        // Verify token is still valid
        const response = await apiClient.checkAuthStatus();
        console.log('🔍 [AUTH SERVICE] Auth status response:', {
          hasData: !!response.data,
          authenticated: response.data?.authenticated,
          hasUser: !!response.data?.user,
          error: response.error
        });
        
        if (response.data?.authenticated && response.data.user) {
          console.log('✅ [AUTH SERVICE] Token valid, user authenticated:', {
            userId: response.data.user.id,
            userEmail: response.data.user.email
          });
          this.updateState({
            user: response.data.user,
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        } else {
          console.log('❌ [AUTH SERVICE] Token invalid, clearing tokens');
          // Token is invalid, clear it
          await this.clearTokens();
        }
      } else {
        console.log('📋 [AUTH SERVICE] No token found in storage');
      }
    } catch (error) {
      console.error('❌ [AUTH SERVICE] Auth initialization failed:', error);
      await this.clearTokens();
    }

    console.log('📋 [AUTH SERVICE] Setting unauthenticated state');
    this.updateState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }

  private updateState(newState: Partial<AuthState>) {
    const previousState = { ...this.currentState };
    this.currentState = { ...this.currentState, ...newState };
    
    console.log('🔄 [AUTH SERVICE] State update:', {
      previous: {
        isAuthenticated: previousState.isAuthenticated,
        hasUser: !!previousState.user,
        userId: previousState.user?.id
      },
      new: {
        isAuthenticated: this.currentState.isAuthenticated,
        hasUser: !!this.currentState.user,
        userId: this.currentState.user?.id
      },
      changed: previousState.isAuthenticated !== this.currentState.isAuthenticated
    });
    
    this.listeners.forEach(listener => listener(this.currentState));
  }

  private async storeTokens(session: AuthSession) {
    try {
      console.log('🔐 Storing auth tokens:', {
        hasAccessToken: !!session.access_token,
        hasRefreshToken: !!session.refresh_token,
        accessTokenLength: session.access_token?.length,
        accessTokenPrefix: session.access_token?.substring(0, 20) + '...',
        expiresIn: session.expires_in,
        tokenType: session.token_type
      });
      
      await AsyncStorage.multiSet([
        ['access_token', session.access_token],
        ['refresh_token', session.refresh_token],
        ['user', JSON.stringify(session.user)],
        ['expires_at', String(Date.now() + (session.expires_in * 1000))],
      ]);
      
      console.log('✅ Tokens stored successfully');
      
      // Verify storage by reading back
      const verification = await AsyncStorage.multiGet([
        'access_token', 'refresh_token', 'user', 'expires_at'
      ]);
      console.log('🔍 [AUTH SERVICE] Token storage verification:', {
        access_token: !!verification[0][1],
        refresh_token: !!verification[1][1],
        user: !!verification[2][1],
        expires_at: verification[3][1]
      });
    } catch (error) {
      console.error('❌ Failed to store tokens:', error);
    }
  }

  private async clearTokens() {
    try {
      await AsyncStorage.multiRemove([
        'access_token',
        'refresh_token', 
        'user',
        'expires_at'
      ]);
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  // Public methods
  getState(): AuthState {
    return this.currentState;
  }

  onAuthStateChange(listener: AuthListener): () => void {
    this.listeners.push(listener);
    // Call immediately with current state
    listener(this.currentState);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  async sendMagicLink(email: string, firstName?: string, lastName?: string): Promise<{
    success: boolean;
    message: string;
    token?: string;
    error?: string;
    code?: string;
  }> {
    try {
      this.updateState({ isLoading: true });

      const response = await apiClient.sendMagicLink(email, firstName, lastName);
      
      if (response.error) {
        this.updateState({ isLoading: false });
        return {
          success: false,
          message: response.error,
          error: response.error,
          code: response.code,
        };
      }

      this.updateState({ isLoading: false });
      return {
        success: true,
        message: response.data?.message || 'Magic link sent successfully!',
        token: response.data?.token,
      };
    } catch (error) {
      this.updateState({ isLoading: false });
      console.error('Send magic link failed:', error);
      return {
        success: false,
        message: 'Failed to send magic link',
        error: 'NETWORK_ERROR',
      };
    }
  }

  async verifyMagicLink(token: string, type: 'signup' | 'signin'): Promise<{
    success: boolean;
    message: string;
    user?: User;
    error?: string;
    code?: string;
  }> {
    try {
      this.updateState({ isLoading: true });

      const response = await apiClient.verifyToken(token, type);
      
      if (response.error) {
        this.updateState({ isLoading: false });
        return {
          success: false,
          message: response.error,
          error: response.error,
          code: response.code,
        };
      }

      if (response.data?.session && response.data?.user) {
        await this.storeTokens(response.data.session);
        
        this.updateState({
          user: response.data.user,
          isAuthenticated: true,
          isLoading: false,
        });

        return {
          success: true,
          message: response.data.message || 'Authentication successful!',
          user: response.data.user,
        };
      }

      this.updateState({ isLoading: false });
      return {
        success: false,
        message: 'Invalid response from server',
        error: 'INVALID_RESPONSE',
      };
    } catch (error) {
      this.updateState({ isLoading: false });
      console.error('Verify magic link failed:', error);
      return {
        success: false,
        message: 'Failed to verify magic link',
        error: 'NETWORK_ERROR',
      };
    }
  }

  async googleSignIn(idToken: string, userData: {
    id: string;
    email: string;
    name: string;
    photo?: string;
    givenName?: string;
    familyName?: string;
  }): Promise<{
    success: boolean;
    message: string;
    user?: User;
    error?: string;
    code?: string;
  }> {
    try {
      this.updateState({ isLoading: true });

      const response = await apiClient.googleAuth(idToken, userData);
      
      // Debug: Log the EXACT response structure before any processing
      console.log('🔍 Google OAuth RAW response:', {
        hasData: !!response.data,
        hasError: !!response.error,
        error: response.error,
        code: response.code,
        dataKeys: response.data ? Object.keys(response.data) : null,
        fullResponseData: response.data
      });
      
      if (response.error) {
        console.log('❌ Google OAuth failed with error:', response.error);
        this.updateState({ isLoading: false });
        return {
          success: false,
          message: response.error,
          error: response.error,
          code: response.code,
        };
      }

      // Debug: Check what's actually in response.data
      console.log('🔍 Checking token storage condition:', {
        hasResponseData: !!response.data,
        hasSession: !!response.data?.session,
        hasUser: !!response.data?.user,
        sessionValue: response.data?.session,
        userValue: response.data?.user,
        conditionWillPass: !!(response.data?.session && response.data?.user)
      });

      if (response.data?.session && response.data?.user) {
        console.log('✅ Token storage condition passed - proceeding with token storage');
        console.log('🔍 Google OAuth response data:', {
          hasSession: !!response.data.session,
          hasUser: !!response.data.user,
          sessionKeys: Object.keys(response.data.session || {}),
          sessionStructure: {
            access_token: !!response.data.session?.access_token,
            refresh_token: !!response.data.session?.refresh_token,
            expires_in: response.data.session?.expires_in,
            expires_at: response.data.session?.expires_at,
            token_type: response.data.session?.token_type
          }
        });
        
        await this.storeTokens(response.data.session);
        
        this.updateState({
          user: response.data.user,
          isAuthenticated: true,
          isLoading: false,
        });

        return {
          success: true,
          message: response.data.message || 'Google sign-in successful!',
          user: response.data.user,
        };
      }

      console.log('❌ Token storage condition failed - response format mismatch');
      console.log('🔍 Expected: response.data.session AND response.data.user');
      console.log('🔍 Actual response.data structure:', JSON.stringify(response.data, null, 2));
      
      this.updateState({ isLoading: false });
      return {
        success: false,
        message: 'Invalid response from server - missing session or user data',
        error: 'INVALID_RESPONSE',
      };
    } catch (error) {
      this.updateState({ isLoading: false });
      console.error('Google sign-in failed:', error);
      return {
        success: false,
        message: 'Failed to sign in with Google',
        error: 'NETWORK_ERROR',
      };
    }
  }

  async signOut(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      this.updateState({ isLoading: true });

      // Call backend signout
      await apiClient.signOut();
      
      // Clear local tokens
      await this.clearTokens();
      
      this.updateState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      return {
        success: true,
        message: 'Signed out successfully',
      };
    } catch (error) {
      console.error('Sign out failed:', error);
      
      // Clear local tokens even if backend call failed
      await this.clearTokens();
      this.updateState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      return {
        success: true, // Still return success since local state is cleared
        message: 'Signed out successfully',
      };
    }
  }

  // Handle successful authentication (used by login flows)
  async handleSuccessfulAuth(session: AuthSession, user: User): Promise<void> {
    console.log('🔄 [AUTH SERVICE] Processing successful authentication...');
    await this.storeTokens(session);
    this.updateState({
      user: user,
      isAuthenticated: true,
      isLoading: false,
    });
    console.log('✅ [AUTH SERVICE] Authentication processing complete');
  }

  async refreshTokenIfNeeded(): Promise<boolean> {
    try {
      const expiresAt = await AsyncStorage.getItem('expires_at');
      if (!expiresAt) return false;

      const expirationTime = parseInt(expiresAt, 10);
      const now = Date.now();
      
      // Refresh if token expires in the next 5 minutes
      if (expirationTime - now < 5 * 60 * 1000) {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (!refreshToken) return false;

        const response = await apiClient.refreshToken(refreshToken);
        if (response.data?.session) {
          await this.storeTokens(response.data.session);
          this.updateState({
            user: response.data.session.user,
            isAuthenticated: true,
          });
          return true;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await this.signOut();
      return false;
    }
  }
}

export const authService = new AuthService();
export default authService;