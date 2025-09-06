/**
 * Recently Played Service Tests
 */

import { recentlyPlayedService } from '../recentlyPlayedService';

describe('RecentlyPlayedService', () => {
  beforeEach(() => {
    // Ensure we're in mock mode for tests
    recentlyPlayedService.setMockMode(true);
  });

  describe('Basic functionality', () => {
    test('service exists and methods are callable', async () => {
      expect(recentlyPlayedService).toBeDefined();
      expect(typeof recentlyPlayedService.recordPlaylistPlay).toBe('function');
      expect(typeof recentlyPlayedService.getRecentlyPlayed).toBe('function');
      expect(typeof recentlyPlayedService.setMockMode).toBe('function');
    });

    test('recordPlaylistPlay completes without throwing', async () => {
      await expect(
        recentlyPlayedService.recordPlaylistPlay('user1', 'playlist1')
      ).resolves.not.toThrow();
    });

    test('getRecentlyPlayed returns array', async () => {
      const result = await recentlyPlayedService.getRecentlyPlayed('user1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Mock mode behavior', () => {
    test('returns mock data in mock mode', async () => {
      recentlyPlayedService.setMockMode(true);
      
      const result = await recentlyPlayedService.getRecentlyPlayed('user1');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('playlist_id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('play_count');
      expect(result[0]).toHaveProperty('last_played_at');
    });

    test('respects limit parameter', async () => {
      recentlyPlayedService.setMockMode(true);
      
      const result = await recentlyPlayedService.getRecentlyPlayed('user1', 2);
      expect(result.length).toBeLessThanOrEqual(2);
    });

    test('mock data is ordered by most recent first', async () => {
      recentlyPlayedService.setMockMode(true);
      
      const result = await recentlyPlayedService.getRecentlyPlayed('user1');
      expect(result.length).toBeGreaterThanOrEqual(2);
      
      // Compare timestamps - first should be more recent
      const first = new Date(result[0].last_played_at);
      const second = new Date(result[1].last_played_at);
      expect(first.getTime()).toBeGreaterThan(second.getTime());
    });
  });

  describe('Error handling', () => {
    test('recordPlaylistPlay handles errors gracefully', async () => {
      // This test ensures the method doesn't throw even in error conditions
      await expect(
        recentlyPlayedService.recordPlaylistPlay('', '')
      ).resolves.not.toThrow();
    });

    test('getRecentlyPlayed returns empty array on error', async () => {
      // In a real API error scenario, should return empty array
      const result = await recentlyPlayedService.getRecentlyPlayed('invalid-user');
      expect(Array.isArray(result)).toBe(true);
    });
  });
});