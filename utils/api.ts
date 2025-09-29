import AsyncStorage from '@react-native-async-storage/async-storage';
import { audioLog, audioWarn, audioError } from './logger';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

// API Configuration
const API_CONFIG = {
  TIMEOUT_MS: 20000, // 20 second timeout
  MAX_RETRIES: 3,
  RETRY_DELAYS: [1000, 2000, 4000], // Exponential backoff: 1s, 2s, 4s
  CIRCUIT_BREAKER_THRESHOLD: 5, // Fail after 5 consecutive errors
  CIRCUIT_BREAKER_RESET_TIME: 30000, // Reset circuit after 30 seconds
} as const;

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
  private failureCount = 0;
  private lastFailureTime = 0;
  private isCircuitOpen = false;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem('access_token');
      audioLog('[API] Retrieved auth token:', { 
        hasToken: !!token, 
        tokenLength: token?.length,
        tokenPrefix: token?.substring(0, 20) + '...'
      });
      return token;
    } catch (error) {
      audioError('[API] Failed to get auth token:', error);
      return null;
    }
  }

  private isCircuitBreakerOpen(): boolean {
    if (!this.isCircuitOpen) return false;
    
    // Reset circuit breaker after timeout
    if (Date.now() - this.lastFailureTime > API_CONFIG.CIRCUIT_BREAKER_RESET_TIME) {
      audioLog('[API] Circuit breaker reset - allowing requests');
      this.isCircuitOpen = false;
      this.failureCount = 0;
      return false;
    }
    
    return true;
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= API_CONFIG.CIRCUIT_BREAKER_THRESHOLD) {
      this.isCircuitOpen = true;
      audioWarn(`[API] Circuit breaker opened after ${this.failureCount} failures`);
    }
  }

  private recordSuccess(): void {
    if (this.failureCount > 0) {
      audioLog('[API] Request succeeded - resetting failure count');
    }
    this.failureCount = 0;
    this.isCircuitOpen = false;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async requestWithTimeout<T>(
    endpoint: string,
    options: RequestInit & { requireAuth?: boolean } = {},
    attempt = 1
  ): Promise<ApiResponse<T>> {
    // Check circuit breaker
    if (this.isCircuitBreakerOpen()) {
      return {
        error: 'Service temporarily unavailable - circuit breaker is open',
        code: 'CIRCUIT_BREAKER_OPEN'
      };
    }

    const { requireAuth = false, ...requestOptions } = options;
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    
    // Set up timeout
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, API_CONFIG.TIMEOUT_MS);

    try {
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
          audioLog('[API] Added Authorization header:', { 
            hasAuthHeader: true,
            tokenPrefix: token.substring(0, 20) + '...'
          });
        } else if (requireAuth) {
          audioLog('[API] No token available but auth required');
          return {
            error: 'Authentication required',
            code: 'UNAUTHORIZED'
          };
        }
      } else {
        audioLog('[API] No auth token available and not required');
      }

      const logBody = requestOptions.body ? { hasBody: true } : '';
      audioLog(`[API] ${requestOptions.method || 'GET'} ${url} (attempt ${attempt}/${API_CONFIG.MAX_RETRIES})`, logBody);

      const response = await fetch(url, {
        ...requestOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle 204 No Content gracefully
      if (response.status === 204) {
        audioLog(`[API] Response ${response.status}: (no content)`);
        this.recordSuccess();
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
      
      audioLog(`[API] Response ${response.status}:`, data ? { hasData: true } : { hasData: false });

      if (!response.ok) {
        const error = {
          error: data?.error || `HTTP ${response.status}: ${response.statusText}`,
          code: data?.code || 'REQUEST_FAILED'
        };
        
        // Record failure for circuit breaker
        this.recordFailure();
        
        return error;
      }

      this.recordSuccess();
      return { data };
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Handle abort/timeout specifically
      if (error instanceof Error && error.name === 'AbortError') {
        audioError(`[API] Request timeout after ${API_CONFIG.TIMEOUT_MS}ms:`, { url, attempt });
        this.recordFailure();
        return {
          error: `Request timeout after ${API_CONFIG.TIMEOUT_MS / 1000} seconds`,
          code: 'TIMEOUT_ERROR'
        };
      }
      
      audioError(`[API] Request failed:`, { error: error instanceof Error ? error.message : error, url, attempt });
      this.recordFailure();
      
      return {
        error: error instanceof Error ? error.message : 'Network error occurred',
        code: 'NETWORK_ERROR'
      };
    }
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit & { requireAuth?: boolean } = {}
  ): Promise<ApiResponse<T>> {
    let lastError: ApiResponse<T> | null = null;
    
    for (let attempt = 1; attempt <= API_CONFIG.MAX_RETRIES; attempt++) {
      const result = await this.requestWithTimeout<T>(endpoint, options, attempt);
      
      // Success - return immediately
      if (!result.error) {
        if (attempt > 1) {
          audioLog(`[API] Request succeeded on attempt ${attempt}`);
        }
        return result;
      }
      
      lastError = result;
      
      // Don't retry on auth errors or circuit breaker
      if (result.code === 'UNAUTHORIZED' || result.code === 'CIRCUIT_BREAKER_OPEN') {
        return result;
      }
      
      // Don't retry on final attempt
      if (attempt === API_CONFIG.MAX_RETRIES) {
        audioWarn(`[API] All ${API_CONFIG.MAX_RETRIES} attempts failed for ${endpoint}`);
        return result;
      }
      
      // Wait before retry (exponential backoff)
      const delay = API_CONFIG.RETRY_DELAYS[attempt - 1] || API_CONFIG.RETRY_DELAYS[API_CONFIG.RETRY_DELAYS.length - 1];
      audioLog(`[API] Retrying in ${delay}ms... (${result.error})`);
      await this.sleep(delay);
    }
    
    return lastError!;
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

  async googleAuth(idToken: string, userData: {
    id: string;
    email: string;
    name: string;
    photo?: string;
    givenName?: string;
    familyName?: string;
  }): Promise<ApiResponse<{
    user: any;
    session: any;
    message: string;
  }>> {
    return this.post('/auth/google', { idToken, user: userData });
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

  // Playlist search methods
  async getAllPlaylists(params?: { 
    search?: string; 
    limit?: number; 
    offset?: number; 
  }): Promise<ApiResponse<{
    id: string;
    slug: string;
    name: string;
    description?: string;
    created_at: string;
  }[]>> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const queryString = queryParams.toString();
    const endpoint = `/playlists${queryString ? `?${queryString}` : ''}`;
    
    return this.get(endpoint);
  }

  async searchPlaylists(query: string, limit = 50): Promise<ApiResponse<{
    id: string;
    slug: string;
    name: string;
    description?: string;
    created_at: string;
  }[]>> {
    return this.getAllPlaylists({ search: query, limit });
  }

  // Settings methods
  async getSettings(): Promise<ApiResponse<{
    settings: {
      dark_mode: boolean;
      notifications: boolean;
      default_volume: number;
      delay_between_affirmations: number;
      updated_at: string;
    };
  }>> {
    return this.get('/settings', true);
  }

  async updateSettings(settings: {
    dark_mode?: boolean;
    notifications?: boolean;
    default_volume?: number;
    delay_between_affirmations?: number;
  }): Promise<ApiResponse<{
    settings: {
      dark_mode: boolean;
      notifications: boolean;
      default_volume: number;
      delay_between_affirmations: number;
      updated_at: string;
    };
    message: string;
  }>> {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
      requireAuth: true
    });
  }
}

export const apiClient = new ApiClient();