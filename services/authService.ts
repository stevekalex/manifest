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
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        // Verify token is still valid
        const response = await apiClient.checkAuthStatus();
        if (response.data?.authenticated && response.data.user) {
          this.updateState({
            user: response.data.user,
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        } else {
          // Token is invalid, clear it
          await this.clearTokens();
        }
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      await this.clearTokens();
    }

    this.updateState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }

  private updateState(newState: Partial<AuthState>) {
    this.currentState = { ...this.currentState, ...newState };
    this.listeners.forEach(listener => listener(this.currentState));
  }

  private async storeTokens(session: AuthSession) {
    try {
      await AsyncStorage.multiSet([
        ['access_token', session.access_token],
        ['refresh_token', session.refresh_token],
        ['user', JSON.stringify(session.user)],
        ['expires_at', String(Date.now() + (session.expires_in * 1000))],
      ]);
    } catch (error) {
      console.error('Failed to store tokens:', error);
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