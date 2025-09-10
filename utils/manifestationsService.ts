import { apiClient, ApiResponse } from './api';
import type { 
  Manifestation, 
  AudioVersion,
  CreateManifestationDto, 
  UpdateManifestationDto,
  ManifestationsResponse 
} from '../types/manifestation';

class ManifestationsService {
  private basePath = '/api/v1/manifestations';

  /**
   * Get all manifestations
   */
  async getAll(): Promise<ApiResponse<ManifestationsResponse>> {
    return apiClient.get<ManifestationsResponse>(this.basePath);
  }

  /**
   * Get manifestations by playlist ID
   */
  async getByPlaylistId(playlistId: string): Promise<ApiResponse<ManifestationsResponse>> {
    return apiClient.get<ManifestationsResponse>(`${this.basePath}?playlist_id=${playlistId}`);
  }

  /**
   * Get a single manifestation by ID
   */
  async getById(id: string): Promise<ApiResponse<Manifestation>> {
    return apiClient.get<Manifestation>(`${this.basePath}/${id}`);
  }

  /**
   * Create a new manifestation
   */
  async create(data: CreateManifestationDto): Promise<ApiResponse<Manifestation>> {
    return apiClient.post<Manifestation>(this.basePath, data);
  }

  /**
   * Update an existing manifestation
   */
  async update(id: string, data: UpdateManifestationDto): Promise<ApiResponse<Manifestation>> {
    return apiClient.put<Manifestation>(`${this.basePath}/${id}`, data);
  }

  /**
   * Delete a manifestation
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.basePath}/${id}`);
  }

  /**
   * Bulk create manifestations
   * Useful for uploading multiple affirmations at once
   */
  async bulkCreate(manifestations: CreateManifestationDto[]): Promise<ApiResponse<ManifestationsResponse>> {
    return apiClient.post<ManifestationsResponse>(`${this.basePath}/bulk`, {
      manifestations
    });
  }
}

export const manifestationsService = new ManifestationsService();

/**
 * Compatibility Helper Functions
 * Support both old (cdn_url) and new (audio_versions) API formats
 */

/**
 * Get CDN URL from either old or new manifestation format
 * @param manifestation - Manifestation object (old or new format)
 * @param voiceId - Voice ID to select (defaults to 'rachel')
 * @returns CDN URL string
 */
export function getCompatibleCdnUrl(manifestation: Manifestation, voiceId = 'rachel'): string {
  // Safety check
  if (!manifestation) {
    console.warn('[COMPATIBILITY] Received undefined manifestation');
    return '';
  }

  // New format: audio_versions array
  if (manifestation.audio_versions && manifestation.audio_versions.length > 0) {
    // Try to find requested voice
    const audioVersion = manifestation.audio_versions.find(av => av.voice_id === voiceId);
    if (audioVersion) {
      return audioVersion.cdn_url;
    }
    
    // Fallback to first available voice
    return manifestation.audio_versions[0].cdn_url;
  }
  
  // Old format: direct cdn_url
  return manifestation.cdn_url || '';
}

/**
 * Get all available voice IDs from a manifestation
 * @param manifestation - Manifestation object
 * @returns Array of voice ID strings
 */
export function getAvailableVoices(manifestation: Manifestation): string[] {
  if (manifestation.audio_versions && manifestation.audio_versions.length > 0) {
    return manifestation.audio_versions.map(av => av.voice_id);
  }
  
  // Old format: assume single default voice
  return ['rachel']; // Default voice for legacy format
}

/**
 * Get audio version object for specific voice
 * @param manifestation - Manifestation object
 * @param voiceId - Voice ID to find
 * @returns AudioVersion object or null if not found
 */
export function getAudioVersion(manifestation: Manifestation, voiceId: string) {
  if (manifestation.audio_versions) {
    return manifestation.audio_versions.find(av => av.voice_id === voiceId) || null;
  }
  
  // Old format: create compatible AudioVersion-like object
  if (manifestation.cdn_url) {
    return {
      id: manifestation.id + '-legacy',
      voice_id: 'rachel',
      cdn_key: manifestation.id + '-rachel',
      cdn_url: manifestation.cdn_url
    };
  }
  
  return null;
}