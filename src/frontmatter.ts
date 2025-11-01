import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import matter from 'gray-matter';

// Valid status values
export type SpecStatus = 'planned' | 'in-progress' | 'complete' | 'archived';

// Valid priority values
export type SpecPriority = 'low' | 'medium' | 'high' | 'critical';

// Core frontmatter fields
export interface SpecFrontmatter {
  // Required fields
  status: SpecStatus;
  created: string; // YYYY-MM-DD format

  // Recommended fields
  tags?: string[];
  priority?: SpecPriority;

  // Power user fields
  related?: string[];
  depends_on?: string[];
  updated?: string;
  completed?: string;
  assignee?: string;
  reviewer?: string;
  issue?: string;
  pr?: string;
  epic?: string;
  breaking?: boolean;

  // Allow any additional fields (for extensibility)
  [key: string]: unknown;
}

// Parse frontmatter from a spec file
export async function parseFrontmatter(filePath: string): Promise<SpecFrontmatter | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = matter(content);

    if (!parsed.data || Object.keys(parsed.data).length === 0) {
      // No frontmatter found, try fallback to inline fields
      return parseFallbackFields(content);
    }

    // Validate required fields
    if (!parsed.data.status) {
      console.warn(`Warning: Missing required field 'status' in ${filePath}`);
      return null;
    }

    if (!parsed.data.created) {
      console.warn(`Warning: Missing required field 'created' in ${filePath}`);
      return null;
    }

    // Validate status enum
    const validStatuses: SpecStatus[] = ['planned', 'in-progress', 'complete', 'archived'];
    if (!validStatuses.includes(parsed.data.status)) {
      console.warn(`Warning: Invalid status '${parsed.data.status}' in ${filePath}. Valid values: ${validStatuses.join(', ')}`);
    }

    // Validate priority enum if present
    if (parsed.data.priority) {
      const validPriorities: SpecPriority[] = ['low', 'medium', 'high', 'critical'];
      if (!validPriorities.includes(parsed.data.priority)) {
        console.warn(`Warning: Invalid priority '${parsed.data.priority}' in ${filePath}. Valid values: ${validPriorities.join(', ')}`);
      }
    }

    // Warn about unknown fields (informational only)
    const knownFields = [
      'status', 'created', 'tags', 'priority', 'related', 'depends_on',
      'updated', 'completed', 'assignee', 'reviewer', 'issue', 'pr', 'epic', 'breaking'
    ];
    const unknownFields = Object.keys(parsed.data).filter(k => !knownFields.includes(k));
    if (unknownFields.length > 0) {
      console.warn(`Info: Unknown fields in ${filePath}: ${unknownFields.join(', ')}`);
    }

    return parsed.data as SpecFrontmatter;
  } catch (error) {
    console.error(`Error parsing frontmatter from ${filePath}:`, error);
    return null;
  }
}

// Fallback: Parse inline fields from older specs
function parseFallbackFields(content: string): SpecFrontmatter | null {
  const statusMatch = content.match(/\*\*Status\*\*:\s*(?:📅\s*)?(\w+(?:-\w+)?)/i);
  const createdMatch = content.match(/\*\*Created\*\*:\s*(\d{4}-\d{2}-\d{2})/);

  if (statusMatch && createdMatch) {
    const status = statusMatch[1].toLowerCase().replace(/\s+/g, '-') as SpecStatus;
    const created = createdMatch[1];

    return {
      status,
      created,
    };
  }

  return null;
}

// Update frontmatter in a spec file
export async function updateFrontmatter(
  filePath: string,
  updates: Partial<SpecFrontmatter>
): Promise<void> {
  const content = await fs.readFile(filePath, 'utf-8');
  const parsed = matter(content);

  // Merge updates with existing data
  const newData = { ...parsed.data, ...updates };

  // Auto-update timestamps if fields exist
  if (updates.status === 'complete' && !newData.completed) {
    newData.completed = new Date().toISOString().split('T')[0];
  }

  if ('updated' in parsed.data) {
    newData.updated = new Date().toISOString().split('T')[0];
  }

  // Stringify back to file
  const newContent = matter.stringify(parsed.content, newData);
  await fs.writeFile(filePath, newContent, 'utf-8');
}

// Get spec file path from spec directory
export async function getSpecFile(specDir: string, defaultFile: string = 'README.md'): Promise<string | null> {
  const specFile = path.join(specDir, defaultFile);
  
  try {
    await fs.access(specFile);
    return specFile;
  } catch {
    return null;
  }
}

// Filter specs by criteria
export interface SpecFilterOptions {
  status?: SpecStatus | SpecStatus[];
  tags?: string[];
  priority?: SpecPriority | SpecPriority[];
  assignee?: string;
}

export function matchesFilter(frontmatter: SpecFrontmatter, filter: SpecFilterOptions): boolean {
  // Status filter
  if (filter.status) {
    const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
    if (!statuses.includes(frontmatter.status)) {
      return false;
    }
  }

  // Tags filter (spec must have ALL specified tags)
  if (filter.tags && filter.tags.length > 0) {
    if (!frontmatter.tags || frontmatter.tags.length === 0) {
      return false;
    }
    const hasAllTags = filter.tags.every(tag => frontmatter.tags!.includes(tag));
    if (!hasAllTags) {
      return false;
    }
  }

  // Priority filter
  if (filter.priority) {
    const priorities = Array.isArray(filter.priority) ? filter.priority : [filter.priority];
    if (!frontmatter.priority || !priorities.includes(frontmatter.priority)) {
      return false;
    }
  }

  // Assignee filter
  if (filter.assignee) {
    if (frontmatter.assignee !== filter.assignee) {
      return false;
    }
  }

  return true;
}
