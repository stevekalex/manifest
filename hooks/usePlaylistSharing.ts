import { useCallback } from 'react';
import { Share } from 'react-native';
import type { Playlist, PlaylistSharingResult, PlaylistSharingOptions } from '../types/audio';

const BASE_SHARE_URL = 'https://manifest-app.com';

export function usePlaylistSharing() {
  const generatePlaylistUrl = useCallback((playlistId: string): string => {
    return `${BASE_SHARE_URL}/playlist/${playlistId}`;
  }, []);

  const generateShareMessage = useCallback((
    playlist: Playlist, 
    options?: PlaylistSharingOptions
  ): string => {
    const { includeDescription = true, customMessage } = options || {};
    
    if (customMessage) {
      return customMessage;
    }

    let message = `Check out "${playlist.name}" - a meditation playlist`;
    
    if (includeDescription && playlist.description) {
      message += `\n\n${playlist.description}`;
    }
    
    message += `\n\n${generatePlaylistUrl(playlist.id)}`;
    
    return message;
  }, [generatePlaylistUrl]);

  const sharePlaylist = useCallback(async (
    playlist: Playlist,
    options?: PlaylistSharingOptions
  ): Promise<PlaylistSharingResult> => {
    try {
      const message = generateShareMessage(playlist, options);
      
      const result = await Share.share({
        message: message,
        url: generatePlaylistUrl(playlist.id),
        title: `Share ${playlist.name}`
      });

      if (result.action === Share.dismissedAction) {
        return {
          success: false,
          error: 'Share was cancelled'
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to share playlist'
      };
    }
  }, [generatePlaylistUrl, generateShareMessage]);

  const sharePlaylistWithCustomText = useCallback(async (
    playlist: Playlist,
    customText: string
  ): Promise<PlaylistSharingResult> => {
    try {
      const fullMessage = `${customText}\n\n${generatePlaylistUrl(playlist.id)}`;
      
      const result = await Share.share({
        message: fullMessage,
        url: generatePlaylistUrl(playlist.id),
        title: `Share ${playlist.name}`
      });

      if (result.action === Share.dismissedAction) {
        return {
          success: false,
          error: 'Share was cancelled'
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to share playlist'
      };
    }
  }, [generatePlaylistUrl]);

  return {
    sharePlaylist,
    sharePlaylistWithCustomText,
    generatePlaylistUrl,
    generateShareMessage
  };
}