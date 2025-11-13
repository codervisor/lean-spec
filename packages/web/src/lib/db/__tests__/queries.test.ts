/**
 * Unit tests for database queries
 * 
 * Note: These tests verify the structure and types of query functions.
 * They operate on an empty in-memory database and test that queries
 * return the expected format (empty arrays/objects with correct structure).
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../schema';

// Create in-memory test database
let testDb: BetterSQLite3Database<typeof schema>;
let sqlite: Database.Database;

beforeAll(() => {
  sqlite = new Database(':memory:');
  testDb = drizzle(sqlite, { schema });
  
  // Create tables for testing
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      github_owner TEXT NOT NULL,
      github_repo TEXT NOT NULL,
      display_name TEXT,
      description TEXT,
      homepage_url TEXT,
      stars INTEGER DEFAULT 0,
      is_public INTEGER DEFAULT 1,
      is_featured INTEGER DEFAULT 0,
      last_synced_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS specs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      spec_number INTEGER,
      spec_name TEXT NOT NULL,
      title TEXT,
      status TEXT CHECK(status IN ('planned', 'in-progress', 'complete', 'archived')),
      priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'critical')),
      tags TEXT,
      assignee TEXT,
      content_md TEXT NOT NULL,
      content_html TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      completed_at INTEGER,
      file_path TEXT NOT NULL,
      github_url TEXT,
      synced_at INTEGER NOT NULL
    );
    
    CREATE UNIQUE INDEX IF NOT EXISTS unique_spec_number ON specs(project_id, spec_number);
  `);
});

// Mock the database module
vi.mock('../index', () => ({
  get db() {
    return testDb;
  },
  schema,
}));

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
