import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  code?: string;
  message?: string;
}

export interface ApiError {
  message: string;
  status?: number;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('access_token');
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit & { requireAuth?: boolean } = {}
  ): Promise<ApiResponse<T>> {
    try {
      const { requireAuth = false, ...requestOptions } = options;
      const url = `${this.baseUrl}${endpoint}`;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...requestOptions.headers,
      };

      // Add auth token if required or available
      if (requireAuth || await this.getAuthToken()) {
        const token = await this.getAuthToken();
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        } else if (requireAuth) {
          return {
            error: 'Authentication required',
            code: 'UNAUTHORIZED'
          };
        }
      }

      console.log(`🌐 API ${requestOptions.method || 'GET'} ${url}`, requestOptions.body ? { body: requestOptions.body } : '');

      const response = await fetch(url, {
        ...requestOptions,
        headers,
      });

      const data = await response.json();
      console.log(`📡 API Response ${response.status}:`, data);

      if (!response.ok) {
        return {
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
          code: data.code || 'REQUEST_FAILED'
        };
      }

      return { data };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        error: error instanceof Error ? error.message : 'Network error occurred',
        code: 'NETWORK_ERROR'
      };
    }
  }

  async get<T>(endpoint: string, requireAuth = false): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', requireAuth });
  }

  async post<T>(endpoint: string, body?: any, requireAuth = false): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      requireAuth
    });
  }

  // Auth-specific methods
  async sendMagicLink(email: string, firstName?: string, lastName?: string): Promise<ApiResponse<{
    message: string;
    email: string;
    magicLinkUrl?: string;
    token?: string;
  }>> {
    return this.post('/auth/magic-link', { email, firstName, lastName });
  }

  async verifyToken(token: string, type: 'signup' | 'signin'): Promise<ApiResponse<{
    user: any;
    session: any;
    message: string;
  }>> {
    return this.post('/auth/verify', { token, type });
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<{
    user: any;
    session: any;
  }>> {
    return this.post('/auth/refresh', { refreshToken });
  }

  async signOut(): Promise<ApiResponse<{ message: string }>> {
    return this.post('/auth/signout', {}, true);
  }

  async getProfile(): Promise<ApiResponse<{ user: any }>> {
    return this.get('/auth/profile', true);
  }

  async checkAuthStatus(): Promise<ApiResponse<{
    authenticated: boolean;
    user: any | null;
    message: string;
  }>> {
    return this.get('/auth/status');
  }
}

export const apiClient = new ApiClient();