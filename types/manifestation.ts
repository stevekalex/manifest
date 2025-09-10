/**
 * Manifestation Types
 * 
 * Represents affirmation audio tracks stored in the CDN
 * Each manifestation links a playlist to an audio file with its text content
 */

export interface Manifestation {
  id: string;
  playlist_id: string;
  cdn_url: string;    // CDN URL or relative path to audio file
  content: string;    // Text content of the affirmation
  created_at?: string;
  updated_at?: string;
}

export interface CreateManifestationDto {
  playlist_id: string;
  cdn_url: string;
  content: string;
}

export interface UpdateManifestationDto {
  cdn_url?: string;
  content?: string;
}

export interface ManifestationsResponse {
  manifestations: Manifestation[];
  total?: number;
}