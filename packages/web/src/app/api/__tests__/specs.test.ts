/**
 * Tests for spec API routes (Phase 3: Performance Testing)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import type { ParsedSpec } from '@/lib/db/service-queries';
import type { SubSpec } from '@/lib/sub-specs';

// Mock the service-queries module
vi.mock('@/lib/db/service-queries', () => ({
  getSpecById: vi.fn(),
}));

const createMockSpec = (overrides: Partial<ParsedSpec> = {}): ParsedSpec => ({
  id: 'fs-001-test-spec',
  projectId: 'leanspec',
  specNumber: 1,
  specName: '001-test-spec',
  title: 'Test Spec',
  status: 'planned',
  priority: 'high',
  tags: ['test'],
  assignee: null,
  contentMd: '# Test Spec',
  contentHtml: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-02'),
  completedAt: null,
  filePath: 'specs/001-test-spec/README.md',
  githubUrl: 'https://github.com/codervisor/lean-spec/tree/main/specs/001-test-spec/README.md',
  syncedAt: new Date('2025-01-03'),
  ...overrides,
});

describe('Spec API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/specs/[id]', () => {
    it('should return spec with cache headers', async () => {
      const { getSpecById } = await import('@/lib/db/service-queries');
      const { GET } = await import('@/app/api/specs/[id]/route');

      const mockSpec: ParsedSpec & { subSpecs: SubSpec[] } = {
        ...createMockSpec(),
        subSpecs: [],
      };

      vi.mocked(getSpecById).mockResolvedValue(mockSpec);

      const request = new Request('http://localhost/api/specs/1');
      const params = Promise.resolve({ id: '1' });
      const response = await GET(request, { params });

      expect(response).toBeInstanceOf(NextResponse);
      
      const json = await response.json();
      expect(json).toHaveProperty('spec');
      expect(json.spec.id).toBe(mockSpec.id);
      
      // Verify cache headers are present
      const cacheControl = response.headers.get('Cache-Control');
      expect(cacheControl).toContain('public');
      expect(cacheControl).toContain('s-maxage=60');
      expect(cacheControl).toContain('stale-while-revalidate=120');
    });

    it('should return 404 for non-existent spec', async () => {
      const { getSpecById } = await import('@/lib/db/service-queries');
      const { GET } = await import('@/app/api/specs/[id]/route');

      vi.mocked(getSpecById).mockResolvedValue(null);

      const request = new Request('http://localhost/api/specs/999');
      const params = Promise.resolve({ id: '999' });
      const response = await GET(request, { params });

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBe('Spec not found');
    });
  });

  describe('GET /api/specs/[id]/subspecs/[file]', () => {
    it('should return sub-spec with cache headers', async () => {
      const { getSpecById } = await import('@/lib/db/service-queries');
      const { GET } = await import('@/app/api/specs/[id]/subspecs/[file]/route');

      const mockSpec: ParsedSpec & { subSpecs: SubSpec[] } = {
        ...createMockSpec(),
        subSpecs: [
          {
            name: 'Design',
            file: 'DESIGN.md',
            iconName: 'FileText',
            color: 'text-blue-500',
            content: '# Design Content',
          },
        ],
      };

      vi.mocked(getSpecById).mockResolvedValue(mockSpec);

      const request = new Request('http://localhost/api/specs/1/subspecs/DESIGN.md');
      const params = Promise.resolve({ id: '1', file: 'DESIGN.md' });
      const response = await GET(request, { params });

      expect(response).toBeInstanceOf(NextResponse);
      
      const json = await response.json();
      expect(json).toHaveProperty('subSpec');
      expect(json.subSpec.file).toBe('DESIGN.md');
      
      // Verify cache headers are present
      const cacheControl = response.headers.get('Cache-Control');
      expect(cacheControl).toContain('public');
      expect(cacheControl).toContain('s-maxage=60');
      expect(cacheControl).toContain('stale-while-revalidate=120');
    });

    it('should return 404 for non-existent sub-spec', async () => {
      const { getSpecById } = await import('@/lib/db/service-queries');
      const { GET } = await import('@/app/api/specs/[id]/subspecs/[file]/route');

      const mockSpec: ParsedSpec & { subSpecs: SubSpec[] } = {
        ...createMockSpec(),
        subSpecs: [],
      };

      vi.mocked(getSpecById).mockResolvedValue(mockSpec);

      const request = new Request('http://localhost/api/specs/1/subspecs/NONEXISTENT.md');
      const params = Promise.resolve({ id: '1', file: 'NONEXISTENT.md' });
      const response = await GET(request, { params });

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBe('Sub-spec not found');
    });
  });
});
