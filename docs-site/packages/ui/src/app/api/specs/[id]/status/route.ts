/**
 * PATCH /api/specs/[id]/status - Update a spec's status (filesystem mode)
 */

import { NextResponse } from 'next/server';
import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createUpdatedFrontmatter } from '@leanspec/core';

const ALLOWED_STATUSES = ['planned', 'in-progress', 'complete', 'archived'] as const;
type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Spec id is required' }, { status: 400 });
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
