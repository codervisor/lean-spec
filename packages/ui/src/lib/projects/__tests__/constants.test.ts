/**
 * Tests for project constants
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PROJECT_ID,
  isDefaultProject,
  normalizeProjectId,
} from '../constants';

describe('DEFAULT_PROJECT_ID', () => {
  it('is "default"', () => {
    expect(DEFAULT_PROJECT_ID).toBe('default');
  });
});

describe('isDefaultProject', () => {
  it('returns true for undefined', () => {
    expect(isDefaultProject(undefined)).toBe(true);
  });

  it('returns true for null', () => {
    expect(isDefaultProject(null)).toBe(true);
  });

  it('returns true for empty string', () => {
    // Empty string is falsy, so treated as default
    expect(isDefaultProject('')).toBe(true);
  });

  it('returns true for "default"', () => {
    expect(isDefaultProject('default')).toBe(true);
  });

  it('returns false for other project IDs', () => {
    expect(isDefaultProject('my-project')).toBe(false);
    expect(isDefaultProject('abc123')).toBe(false);
  });
});

describe('normalizeProjectId', () => {
  it('returns DEFAULT_PROJECT_ID for undefined', () => {
    expect(normalizeProjectId(undefined)).toBe(DEFAULT_PROJECT_ID);
  });

  it('returns DEFAULT_PROJECT_ID for null', () => {
    expect(normalizeProjectId(null)).toBe(DEFAULT_PROJECT_ID);
  });

  it('returns DEFAULT_PROJECT_ID for "default"', () => {
    expect(normalizeProjectId('default')).toBe(DEFAULT_PROJECT_ID);
  });

  it('returns the projectId for other values', () => {
    expect(normalizeProjectId('my-project')).toBe('my-project');
    expect(normalizeProjectId('abc123')).toBe('abc123');
  });
});
