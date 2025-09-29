import type { GeneratePlaylistRequest, GeneratePlaylistResponse, AIPlaylistError } from '../types/aiPlaylist';
import { API_BASE_URL } from '../utils/api';

class AIPlaylistServiceClass {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async generatePlaylist(prompt: string): Promise<GeneratePlaylistResponse> {
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty');
    }

    if (prompt.length > 500) {
      throw new Error('Prompt cannot exceed 500 characters');
    }

    const request: GeneratePlaylistRequest = {
      prompt: prompt.trim()
    };

    try {
      const response = await fetch(`${this.baseUrl}/playlists/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add authentication headers when available
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('AI service is temporarily rate limited. Please try again in a moment.');
        }

        if (response.status >= 500) {
          throw new Error('AI service is temporarily unavailable. Please try again later.');
        }

        let errorMessage = 'Failed to generate playlist';
        try {
          const errorData: AIPlaylistError = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Fallback if error response isn't JSON
        }

        throw new Error(errorMessage);
      }

      const data: GeneratePlaylistResponse = await response.json();

      // Validate response structure
      if (!data.id || !data.name || !data.subtitle || !Array.isArray(data.affirmations)) {
        throw new Error('Invalid response format from server');
      }

      if (data.affirmations.length === 0) {
        throw new Error('No affirmations were generated');
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }

      // Handle network errors or other unknown errors
      throw new Error('Network error: Unable to connect to AI service');
    }
  }
}

export const AIPlaylistService = new AIPlaylistServiceClass();