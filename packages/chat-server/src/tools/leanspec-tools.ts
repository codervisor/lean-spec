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
      execute: async params => {
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
      execute: async params => {
        const projectId = ensureProjectId(params.projectId, context.projectId);
        return fetchJson(context.baseUrl, `/api/projects/${encodeURIComponent(projectId)}/search`, {
          method: 'POST',
          body: {
            query: params.query,
            filters: {
              status: params.status,
              priority: params.priority,
              tags: params.tags,
            },
          },
        });
      },
    }),

    get_spec: tool({
      description: 'Fetch a spec by ID or name',
      inputSchema: z.object({
        projectId: z.string().optional(),
        specId: z.string().min(1),
      }),
      execute: async params => {
        const projectId = ensureProjectId(params.projectId, context.projectId);
        return fetchJson(
          context.baseUrl,
          `/api/projects/${encodeURIComponent(projectId)}/specs/${encodeURIComponent(params.specId)}`
        );
      },
    }),

    create_spec: tool({
      description: 'Create a new spec with optional metadata',
      inputSchema: z.object({
        projectId: z.string().optional(),
        name: z.string().min(1),
        title: z.string().optional(),
        status: statusEnum.optional(),
        priority: priorityEnum.optional(),
        tags: z.array(z.string()).optional(),
        assignee: z.string().optional(),
        dependsOn: z.array(z.string()).optional(),
        template: z.string().optional(),
        content: z.string().optional(),
      }),
      execute: async params => {
        const projectId = ensureProjectId(params.projectId, context.projectId);
        return fetchJson(context.baseUrl, `/api/projects/${encodeURIComponent(projectId)}/specs`, {
          method: 'POST',
          body: {
            name: params.name,
            title: params.title,
            status: params.status,
            priority: params.priority,
            tags: params.tags,
            assignee: params.assignee,
            dependsOn: params.dependsOn,
            template: params.template,
            content: params.content,
          },
        });
      },
    }),

    update_spec: tool({
      description: 'Update spec metadata (status, priority, tags, assignee)',
      inputSchema: z.object({
        projectId: z.string().optional(),
        specId: z.string().min(1),
        status: statusEnum.optional(),
        priority: priorityEnum.optional(),
        tags: z.array(z.string()).optional(),
        assignee: z.string().optional(),
        expectedContentHash: z.string().optional(),
      }),
      execute: async params => {
        const projectId = ensureProjectId(params.projectId, context.projectId);
        return fetchJson(
          context.baseUrl,
          `/api/projects/${encodeURIComponent(projectId)}/specs/${encodeURIComponent(params.specId)}/metadata`,
          {
            method: 'PATCH',
            body: {
              status: params.status,
              priority: params.priority,
              tags: params.tags,
              assignee: params.assignee,
              expectedContentHash: params.expectedContentHash,
            },
          }
        );
      },
    }),

    link_specs: tool({
      description: 'Link spec dependencies by updating dependsOn',
      inputSchema: z.object({
        projectId: z.string().optional(),
        specId: z.string().min(1),
        dependsOn: z.array(z.string()).min(1),
      }),
      execute: async params => {
        const projectId = ensureProjectId(params.projectId, context.projectId);
        const raw = await getSpecRaw(context.baseUrl, projectId, params.specId);
        const { frontmatter, body } = splitFrontmatter(raw.content);
        if (!frontmatter) {
          throw new Error('Spec frontmatter not found');
        }

        const updatedFrontmatter = frontmatter.replace(
          /depends_on:[\s\S]*?(?=\n\w|\n---|$)/i,
          ''
        );

        const dependsLines = ['depends_on:', ...params.dependsOn.map(dep => `- ${dep}`)].join('\n');
        const frontmatterWithDeps = updatedFrontmatter.replace(/\n---$/, `\n${dependsLines}\n---`);
        const newContent = rebuildContent(frontmatterWithDeps, body);
        return updateSpecRaw(context.baseUrl, projectId, params.specId, newContent, raw.contentHash);
      },
    }),

    get_dependencies: tool({
      description: 'Get dependency graph for the current project',
      inputSchema: z.object({
        projectId: z.string().optional(),
      }),
      execute: async params => {
        const projectId = ensureProjectId(params.projectId, context.projectId);
        return fetchJson(
          context.baseUrl,
          `/api/projects/${encodeURIComponent(projectId)}/dependencies`
        );
      },
    }),

    get_stats: tool({
      description: 'Get project statistics',
      inputSchema: z.object({
        projectId: z.string().optional(),
      }),
      execute: async params => {
        const projectId = ensureProjectId(params.projectId, context.projectId);
        return fetchJson(
          context.baseUrl,
          `/api/projects/${encodeURIComponent(projectId)}/stats`
        );
      },
    }),

    validate_spec: tool({
      description: 'Validate the current project specs',
      inputSchema: z.object({
        projectId: z.string().optional(),
      }),
      execute: async params => {
        const projectId = ensureProjectId(params.projectId, context.projectId);
        return fetchJson(
          context.baseUrl,
          `/api/projects/${encodeURIComponent(projectId)}/validate`,
          { method: 'POST' }
        );
      },
    }),

    get_spec_content: tool({
      description: 'Get full spec content including sub-specs',
      inputSchema: z.object({
        projectId: z.string().optional(),
        specId: z.string().min(1),
      }),
      execute: async params => {
        const projectId = ensureProjectId(params.projectId, context.projectId);
        return fetchJson(
          context.baseUrl,
          `/api/projects/${encodeURIComponent(projectId)}/specs/${encodeURIComponent(params.specId)}`
        );
      },
    }),

    edit_spec_section: tool({
      description: 'Replace a section (Overview/Design/Plan/Test/Notes) with new content',
      inputSchema: z.object({
        projectId: z.string().optional(),
        specId: z.string().min(1),
        section: z.string().min(1),
        content: z.string().min(1),
      }),
      execute: async params => {
        const projectId = ensureProjectId(params.projectId, context.projectId);
        const raw = await getSpecRaw(context.baseUrl, projectId, params.specId);
        const { frontmatter, body } = splitFrontmatter(raw.content);
        const updatedBody = updateSection(body, params.section, params.content, 'replace');
        const newContent = rebuildContent(frontmatter, updatedBody);
        return updateSpecRaw(context.baseUrl, projectId, params.specId, newContent, raw.contentHash);
      },
    }),

    append_to_section: tool({
      description: 'Append content to a section without overwriting',
      inputSchema: z.object({
        projectId: z.string().optional(),
        specId: z.string().min(1),
        section: z.string().min(1),
        content: z.string().min(1),
      }),
      execute: async params => {
        const projectId = ensureProjectId(params.projectId, context.projectId);
        const raw = await getSpecRaw(context.baseUrl, projectId, params.specId);
        const { frontmatter, body } = splitFrontmatter(raw.content);
        const updatedBody = updateSection(body, params.section, params.content, 'append');
        const newContent = rebuildContent(frontmatter, updatedBody);
        return updateSpecRaw(context.baseUrl, projectId, params.specId, newContent, raw.contentHash);
      },
    }),

    update_checklist_item: tool({
      description: 'Toggle a checklist item by text match',
      inputSchema: z.object({
        projectId: z.string().optional(),
        specId: z.string().min(1),
        itemText: z.string().min(1),
        checked: z.boolean(),
      }),
      execute: async params => {
        const projectId = ensureProjectId(params.projectId, context.projectId);
        const raw = await getSpecRaw(context.baseUrl, projectId, params.specId);
        const { frontmatter, body } = splitFrontmatter(raw.content);
        const updatedBody = toggleChecklistItem(body, params.itemText, params.checked);
        const newContent = rebuildContent(frontmatter, updatedBody);
        return updateSpecRaw(context.baseUrl, projectId, params.specId, newContent, raw.contentHash);
      },
    }),

    edit_subspec: tool({
      description: 'Edit a sub-spec file (e.g., IMPLEMENTATION.md)',
      inputSchema: z.object({
        projectId: z.string().optional(),
        specId: z.string().min(1),
        file: z.string().min(1),
        content: z.string().min(1),
      }),
      execute: async params => {
        const projectId = ensureProjectId(params.projectId, context.projectId);
        const raw = await getSubSpecRaw(context.baseUrl, projectId, params.specId, params.file);
        return updateSubSpecRaw(
          context.baseUrl,
          projectId,
          params.specId,
          params.file,
          params.content,
          raw.contentHash
        );
      },
    }),
  };
}
