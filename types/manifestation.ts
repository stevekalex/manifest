/**
 * Manifestation Types
 * 
 * Represents affirmation audio tracks stored in the CDN
 * Each manifestation links a playlist to an audio file with its text content
 */

export interface AudioVersion {
  id: string;
  voice_id: string;
  cdn_key: string;
  cdn_url: string;
}

export interface Manifestation {
  id: string;
  playlist_id?: string;    // Legacy field, optional in new format
  cdn_url?: string;        // Legacy field, optional in new format  
  content: string;         // Text content of the affirmation
  created_at?: string;
  updated_at?: string;
  audio_versions?: AudioVersion[];  // New multi-voice support
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