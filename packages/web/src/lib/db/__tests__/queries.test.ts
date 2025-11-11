/**
 * Unit tests for database queries
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getProjects, getSpecs, getStats, getSpecsByStatus } from '../queries';

describe('Database Queries', () => {
  describe('getProjects', () => {
    it('should return an array of projects', async () => {
      const projects = await getProjects();
      expect(Array.isArray(projects)).toBe(true);
    });

    it('should return projects with required fields', async () => {
      const projects = await getProjects();
      if (projects.length > 0) {
        const project = projects[0];
        expect(project).toHaveProperty('id');
        expect(project).toHaveProperty('githubOwner');
        expect(project).toHaveProperty('githubRepo');
        expect(project).toHaveProperty('displayName');
      }
    });
  });

  describe('getSpecs', () => {
    it('should return an array of specs', async () => {
      const specs = await getSpecs();
      expect(Array.isArray(specs)).toBe(true);
    });

    it('should parse tags as array', async () => {
      const specs = await getSpecs();
      if (specs.length > 0) {
        const specWithTags = specs.find(s => s.tags !== null);
        if (specWithTags) {
          expect(Array.isArray(specWithTags.tags)).toBe(true);
        }
      }
    });

    it('should return specs with required fields', async () => {
      const specs = await getSpecs();
      if (specs.length > 0) {
        const spec = specs[0];
        expect(spec).toHaveProperty('id');
        expect(spec).toHaveProperty('specName');
        expect(spec).toHaveProperty('status');
        expect(spec).toHaveProperty('priority');
      }
    });
  });

  describe('getStats', () => {
    it('should return stats object with required fields', async () => {
      const stats = await getStats();
      expect(stats).toHaveProperty('totalProjects');
      expect(stats).toHaveProperty('totalSpecs');
      expect(stats).toHaveProperty('specsByStatus');
      expect(stats).toHaveProperty('specsByPriority');
      expect(stats).toHaveProperty('completionRate');
    });

    it('should have valid numeric values', async () => {
      const stats = await getStats();
      expect(typeof stats.totalProjects).toBe('number');
      expect(typeof stats.totalSpecs).toBe('number');
      expect(typeof stats.completionRate).toBe('number');
      expect(stats.completionRate).toBeGreaterThanOrEqual(0);
      expect(stats.completionRate).toBeLessThanOrEqual(100);
    });

    it('should have valid status counts', async () => {
      const stats = await getStats();
      expect(Array.isArray(stats.specsByStatus)).toBe(true);
      stats.specsByStatus.forEach(statusCount => {
        expect(statusCount).toHaveProperty('status');
        expect(statusCount).toHaveProperty('count');
        expect(typeof statusCount.count).toBe('number');
      });
    });
  });

  describe('getSpecsByStatus', () => {
    it('should return specs filtered by status', async () => {
      const inProgressSpecs = await getSpecsByStatus('in-progress');
      expect(Array.isArray(inProgressSpecs)).toBe(true);
      inProgressSpecs.forEach(spec => {
        expect(spec.status).toBe('in-progress');
      });
    });

    it('should parse tags correctly for filtered specs', async () => {
      const specs = await getSpecsByStatus('in-progress');
      if (specs.length > 0) {
        const specWithTags = specs.find(s => s.tags !== null);
        if (specWithTags) {
          expect(Array.isArray(specWithTags.tags)).toBe(true);
        }
      }
    });
  });
});
