/**
 * PATCH /api/specs/[id]/metadata - Update spec metadata (status, priority, tags, assignee)
 */

import { NextResponse } from 'next/server';
import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createUpdatedFrontmatter } from '@leanspec/core';

const ALLOWED_STATUSES = ['planned', 'in-progress', 'complete', 'archived'] as const;
const ALLOWED_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

type AllowedStatus = (typeof ALLOWED_STATUSES)[number];
type AllowedPriority = (typeof ALLOWED_PRIORITIES)[number];

interface MetadataUpdateRequest {
  status?: AllowedStatus;
  priority?: AllowedPriority;
  tags?: string[];
  assignee?: string;
}

function resolveProjectRoot(): string {
  if (process.env.LEANSPEC_REPO_ROOT) {
    return process.env.LEANSPEC_REPO_ROOT;
  }

  let currentDir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (existsSync(path.join(currentDir, '.lean-spec'))) {
      return currentDir;
    }
    const parentDir = path.resolve(currentDir, '..');
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }

  // Fallback to repo root relative to UI package
  return path.resolve(process.cwd(), '..', '..');
}

const PROJECT_ROOT = resolveProjectRoot();

/**
 * Find spec directory by identifier (number or name)
 */
async function findSpecDirectory(specIdentifier: string): Promise<string | null> {
  const specsDir = path.join(PROJECT_ROOT, 'specs');
  
  if (!existsSync(specsDir)) {
    return null;
  }

  const { readdir } = await import('node:fs/promises');
  const entries = await readdir(specsDir, { withFileTypes: true });
  
  // Match by spec number or full directory name
  const specPattern = /^(\d{2,})-/;
  const specNum = parseInt(specIdentifier.split('-')[0], 10);
  
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    
    // Match by full name or by spec number
    if (entry.name === specIdentifier) {
      return path.join(specsDir, entry.name);
    }
    
    if (!isNaN(specNum) && specPattern.test(entry.name)) {
      const dirNum = parseInt(entry.name.split('-')[0], 10);
      if (dirNum === specNum) {
        return path.join(specsDir, entry.name);
      }
    }
  }
  
  return null;
}

/**
 * Validate metadata update request
 */
function validateRequest(payload: MetadataUpdateRequest): { valid: boolean; error?: string } {
  // At least one field must be provided
  if (!payload.status && !payload.priority && !payload.tags && payload.assignee === undefined) {
    return { valid: false, error: 'At least one metadata field must be provided' };
  }

  // Validate status if provided
  if (payload.status && !ALLOWED_STATUSES.includes(payload.status)) {
    return { valid: false, error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}` };
  }

  // Validate priority if provided
  if (payload.priority && !ALLOWED_PRIORITIES.includes(payload.priority)) {
    return { valid: false, error: `Invalid priority. Allowed: ${ALLOWED_PRIORITIES.join(', ')}` };
  }

  // Validate tags if provided
  if (payload.tags !== undefined) {
    if (!Array.isArray(payload.tags)) {
      return { valid: false, error: 'Tags must be an array' };
    }
    if (!payload.tags.every(t => typeof t === 'string')) {
      return { valid: false, error: 'All tags must be strings' };
    }
  }

  // Validate assignee if provided
  if (payload.assignee !== undefined && typeof payload.assignee !== 'string') {
    return { valid: false, error: 'Assignee must be a string' };
  }

  return { valid: true };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Spec id is required' }, { status: 400 });
    }

    let payload: MetadataUpdateRequest = {};
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = validateRequest(payload);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const specIdentifier = decodeURIComponent(id);
    const specDir = await findSpecDirectory(specIdentifier);
    
    if (!specDir) {
      return NextResponse.json({ error: 'Spec not found' }, { status: 404 });
    }
    
    const readmePath = path.join(specDir, 'README.md');
    
    if (!existsSync(readmePath)) {
      return NextResponse.json({ error: 'Spec README.md not found' }, { status: 404 });
    }
    
    // Read current content
    const currentContent = await readFile(readmePath, 'utf-8');
    
    // Build updates object (only include fields that were provided)
    const updates: Record<string, unknown> = {};
    if (payload.status) updates.status = payload.status;
    if (payload.priority) updates.priority = payload.priority;
    if (payload.tags !== undefined) updates.tags = payload.tags;
    if (payload.assignee !== undefined) updates.assignee = payload.assignee || undefined;
    
    // Update frontmatter using @leanspec/core
    const { content: updatedContent, frontmatter } = createUpdatedFrontmatter(currentContent, updates);
    
    // Write back to file
    await writeFile(readmePath, updatedContent, 'utf-8');

    return NextResponse.json({ 
      success: true,
      frontmatter: {
        status: frontmatter.status,
        priority: frontmatter.priority,
        tags: frontmatter.tags,
        assignee: frontmatter.assignee,
      }
    });
  } catch (error) {
    console.error('Failed to update spec metadata:', error);
    return NextResponse.json({ error: 'Failed to update spec metadata' }, { status: 500 });
  }
}
