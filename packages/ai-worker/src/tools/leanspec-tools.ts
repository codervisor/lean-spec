import { tool } from 'ai';
import { z } from 'zod';

type ToolContext = {
  baseUrl: string;
  projectId?: string;
};

type FetchOptions = {
  method?: string;
  body?: unknown;
};

const statusEnum = z.enum(['planned', 'in-progress', 'complete', 'archived']);
const priorityEnum = z.enum(['low', 'medium', 'high', 'critical']);

function ensureProjectId(inputProjectId: string | undefined, fallback?: string): string {
  const projectId = inputProjectId ?? fallback;
  if (!projectId) {
    throw new Error('projectId is required for LeanSpec operations');
  }
  return projectId;
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/$/, '');
}

async function fetchJson<T>(baseUrl: string, path: string, options: FetchOptions = {}): Promise<T> {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LeanSpec API error (${response.status}): ${text}`);
  }

  return response.json() as Promise<T>;
}

function splitFrontmatter(content: string): { frontmatter: string | null; body: string } {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) {
    return { frontmatter: null, body: content };
  }

  const frontmatter = match[0].trimEnd();
  const body = content.slice(match[0].length);
  return { frontmatter, body };
}

function rebuildContent(frontmatter: string | null, body: string): string {
  if (!frontmatter) {
    return body;
  }

  const trimmedBody = body.replace(/^\n+/, '');
  return `${frontmatter}\n${trimmedBody}`;
}

function findSectionRange(lines: string[], sectionTitle: string): { start: number; end: number } | null {
  const lower = sectionTitle.trim().toLowerCase();
  let start = -1;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line.startsWith('## ')) {
      const title = line.slice(3).trim().toLowerCase();
      if (title === lower) {
        start = i + 1;
        break;
      }
    }
  }

  if (start === -1) return null;

  let end = lines.length;
  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line.startsWith('## ')) {
      end = i;
      break;
    }
  }

  return { start, end };
}

function updateSection(body: string, sectionTitle: string, newContent: string, mode: 'replace' | 'append') {
  const lines = body.split(/\r?\n/);
  const range = findSectionRange(lines, sectionTitle);
  if (!range) {
    throw new Error(`Section not found: ${sectionTitle}`);
  }

  const updatedContentLines = newContent.trim().length
    ? newContent.trim().split(/\r?\n/)
    : [];

  if (mode === 'replace') {
    lines.splice(range.start, range.end - range.start, '', ...updatedContentLines, '');
  } else {
    const insertionPoint = range.end;
    lines.splice(insertionPoint, 0, '', ...updatedContentLines, '');
  }

  return lines.join('\n');
}

function toggleChecklistItem(body: string, itemText: string, checked: boolean): string {
  const lines = body.split(/\r?\n/);
  const target = itemText.trim().toLowerCase();
  const index = lines.findIndex(line => {
    const normalized = line.trim().toLowerCase();
    return (normalized.startsWith('- [ ]') || normalized.startsWith('- [x]')) && normalized.includes(target);
  });

  if (index === -1) {
    throw new Error(`Checklist item not found: ${itemText}`);
  }

  const line = lines[index];
  lines[index] = line.replace(/- \[[ xX]\]/, checked ? '- [x]' : '- [ ]');
  return lines.join('\n');
}

async function getSpecRaw(baseUrl: string, projectId: string, specName: string) {
  return fetchJson<{ content: string; contentHash: string }>(
    baseUrl,
    `/api/projects/${encodeURIComponent(projectId)}/specs/${encodeURIComponent(specName)}/raw`
  );
}

async function updateSpecRaw(baseUrl: string, projectId: string, specName: string, content: string, expectedContentHash?: string) {
  return fetchJson<{ contentHash: string }>(
    baseUrl,
    `/api/projects/${encodeURIComponent(projectId)}/specs/${encodeURIComponent(specName)}/raw`,
    { method: 'PATCH', body: { content, expectedContentHash } }
  );
}

async function getSubSpecRaw(baseUrl: string, projectId: string, specName: string, file: string) {
  return fetchJson<{ content: string; contentHash: string }>(
    baseUrl,
    `/api/projects/${encodeURIComponent(projectId)}/specs/${encodeURIComponent(specName)}/subspecs/${encodeURIComponent(file)}/raw`
  );
}

async function updateSubSpecRaw(
  baseUrl: string,
  projectId: string,
  specName: string,
  file: string,
  content: string,
  expectedContentHash?: string
) {
  return fetchJson<{ contentHash: string }>(
    baseUrl,
    `/api/projects/${encodeURIComponent(projectId)}/specs/${encodeURIComponent(specName)}/subspecs/${encodeURIComponent(file)}/raw`,
    { method: 'PATCH', body: { content, expectedContentHash } }
  );
}

export function createLeanSpecTools(context: ToolContext) {
  return {
    list_specs: tool({
      description: 'List specs with optional filters',
      inputSchema: z.object({
        projectId: z.string().optional(),
        status: statusEnum.optional(),
        priority: priorityEnum.optional(),
        tags: z.array(z.string()).optional(),
      }),
      execute: async (params: any) => {
        const projectId = ensureProjectId(params.projectId, context.projectId);
        const query = new URLSearchParams();
        if (params.status) query.set('status', params.status);
        if (params.priority) query.set('priority', params.priority);
        if (params.tags?.length) query.set('tags', params.tags.join(','));

        const suffix = query.toString() ? `?${query.toString()}` : '';
        return fetchJson(context.baseUrl, `/api/projects/${encodeURIComponent(projectId)}/specs${suffix}`);
      },
    }),

    search_specs: tool({
      description: 'Search specs by query',
      inputSchema: z.object({
        projectId: z.string().optional(),
        query: z.string().min(1),
        status: statusEnum.optional(),
        priority: priorityEnum.optional(),
        tags: z.array(z.string()).optional(),
      }),
      execute: async (params: any) => {
        const projectId = ensureProjectId(params.projectId, context.projectId);
        return fetchJson(context.baseUrl, `/api/projects/${encodeURIComponent(projectId)}/search`, {
          method: 'POST',
          body: params,
        });
      },
    }),

    get_spec: tool({
      description: 'Get a spec by name or number',
      inputSchema: z.object({
        projectId: z.string().optional(),
        specId: z.string().min(1),
      }),
      execute: async (params: any) => {
        const projectId = ensureProjectId(params.projectId, context.projectId);
        return fetchJson(context.baseUrl, `/api/projects/${encodeURIComponent(projectId)}/specs/${encodeURIComponent(params.specId)}`);
      },
    }),

    update_spec_status: tool({
      description: 'Update spec status',
      inputSchema: z.object({
        projectId: z.string().optional(),
        specId: z.string().min(1),
        status: statusEnum,
      }),
      execute: async (params: any) => {
        const projectId = ensureProjectId(params.projectId, context.projectId);
        return fetchJson(context.baseUrl, `/api/projects/${encodeURIComponent(projectId)}/specs/${encodeURIComponent(params.specId)}/status`, {
          method: 'POST',
          body: { status: params.status },
        });
      },
    }),

    link_specs: tool({
      description: 'Link spec dependency',
      inputSchema: z.object({
        projectId: z.string().optional(),
        specId: z.string().min(1),
        dependsOn: z.string().min(1),
      }),
      execute: async (params: any) => {
        const projectId = ensureProjectId(params.projectId, context.projectId);
        return fetchJson(context.baseUrl, `/api/projects/${encodeURIComponent(projectId)}/specs/${encodeURIComponent(params.specId)}/dependencies`, {
          method: 'POST',
          body: { dependsOn: params.dependsOn },
        });
      },
    }),

    unlink_specs: tool({
      description: 'Remove spec dependency',
      inputSchema: z.object({
        projectId: z.string().optional(),
        specId: z.string().min(1),
        dependsOn: z.string().min(1),
      }),
      execute: async (params: any) => {
        const projectId = ensureProjectId(params.projectId, context.projectId);
        return fetchJson(context.baseUrl, `/api/projects/${encodeURIComponent(projectId)}/specs/${encodeURIComponent(params.specId)}/dependencies/${encodeURIComponent(params.dependsOn)}`, {
          method: 'DELETE',
        });
      },
    }),

    validate_specs: tool({
      description: 'Validate all specs or a single spec',
      inputSchema: z.object({
        projectId: z.string().optional(),
        specId: z.string().optional(),
      }),
      execute: async (params: any) => {
        const projectId = ensureProjectId(params.projectId, context.projectId);
        return fetchJson(context.baseUrl, `/api/projects/${encodeURIComponent(projectId)}/validate`, {
          method: 'POST',
          body: params.specId ? { specId: params.specId } : {},
        });
      },
    }),

    read_spec: tool({
      description: 'Read raw spec content',
      inputSchema: z.object({
        projectId: z.string().optional(),
        specId: z.string().min(1),
      }),
      execute: async (params: any) => {
        const projectId = ensureProjectId(params.projectId, context.projectId);
        return getSpecRaw(context.baseUrl, projectId, params.specId);
      },
    }),

    update_spec: tool({
      description: 'Update spec content with full replacement',
      inputSchema: z.object({
        projectId: z.string().optional(),
        specId: z.string().min(1),
        content: z.string().min(1),
        expectedContentHash: z.string().optional(),
      }),
      execute: async (params: any) => {
        const projectId = ensureProjectId(params.projectId, context.projectId);
        return updateSpecRaw(context.baseUrl, projectId, params.specId, params.content, params.expectedContentHash);
      },
    }),

    update_spec_section: tool({
      description: 'Replace or append a section in spec content',
      inputSchema: z.object({
        projectId: z.string().optional(),
        specId: z.string().min(1),
        section: z.string().min(1),
        content: z.string(),
        mode: z.enum(['replace', 'append']).default('replace'),
        expectedContentHash: z.string().optional(),
      }),
      execute: async (params: any) => {
        const projectId = ensureProjectId(params.projectId, context.projectId);
        const spec = await getSpecRaw(context.baseUrl, projectId, params.specId);
        const { frontmatter, body } = splitFrontmatter(spec.content);
        const updated = updateSection(body, params.section, params.content, params.mode);
        const rebuilt = rebuildContent(frontmatter, updated);
        return updateSpecRaw(context.baseUrl, projectId, params.specId, rebuilt, params.expectedContentHash ?? spec.contentHash);
      },
    }),

    toggle_checklist_item: tool({
      description: 'Check or uncheck a checklist item in a spec',
      inputSchema: z.object({
        projectId: z.string().optional(),
        specId: z.string().min(1),
        itemText: z.string().min(1),
        checked: z.boolean(),
        expectedContentHash: z.string().optional(),
      }),
      execute: async (params: any) => {
        const projectId = ensureProjectId(params.projectId, context.projectId);
        const spec = await getSpecRaw(context.baseUrl, projectId, params.specId);
        const { frontmatter, body } = splitFrontmatter(spec.content);
        const updated = toggleChecklistItem(body, params.itemText, params.checked);
        const rebuilt = rebuildContent(frontmatter, updated);
        return updateSpecRaw(context.baseUrl, projectId, params.specId, rebuilt, params.expectedContentHash ?? spec.contentHash);
      },
    }),

    read_subspec: tool({
      description: 'Read raw content of a sub-spec file',
      inputSchema: z.object({
        projectId: z.string().optional(),
        specId: z.string().min(1),
        file: z.string().min(1),
      }),
      execute: async (params: any) => {
        const projectId = ensureProjectId(params.projectId, context.projectId);
        return getSubSpecRaw(context.baseUrl, projectId, params.specId, params.file);
      },
    }),

    update_subspec: tool({
      description: 'Update raw content of a sub-spec file',
      inputSchema: z.object({
        projectId: z.string().optional(),
        specId: z.string().min(1),
        file: z.string().min(1),
        content: z.string().min(1),
        expectedContentHash: z.string().optional(),
      }),
      execute: async (params: any) => {
        const projectId = ensureProjectId(params.projectId, context.projectId);
        return updateSubSpecRaw(context.baseUrl, projectId, params.specId, params.file, params.content, params.expectedContentHash);
      },
    }),
  };
}
