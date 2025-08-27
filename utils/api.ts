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
      
      const headers: Record<string, string> = {};
      // Merge any provided headers (only string-string pairs)
      if (requestOptions.headers && typeof requestOptions.headers === 'object') {
        Object.entries(requestOptions.headers as Record<string, string>).forEach(([k, v]) => {
          headers[k] = String(v);
        });
      }
      // Only set JSON content-type when a body is present
      if (requestOptions.body !== undefined) {
        headers['Content-Type'] = 'application/json';
      }

      // Add auth token if required or available
      const token = await this.getAuthToken();
      if (requireAuth || token) {
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

      // Handle 204 No Content gracefully
      if (response.status === 204) {
        console.log(`📡 API Response ${response.status}: (no content)`);
        return { data: undefined as unknown as T };
      }

      let data: any = undefined;
      try {
        // Some endpoints may return empty body with 200; guard parsing
        const text = await response.text();
        data = text ? JSON.parse(text) : undefined;
      } catch {
        // Non-JSON or empty body; keep data undefined
        data = undefined;
      }
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

  // Liked playlists methods
  async likePlaylist(playlistId: string): Promise<ApiResponse<{
    user_id: string;
    playlist_id: string;
    created_at: string;
  }>> {
    return this.post('/liked-playlists', { playlist_id: playlistId }, true);
  }

  async unlikePlaylist(playlistId: string): Promise<ApiResponse<void>> {
    return this.request(`/liked-playlists/${playlistId}`, {
      method: 'DELETE',
      requireAuth: true
    });
  }

  async getLikedPlaylists(): Promise<ApiResponse<{
    user_id: string;
    playlist_id: string;
    created_at: string;
    playlists: {
      id: string;
      slug: string;
      name: string;
      description?: string;
      created_at: string;
    };
  }[]>> {
    return this.get('/liked-playlists', true);
  }

  async checkPlaylistLikedStatus(playlistId: string): Promise<ApiResponse<{
    isLiked: boolean;
  }>> {
    return this.get(`/liked-playlists/${playlistId}/status`, true);
  }
}

export const apiClient = new ApiClient();