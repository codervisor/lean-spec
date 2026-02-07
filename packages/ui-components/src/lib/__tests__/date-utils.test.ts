import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatDuration,
} from '../date-utils';

describe('date-utils', () => {
  describe('formatDate', () => {
    it('should format a date string', () => {
      const result = formatDate('2025-11-12');
      expect(result).toMatch(/Nov 12, 2025/);
    });

    it('should return Unknown for null date', () => {
      expect(formatDate(null)).toBe('Unknown');
      expect(formatDate(undefined)).toBe('Unknown');
    });

    it('should return Chinese unknown for Chinese locale', () => {
      expect(formatDate(null, 'zh-CN')).toBe('未知');
    });
  });

  describe('formatDateTime', () => {
    it('should format a date with time', () => {
      const result = formatDateTime('2025-11-12T10:30:00');
      expect(result).toContain('Nov 12, 2025');
    });

    it('should return Unknown for null date', () => {
      expect(formatDateTime(null)).toBe('Unknown');
    });
  });

  describe('formatRelativeTime', () => {
    it('should return relative time', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(yesterday);
      expect(result).toMatch(/day|hour|ago/i);
    });

    it('should return Unknown for null date', () => {
      expect(formatRelativeTime(null)).toBe('Unknown');
    });
  });

  describe('formatDuration', () => {
    it('should format duration for hours', () => {
      const start = new Date('2025-11-12T10:00:00');
      const end = new Date('2025-11-12T15:00:00');
      expect(formatDuration(start, end)).toBe('5h');
    });

    it('should format duration for days', () => {
      const start = new Date('2025-11-10');
      const end = new Date('2025-11-15');
      expect(formatDuration(start, end)).toBe('5d');
    });

    it('should return empty string for null dates', () => {
      expect(formatDuration(null, null)).toBe('');
      expect(formatDuration('2025-11-10', null)).toBe('');
    });

    it('should return empty string for negative duration', () => {
      const start = new Date('2025-11-15');
      const end = new Date('2025-11-10');
      expect(formatDuration(start, end)).toBe('');
    });
  });
});
