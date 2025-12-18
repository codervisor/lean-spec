/**
 * Frontmatter parsing and manipulation utilities (inlined from @leanspec/core)
 * 
 * These utilities are inlined to eliminate the dependency on @leanspec/core,
 * which is being deprecated in favor of the Rust implementation.
 * 
 * @see spec 181-typescript-deprecation-rust-migration
 */
import matter from 'gray-matter';
import { load, FAILSAFE_SCHEMA } from 'js-yaml';

export type SpecStatus = 'planned' | 'in-progress' | 'complete' | 'archived';
export type SpecPriority = 'low' | 'medium' | 'high' | 'critical';

export interface StatusTransition {
  status: SpecStatus;
  at: string;
}

export interface SpecFrontmatter {
  status: SpecStatus;
  created: string;
  tags?: string[];
  priority?: SpecPriority;
  depends_on?: string[];
  updated?: string;
  completed?: string;
  assignee?: string;
  reviewer?: string;
  issue?: string;
  pr?: string;
  epic?: string;
  breaking?: boolean;
  due?: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
  transitions?: StatusTransition[];
  [key: string]: unknown;
}

/**
 * Convert Date objects to YYYY-MM-DD string format
 * (gray-matter auto-parses YYYY-MM-DD strings as Date objects)
 */
function normalizeDateFields(data: Record<string, unknown>): void {
  const dateFields = ['created', 'completed', 'updated', 'due'];
  
  for (const field of dateFields) {
    if (data[field] instanceof Date) {
      data[field] = (data[field] as Date).toISOString().split('T')[0];
    }
  }
}

/**
 * Enrich frontmatter with timestamps for velocity tracking
 * Auto-generates timestamps when missing and tracks status transitions
 */
function enrichWithTimestamps(
  data: Record<string, unknown>,
  previousData?: Record<string, unknown>
): void {
  const now = new Date().toISOString();

  // Set created_at if missing
  if (!data.created_at) {
    data.created_at = now;
  }

  // Update updated_at on any change (if previousData exists)
  if (previousData) {
    data.updated_at = now;
  }

  // Set completed_at when status changes to complete
  if (
    data.status === 'complete' &&
    previousData?.status !== 'complete' &&
    !data.completed_at
  ) {
    data.completed_at = now;
    // Also set the completed date field
    if (!data.completed) {
      data.completed = new Date().toISOString().split('T')[0];
    }
  }

  // Track status transition (optional)
  if (previousData && data.status !== previousData.status) {
    if (!Array.isArray(data.transitions)) {
      data.transitions = [];
    }
    (data.transitions as StatusTransition[]).push({
      status: data.status as SpecStatus,
      at: now,
    });
  }
}

/**
 * Get status emoji for visual display
 */
function getStatusEmojiPlain(status: string): string {
  switch (status) {
    case 'planned': return '📅';
    case 'in-progress': return '⏳';
    case 'complete': return '✅';
    case 'archived': return '📦';
    default: return '📄';
  }
}

/**
 * Update visual metadata badges in content
 */
function updateVisualMetadata(content: string, frontmatter: SpecFrontmatter): string {
  const statusEmoji = getStatusEmojiPlain(frontmatter.status);
  const statusLabel = frontmatter.status.charAt(0).toUpperCase() + frontmatter.status.slice(1).replace('-', ' ');
  
  // Use the created date as-is (already in YYYY-MM-DD format)
  const created = frontmatter.created;
  
  // Build metadata line
  let metadataLine = `> **Status**: ${statusEmoji} ${statusLabel}`;
  
  if (frontmatter.priority) {
    const priorityLabel = frontmatter.priority.charAt(0).toUpperCase() + frontmatter.priority.slice(1);
    metadataLine += ` · **Priority**: ${priorityLabel}`;
  }
  
  metadataLine += ` · **Created**: ${created}`;
  
  if (frontmatter.tags && frontmatter.tags.length > 0) {
    metadataLine += ` · **Tags**: ${frontmatter.tags.join(', ')}`;
  }
  
  // For enterprise template with assignee/reviewer
  let secondLine = '';
  if (frontmatter.assignee || frontmatter.reviewer) {
    const assignee = frontmatter.assignee || 'TBD';
    const reviewer = frontmatter.reviewer || 'TBD';
    secondLine = `\n> **Assignee**: ${assignee} · **Reviewer**: ${reviewer}`;
  }
  
  // Replace existing metadata block or add after title
  const metadataPattern = /^>\s+\*\*Status\*\*:.*(?:\n>\s+\*\*Assignee\*\*:.*)?/m;
  
  if (metadataPattern.test(content)) {
    // Replace existing metadata
    return content.replace(metadataPattern, metadataLine + secondLine);
  } else {
    // Add after title (# title)
    const titleMatch = content.match(/^#\s+.+$/m);
    if (titleMatch) {
      const insertPos = titleMatch.index! + titleMatch[0].length;
      return content.slice(0, insertPos) + '\n\n' + metadataLine + secondLine + '\n' + content.slice(insertPos);
    }
  }
  
  return content;
}

/**
 * Create updated frontmatter with changes
 */
export function createUpdatedFrontmatter(
  existingContent: string,
  updates: Partial<SpecFrontmatter>
): { content: string; frontmatter: SpecFrontmatter } {
  const parsed = matter(existingContent, {
    engines: {
      // FAILSAFE_SCHEMA is the safest option - only allows strings, arrays, and objects
      // This prevents any code execution vulnerabilities from YAML parsing
      yaml: (str) => load(str, { schema: FAILSAFE_SCHEMA }) as Record<string, unknown>
    }
  });

  // Store previous data for timestamp enrichment
  const previousData = { ...parsed.data };

  // Merge updates with existing data
  const newData = { ...parsed.data, ...updates };

  // Ensure date fields remain as strings (gray-matter auto-parses YYYY-MM-DD as Date objects)
  normalizeDateFields(newData);

  // Enrich with timestamps
  enrichWithTimestamps(newData, previousData);

  // Auto-update timestamps if fields exist (legacy behavior)
  if (updates.status === 'complete' && !newData.completed) {
    newData.completed = new Date().toISOString().split('T')[0];
  }

  if ('updated' in parsed.data) {
    newData.updated = new Date().toISOString().split('T')[0];
  }

  // Update visual metadata badges in content
  let updatedContent = parsed.content;
  updatedContent = updateVisualMetadata(updatedContent, newData as SpecFrontmatter);

  // Stringify back to markdown
  const newContent = matter.stringify(updatedContent, newData);
  
  return {
    content: newContent,
    frontmatter: newData as SpecFrontmatter
  };
}
