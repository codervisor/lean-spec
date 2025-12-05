/**
 * PATCH /api/projects/[id]/specs/[spec]/status - Update spec status
 * 
 * For unified routing (spec 151):
 * - 'default' projectId is treated as single-project mode (filesystem)
 * - Other projectIds use multi-project source
 */

import { NextResponse } from 'next/server';
import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createUpdatedFrontmatter } from '@leanspec/core';
import { projectRegistry } from '@/lib/projects/registry';
import { isDefaultProject } from '@/lib/projects/constants';

const ALLOWED_STATUSES = ['planned', 'in-progress', 'complete', 'archived'] as const;
type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

/**
 * Resolve the project root for single-project (default) mode
 */
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

async function findSpecDirectory(specsDir: string, specIdentifier: string): Promise<string | null> {
  if (!existsSync(specsDir)) {
    return null;
  }

  const { readdir } = await import('node:fs/promises');
  const entries = await readdir(specsDir, { withFileTypes: true });
  
  // Match by spec number or full directory name
  const specPattern = /^(\d{2,})-(.+)$/;
  const specNum = parseInt(specIdentifier.split('-')[0], 10);
  
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    
    // Match by full name
    if (entry.name === specIdentifier) {
      return path.join(specsDir, entry.name);
    }
    
    // Match by spec number
    if (!isNaN(specNum) && specPattern.test(entry.name)) {
      const dirNum = parseInt(entry.name.split('-')[0], 10);
      if (dirNum === specNum) {
        return path.join(specsDir, entry.name);
      }
    }
    
    // Match by name portion (for multi-project mode where specName doesn't include number)
    const match = entry.name.match(specPattern);
    if (match && match[2] === specIdentifier) {
      return path.join(specsDir, entry.name);
    }
  }
  
  return null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; spec: string }> }
) {
  try {
    const { id: projectId, spec: specId } = await params;
    
    // Determine specsDir based on project ID
    let specsDir: string;
    
    if (isDefaultProject(projectId)) {
      // Single-project mode (default project): use filesystem
      const projectRoot = resolveProjectRoot();
      specsDir = process.env.SPECS_DIR 
        ? path.resolve(process.env.SPECS_DIR)
        : path.join(projectRoot, 'specs');
    } else {
      // Multi-project mode: get specsDir from project registry
      if (process.env.SPECS_MODE !== 'multi-project') {
        return NextResponse.json({ error: 'Multi-project mode not enabled' }, { status: 400 });
      }
      
      const project = await projectRegistry.getProject(projectId);
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      specsDir = project.specsDir;
    }

    let payload: { status?: AllowedStatus } = {};
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { status } = payload;
    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    const specIdentifier = decodeURIComponent(specId);
    const specDir = await findSpecDirectory(specsDir, specIdentifier);
    
    if (!specDir) {
      return NextResponse.json({ error: 'Spec not found' }, { status: 404 });
    }
    
    const readmePath = path.join(specDir, 'README.md');
    
    if (!existsSync(readmePath)) {
      return NextResponse.json({ error: 'Spec README.md not found' }, { status: 404 });
    }
    
    // Read current content
    const currentContent = await readFile(readmePath, 'utf-8');
    
    // Update frontmatter using @leanspec/core
    const { content: updatedContent } = createUpdatedFrontmatter(currentContent, { status });
    
    // Write back to file
    await writeFile(readmePath, updatedContent, 'utf-8');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update spec status:', error);
    return NextResponse.json({ error: 'Failed to update spec status' }, { status: 500 });
  }
}
