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
      expect(result).toEqual(mockResponse);
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
        { name: 'spec-001', title: 'Test Spec', status: 'planned' as const },
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
        name: 'spec-001',
        title: 'Test Spec',
        status: 'planned' as const,
        content: '# Test',
        metadata: {},
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ spec: mockSpec }),
      });

      const result = await api.getSpec('spec-001');
      expect(result).toEqual(mockSpec);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/specs/spec-001'),
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
        expect.stringContaining('/api/specs/spec-001'),
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
        total: 10,
        by_status: { planned: 5, 'in-progress': 3, complete: 2 },
        by_priority: { high: 3, medium: 4, low: 3 },
        by_tag: { frontend: 5, backend: 5 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stats: mockStats }),
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
        expect.stringContaining('/api/specs/spec-001/dependencies'),
        expect.any(Object)
      );
    });
  });
});
