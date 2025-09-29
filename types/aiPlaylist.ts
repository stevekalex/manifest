export interface AIGeneratedAffirmation {
  id: string;
  content: string;
  order_index: number;
}

export interface AIGeneratedPlaylist {
  id: string;
  name: string;
  subtitle: string;
  affirmations: AIGeneratedAffirmation[];
  user_prompt: string;
  created_at?: string;
}

export interface GeneratePlaylistRequest {
  prompt: string;
}

export interface GeneratePlaylistResponse {
  id: string;
  name: string;
  subtitle: string;
  affirmations: AIGeneratedAffirmation[];
  user_prompt: string;
}

export interface AIPlaylistError {
  error: string;
  code: string;
}