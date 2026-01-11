import { describe, it, expect } from 'vitest';
import {
  getSubSpecStyle,
  formatSubSpecName,
} from '../sub-spec-utils';
import {
  Palette,
  Map,
  Code,
  TestTube,
  CheckSquare,
  Wrench,
  GitBranch,
  TrendingUp,
  FileText,
} from 'lucide-react';

describe('sub-spec-utils', () => {
  describe('getSubSpecStyle', () => {
    it('should return Design icon for design-related files', () => {
      expect(getSubSpecStyle('DESIGN.md')).toEqual({
        icon: Palette,
        color: 'text-purple-600',
      });
      expect(getSubSpecStyle('ui-mockup.md').icon).toBe(Palette);
      expect(getSubSpecStyle('wireframe-details.md').icon).toBe(Palette);
    });

    it('should return Architecture icon for architecture files', () => {
      expect(getSubSpecStyle('ARCHITECTURE.md')).toEqual({
        icon: Map,
        color: 'text-indigo-600',
      });
      // "system-design" matches "system" first (architecture pattern)
      expect(getSubSpecStyle('system-architecture.md').icon).toBe(Map);
    });

    it('should return Code icon for implementation files', () => {
      expect(getSubSpecStyle('IMPLEMENTATION.md')).toEqual({
        icon: Code,
        color: 'text-green-600',
      });
      expect(getSubSpecStyle('development-plan.md').icon).toBe(Code);
    });

    it('should return API icon for API-related files', () => {
      expect(getSubSpecStyle('API.md')).toEqual({
        icon: Code,
        color: 'text-blue-600',
      });
      expect(getSubSpecStyle('endpoints.md').icon).toBe(Code);
    });

    it('should return TestTube icon for test files', () => {
      expect(getSubSpecStyle('TESTING.md')).toEqual({
        icon: TestTube,
        color: 'text-orange-600',
      });
      expect(getSubSpecStyle('qa-plan.md').icon).toBe(TestTube);
    });

    it('should return CheckSquare icon for task files', () => {
      expect(getSubSpecStyle('TASKS.md')).toEqual({
        icon: CheckSquare,
        color: 'text-gray-600',
      });
      expect(getSubSpecStyle('checklist.md').icon).toBe(CheckSquare);
    });

    it('should return Wrench icon for config files', () => {
      expect(getSubSpecStyle('CONFIGURATION.md')).toEqual({
        icon: Wrench,
        color: 'text-yellow-600',
      });
      expect(getSubSpecStyle('environment-setup.md').icon).toBe(Wrench);
    });

    it('should return GitBranch icon for migration files', () => {
      expect(getSubSpecStyle('MIGRATION.md')).toEqual({
        icon: GitBranch,
        color: 'text-cyan-600',
      });
      expect(getSubSpecStyle('refactor-plan.md').icon).toBe(GitBranch);
    });

    it('should return TrendingUp icon for performance files', () => {
      expect(getSubSpecStyle('PERFORMANCE.md')).toEqual({
        icon: TrendingUp,
        color: 'text-green-600',
      });
      expect(getSubSpecStyle('optimization.md').icon).toBe(TrendingUp);
    });

    it('should return default icon for unknown files', () => {
      expect(getSubSpecStyle('random-notes.md')).toEqual({
        icon: FileText,
        color: 'text-gray-600',
      });
      expect(getSubSpecStyle('misc.md').icon).toBe(FileText);
    });

    it('should be case-insensitive', () => {
      expect(getSubSpecStyle('design.md').icon).toBe(Palette);
      expect(getSubSpecStyle('DESIGN.md').icon).toBe(Palette);
      expect(getSubSpecStyle('DeSiGn.md').icon).toBe(Palette);
    });
  });

  describe('formatSubSpecName', () => {
    it('should format uppercase markdown files', () => {
      expect(formatSubSpecName('IMPLEMENTATION.md')).toBe('Implementation');
      expect(formatSubSpecName('TESTING.md')).toBe('Testing');
    });

    it('should format hyphenated files', () => {
      expect(formatSubSpecName('api-design.md')).toBe('Api Design');
      expect(formatSubSpecName('code-structure.md')).toBe('Code Structure');
    });

    it('should format underscore-separated files', () => {
      expect(formatSubSpecName('api_endpoints.md')).toBe('Api Endpoints');
      expect(formatSubSpecName('test_plan.md')).toBe('Test Plan');
    });

    it('should handle mixed case files', () => {
      expect(formatSubSpecName('MixedCase.md')).toBe('Mixedcase');
      expect(formatSubSpecName('some-Mixed_file.md')).toBe('Some Mixed File');
    });

    it('should handle files without .md extension', () => {
      expect(formatSubSpecName('TESTING')).toBe('Testing');
      expect(formatSubSpecName('api-design')).toBe('Api Design');
    });

    it('should handle single word files', () => {
      expect(formatSubSpecName('design.md')).toBe('Design');
      expect(formatSubSpecName('API.md')).toBe('Api');
    });
  });
});
