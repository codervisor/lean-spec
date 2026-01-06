import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from './api';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProjects', () => {
    it('should fetch projects successfully', async () => {
      const mockResponse = {
        current: { id: 'proj1', name: 'Project 1', path: '/path/1' },
        available: [
          { id: 'proj1', name: 'Project 1', path: '/path/1' },
          { id: 'proj2', name: 'Project 2', path: '/path/2' },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.getProjects();
      expect(result).toEqual({
        current: {
          id: 'proj1',
          name: 'Project 1',
          displayName: 'Project 1',
          path: '/path/1',
          specsDir: '/path/1',
          favorite: false,
          color: null,
          description: null,
          lastAccessed: null,
        },
        available: [
          {
            id: 'proj1',
            name: 'Project 1',
            displayName: 'Project 1',
            path: '/path/1',
            specsDir: '/path/1',
            favorite: false,
            color: null,
            description: null,
            lastAccessed: null,
          },
          {
            id: 'proj2',
            name: 'Project 2',
            displayName: 'Project 2',
            path: '/path/2',
            specsDir: '/path/2',
            favorite: false,
            color: null,
            description: null,
            lastAccessed: null,
          },
        ],
        projects: [
          {
            id: 'proj1',
            name: 'Project 1',
            displayName: 'Project 1',
            path: '/path/1',
            specsDir: '/path/1',
            favorite: false,
            color: null,
            description: null,
            lastAccessed: null,
          },
          {
            id: 'proj2',
            name: 'Project 2',
            displayName: 'Project 2',
            path: '/path/2',
            specsDir: '/path/2',
            favorite: false,
            color: null,
            description: null,
            lastAccessed: null,
          },
        ],
      });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/projects'),
        expect.any(Object)
      );
    });

    it('should throw error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error',
      });

      await expect(api.getProjects()).rejects.toThrow();
    });
  });

  describe('getSpecs', () => {
    it('should fetch specs successfully', async () => {
      const mockSpecs = [
        {
          id: '123-feature',
          specName: '123-feature',
          specNumber: 123,
          title: 'Test Spec',
          status: 'planned' as const,
          priority: 'high' as const,
          tags: ['ui'],
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-02T00:00:00Z',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ specs: mockSpecs }),
      });

      const result = await api.getSpecs();
      expect(result).toEqual(mockSpecs);
    });
  });

  describe('getSpec', () => {
    it('should fetch spec details successfully', async () => {
      const mockSpec = {
        id: '123-feature',
        specName: '123-feature',
        specNumber: 123,
        title: 'Test Spec',
        status: 'planned' as const,
        priority: 'medium' as const,
        tags: ['backend'],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-03T00:00:00Z',
        content: '# Test',
        metadata: {
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-03T00:00:00Z',
        },
        dependsOn: [],
        requiredBy: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ spec: mockSpec }),
      });

      const result = await api.getSpec('123-feature');
      expect(result).toEqual(mockSpec);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/specs/123-feature'),
        expect.any(Object)
      );
    });
  });

  describe('updateSpec', () => {
    it('should update spec metadata successfully', async () => {
      const updates = { status: 'in-progress' as const, priority: 'high' as const };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await api.updateSpec('spec-001', updates);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/specs/spec-001/metadata'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(updates),
        })
      );
    });
  });

  describe('getStats', () => {
    it('should fetch stats successfully', async () => {
      const mockStats = {
        totalProjects: 1,
        totalSpecs: 10,
        specsByStatus: [
          { status: 'planned', count: 5 },
          { status: 'in-progress', count: 3 },
          { status: 'complete', count: 2 },
        ],
        specsByPriority: [
          { priority: 'high', count: 3 },
          { priority: 'medium', count: 4 },
          { priority: 'low', count: 3 },
        ],
        completionRate: 20,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      const result = await api.getStats();
      expect(result).toEqual(mockStats);
    });
  });

  describe('getDependencies', () => {
    it('should fetch dependency graph successfully', async () => {
      const mockGraph = {
        nodes: [
          { id: 'spec-001', name: 'Spec 001', status: 'planned' },
          { id: 'spec-002', name: 'Spec 002', status: 'in-progress' },
        ],
        edges: [
          { source: 'spec-001', target: 'spec-002', type: 'depends_on' as const },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ graph: mockGraph }),
      });

      const result = await api.getDependencies();
      expect(result).toEqual(mockGraph);
    });

    it('should fetch dependencies for specific spec', async () => {
      const mockGraph = {
        nodes: [],
        edges: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ graph: mockGraph }),
      });

      await api.getDependencies('spec-001');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/deps/spec-001'),
        expect.any(Object)
      );
    });
  });
});
