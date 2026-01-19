import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLeanSpecTools } from './tools/leanspec-tools';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('createLeanSpecTools', () => {
  const baseUrl = 'http://localhost:3030';
  const projectId = 'test-project';

  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('list_specs', () => {
    it('should list specs without filters', async () => {
      const tools = createLeanSpecTools({ baseUrl, projectId });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ specName: '001-test' }]),
      });

      const result = await tools.list_specs.execute!({}, { abortSignal: new AbortController().signal, messages: [], toolCallId: 'test' });

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/projects/${projectId}/specs`,
        expect.objectContaining({ method: 'GET' })
      );
      expect(result).toEqual([{ specName: '001-test' }]);
    });

    it('should list specs with status filter', async () => {
      const tools = createLeanSpecTools({ baseUrl, projectId });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await tools.list_specs.execute!(
        { status: 'in-progress' },
        { abortSignal: new AbortController().signal, messages: [], toolCallId: 'test' }
      );

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/projects/${projectId}/specs?status=in-progress`,
        expect.any(Object)
      );
    });
  });

  describe('search_specs', () => {
    it('should search specs by query', async () => {
      const tools = createLeanSpecTools({ baseUrl, projectId });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      });

      await tools.search_specs.execute!(
        { query: 'authentication' },
        { abortSignal: new AbortController().signal, messages: [], toolCallId: 'test' }
      );

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/projects/${projectId}/search`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            query: 'authentication',
            filters: {
              status: undefined,
              priority: undefined,
              tags: undefined,
            },
          }),
        })
      );
    });
  });

  describe('get_spec', () => {
    it('should fetch a single spec', async () => {
      const tools = createLeanSpecTools({ baseUrl, projectId });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ specName: '082-feature', title: 'Test Feature' }),
      });

      const result = await tools.get_spec.execute!(
        { specId: '082' },
        { abortSignal: new AbortController().signal, messages: [], toolCallId: 'test' }
      );

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/projects/${projectId}/specs/082`,
        expect.any(Object)
      );
      expect(result).toEqual({ specName: '082-feature', title: 'Test Feature' });
    });
  });

  describe('create_spec', () => {
    it('should create a new spec', async () => {
      const tools = createLeanSpecTools({ baseUrl, projectId });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ specName: '095-new-feature' }),
      });

      await tools.create_spec.execute!(
        { name: 'new-feature', title: 'New Feature', priority: 'high' },
        { abortSignal: new AbortController().signal, messages: [], toolCallId: 'test' }
      );

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/projects/${projectId}/specs`,
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"name":"new-feature"'),
        })
      );
    });
  });

  describe('update_spec', () => {
    it('should update spec metadata', async () => {
      const tools = createLeanSpecTools({ baseUrl, projectId });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await tools.update_spec.execute!(
        { specId: '082', status: 'complete' },
        { abortSignal: new AbortController().signal, messages: [], toolCallId: 'test' }
      );

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/projects/${projectId}/specs/082/metadata`,
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('"status":"complete"'),
        })
      );
    });
  });

  describe('get_stats', () => {
    it('should fetch project statistics', async () => {
      const tools = createLeanSpecTools({ baseUrl, projectId });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ total: 10, completed: 5 }),
      });

      const result = await tools.get_stats.execute!(
        {},
        { abortSignal: new AbortController().signal, messages: [], toolCallId: 'test' }
      );

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/projects/${projectId}/stats`,
        expect.any(Object)
      );
      expect(result).toEqual({ total: 10, completed: 5 });
    });
  });

  describe('validate_spec', () => {
    it('should validate project specs', async () => {
      const tools = createLeanSpecTools({ baseUrl, projectId });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true, issues: [] }),
      });

      await tools.validate_spec.execute!(
        {},
        { abortSignal: new AbortController().signal, messages: [], toolCallId: 'test' }
      );

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/projects/${projectId}/validate`,
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('error handling', () => {
    it('should throw on API errors', async () => {
      const tools = createLeanSpecTools({ baseUrl, projectId });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Spec not found'),
      });

      await expect(
        tools.get_spec.execute!(
          { specId: 'nonexistent' },
          { abortSignal: new AbortController().signal, messages: [], toolCallId: 'test' }
        )
      ).rejects.toThrow('LeanSpec API error (404)');
    });

    it('should require projectId', async () => {
      const tools = createLeanSpecTools({ baseUrl }); // No projectId

      await expect(
        tools.list_specs.execute!(
          {},
          { abortSignal: new AbortController().signal, messages: [], toolCallId: 'test' }
        )
      ).rejects.toThrow('projectId is required');
    });
  });
});
