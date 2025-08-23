import { getAllThemes, getThemeById, getThemeByName, getFeaturedThemes } from './themes';
import type { Theme } from '../types/audio';

describe('themes', () => {
  describe('getAllThemes', () => {
    it('should return all themes sorted by order', () => {
      const themes = getAllThemes();
      
      expect(themes).toHaveLength(4);
      expect(themes[0].id).toBe('just-for-you');
      expect(themes[1].id).toBe('popular-now');
      expect(themes[2].id).toBe('confidence-building');
      expect(themes[3].id).toBe('financial-success');
    });

    it('should return themes with required properties', () => {
      const themes = getAllThemes();
      
      themes.forEach((theme: Theme) => {
        expect(theme).toHaveProperty('id');
        expect(theme).toHaveProperty('name');
        expect(theme).toHaveProperty('playlists');
        expect(theme).toHaveProperty('order');
        expect(Array.isArray(theme.playlists)).toBe(true);
        expect(typeof theme.order).toBe('number');
      });
    });

    it('should return themes with nested playlist structure', () => {
      const themes = getAllThemes();
      const theme = themes[0];
      
      expect(theme.playlists.length).toBeGreaterThan(0);
      
      theme.playlists.forEach((playlist) => {
        expect(playlist).toHaveProperty('id');
        expect(playlist).toHaveProperty('name');
        expect(playlist).toHaveProperty('image');
        expect(typeof playlist.id).toBe('string');
        expect(typeof playlist.name).toBe('string');
      });
    });
  });

  describe('getThemeById', () => {
    it('should return theme when valid id is provided', () => {
      const theme = getThemeById('just-for-you');
      
      expect(theme).toBeDefined();
      expect(theme?.id).toBe('just-for-you');
      expect(theme?.name).toBe('Just For You');
    });

    it('should return undefined when invalid id is provided', () => {
      const theme = getThemeById('non-existent-theme');
      
      expect(theme).toBeUndefined();
    });

    it('should return undefined when empty id is provided', () => {
      const theme = getThemeById('');
      
      expect(theme).toBeUndefined();
    });
  });

  describe('getThemeByName', () => {
    it('should return theme when exact name is provided', () => {
      const theme = getThemeByName('Just For You');
      
      expect(theme).toBeDefined();
      expect(theme?.name).toBe('Just For You');
    });

    it('should return theme when partial name is provided', () => {
      const theme = getThemeByName('confident');
      
      expect(theme).toBeDefined();
      expect(theme?.name).toBe('Become Confident');
    });

    it('should return theme when case-insensitive name is provided', () => {
      const theme = getThemeByName('POPULAR');
      
      expect(theme).toBeDefined();
      expect(theme?.name).toBe('Popular Now');
    });

    it('should return undefined when invalid name is provided', () => {
      const theme = getThemeByName('non-existent-theme');
      
      expect(theme).toBeUndefined();
    });
  });

  describe('getFeaturedThemes', () => {
    it('should return first 3 themes', () => {
      const featuredThemes = getFeaturedThemes();
      
      expect(featuredThemes).toHaveLength(3);
      expect(featuredThemes[0].id).toBe('just-for-you');
      expect(featuredThemes[1].id).toBe('popular-now');
      expect(featuredThemes[2].id).toBe('confidence-building');
    });

    it('should return themes sorted by order', () => {
      const featuredThemes = getFeaturedThemes();
      
      for (let i = 1; i < featuredThemes.length; i++) {
        expect(featuredThemes[i].order).toBeGreaterThan(featuredThemes[i - 1].order);
      }
    });
  });
});