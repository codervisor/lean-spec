/**
 * Helper functions for MCP server modules
 */

import * as fs from 'node:fs/promises';
import { countTokens } from '@leanspec/core';
import { loadSubFiles } from '../spec-loader.js';
import type { SpecData, SubSpecReference, BoardData } from './types.js';

/**
 * Format error messages for MCP responses
 */
export function formatErrorMessage(prefix: string, error: unknown): string {
  const errorMsg = error instanceof Error ? error.message : String(error);
  return `${prefix}: ${errorMsg}`;
}

/**
 * Stale spec information
 */
export interface StaleSpec {
  name: string;
  daysStale: number;
}

/**
 * Get specs that have been in-progress for too long
 * Default threshold: 7 days
 */
export function getStaleSpecs(board: BoardData, thresholdDays = 7): StaleSpec[] {
  const now = new Date();
  const staleSpecs: StaleSpec[] = [];
  
  for (const spec of board.columns['in-progress']) {
    // Check updated_at first, then fall back to created date
    const lastActivity = spec.updated_at || spec.created;
    if (!lastActivity) continue;
    
    try {
      const activityDate = new Date(lastActivity);
      const daysSinceActivity = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceActivity >= thresholdDays) {
        staleSpecs.push({
          name: spec.name,
          daysStale: daysSinceActivity,
        });
      }
    } catch {
      // Invalid date format, skip
    }
  }
  
  return staleSpecs;
}

/**
 * Convert spec info to serializable SpecData format
 */
export function specToData(spec: any): SpecData {
  return {
    name: spec.name,
    path: spec.path,
    status: spec.frontmatter.status,
    created: spec.frontmatter.created,
    title: spec.frontmatter.title,
    tags: spec.frontmatter.tags,
    priority: spec.frontmatter.priority,
    assignee: spec.frontmatter.assignee,
    description: spec.frontmatter.description,
    customFields: spec.frontmatter.custom,
    updated_at: spec.frontmatter.updated_at,
  };
}

/**
 * Regex pattern for detecting spec references in content.
 * Matches patterns like:
 * - "spec: 001-feature"
 * - "specs: 023-something"
 * - "depends on: 042-dependency"
 * The pattern expects at least 3 digits followed by optional hyphens and word characters.
 */
export const SPEC_REFERENCE_REGEX = /(?:spec[s]?[:\s]+|depends on[:\s]+)([0-9]{3,}[-\w]+)/gi;

/**
 * Extract H1 heading from markdown content
 */
function extractH1(content: string): string | undefined {
  const h1Match = content.match(/^#\s+(.+)$/m);
  return h1Match?.[1]?.trim();
}

/**
 * Get summary from content (H1 heading or first 100 chars)
 */
function getSummary(content: string): string {
  const h1 = extractH1(content);
  if (h1) {
    return h1;
  }
  
  // Fall back to first 100 chars (remove frontmatter if present)
  const withoutFrontmatter = content.replace(/^---[\s\S]*?---\n/, '');
  const firstLine = withoutFrontmatter.trim().split('\n')[0];
  return firstLine.length > 100 ? firstLine.substring(0, 97) + '...' : firstLine;
}

/**
 * Load sub-spec metadata for progressive disclosure
 * See spec 084: Sub-Spec File Visibility in MCP Tools and Commands
 */
export async function loadSubSpecMetadata(specDir: string): Promise<SubSpecReference[]> {
  try {
    // Load all sub-files (documents only, no assets for metadata)
    const subFiles = await loadSubFiles(specDir, { includeContent: true });
    
    // Filter to only document files (.md)
    const documents = subFiles.filter(f => f.type === 'document');
    
    // Build metadata for each document
    const metadata: SubSpecReference[] = [];
    
    for (const doc of documents) {
      // Count tokens using core utility
      const tokenCount = await countTokens({ content: doc.content || '' });
      
      const ref: SubSpecReference = {
        name: doc.name,
        tokens: tokenCount.total,
        size: doc.size,
      };
      
      // Add summary if content is available
      if (doc.content) {
        ref.summary = getSummary(doc.content);
      }
      
      metadata.push(ref);
    }
    
    return metadata;
  } catch (error) {
    // Spec has no sub-files or directory doesn't exist
    return [];
  }
}
