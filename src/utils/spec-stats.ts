import type { SpecInfo } from '../spec-loader.js';
import type { SpecStatus, SpecPriority } from '../frontmatter.js';

/**
 * Count specs by status and priority
 * Shared utility to avoid duplication between analytics and dashboard
 */
export function countSpecsByStatusAndPriority(specs: SpecInfo[]): {
  statusCounts: Record<SpecStatus, number>;
  priorityCounts: Record<SpecPriority, number>;
  tagCounts: Record<string, number>;
} {
  const statusCounts: Record<SpecStatus, number> = {
    planned: 0,
    'in-progress': 0,
    complete: 0,
    archived: 0,
  };

  const priorityCounts: Record<SpecPriority, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  const tagCounts: Record<string, number> = {};

  for (const spec of specs) {
    const status = spec.frontmatter.status;
    if (status && status in statusCounts) {
      statusCounts[status]++;
    }

    const priority = spec.frontmatter.priority;
    if (priority && priority in priorityCounts) {
      priorityCounts[priority]++;
    }

    if (spec.frontmatter.tags) {
      for (const tag of spec.frontmatter.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
  }

  return { statusCounts, priorityCounts, tagCounts };
}
