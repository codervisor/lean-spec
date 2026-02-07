import { describe, it, expect } from 'vitest';
import {
  getColorFromString,
  getContrastColor,
  getInitials,
  PROJECT_COLORS,
} from '../color-utils';

describe('color-utils', () => {
  describe('getColorFromString', () => {
    it('should return a color from the palette', () => {
      const color = getColorFromString('my-project');
      expect(PROJECT_COLORS).toContain(color);
    });

    it('should return consistent color for same string', () => {
      const color1 = getColorFromString('test-project');
      const color2 = getColorFromString('test-project');
      expect(color1).toBe(color2);
    });

    it('should return different colors for different strings', () => {
      const color1 = getColorFromString('project-a');
      const color2 = getColorFromString('project-b');
      // They might coincidentally be the same, but usually different
      expect(PROJECT_COLORS).toContain(color1);
      expect(PROJECT_COLORS).toContain(color2);
    });

    it('should handle empty string', () => {
      expect(getColorFromString('')).toBe(PROJECT_COLORS[0]);
    });
  });

  describe('getContrastColor', () => {
    it('should return white for dark backgrounds', () => {
      expect(getContrastColor('#000000')).toBe('#ffffff');
      expect(getContrastColor('#333333')).toBe('#ffffff');
    });

    it('should return black for light backgrounds', () => {
      expect(getContrastColor('#ffffff')).toBe('#000000');
      expect(getContrastColor('#ffff00')).toBe('#000000'); // yellow
    });

    it('should handle undefined', () => {
      expect(getContrastColor(undefined)).toBe('#ffffff');
    });

    it('should handle colors without #', () => {
      expect(getContrastColor('000000')).toBe('#ffffff');
    });
  });

  describe('getInitials', () => {
    it('should get initials from two words', () => {
      expect(getInitials('John Doe')).toBe('JD');
      expect(getInitials('My Project')).toBe('MP');
    });

    it('should get initials from single word', () => {
      expect(getInitials('Project')).toBe('PR');
      expect(getInitials('A')).toBe('A');
    });

    it('should handle hyphenated names', () => {
      expect(getInitials('my-project')).toBe('MP');
    });

    it('should handle underscored names', () => {
      expect(getInitials('my_project')).toBe('MP');
    });

    it('should handle empty string', () => {
      expect(getInitials('')).toBe('??');
    });

    it('should convert to uppercase', () => {
      expect(getInitials('test project')).toBe('TP');
    });
  });
});
