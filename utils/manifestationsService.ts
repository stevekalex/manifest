import { apiClient, ApiResponse } from './api';
import type { 
  Manifestation, 
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