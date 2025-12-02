import { NextResponse } from 'next/server';
import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createUpdatedFrontmatter } from '@leanspec/core';
import { projectRegistry } from '@/lib/projects/registry';

const ALLOWED_STATUSES = ['planned', 'in-progress', 'complete', 'archived'] as const;
type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

async function findSpecDirectory(specsDir: string, specIdentifier: string): Promise<string | null> {
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
  { params }: { params: Promise<{ id: string; spec: string }> }
) {
  try {
    const { id: projectId, spec: specId } = await params;
    
    if (process.env.SPECS_MODE !== 'multi-project') {
      return NextResponse.json({ error: 'Multi-project mode not enabled' }, { status: 400 });
    }

    const project = await projectRegistry.getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
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
    const specDir = await findSpecDirectory(project.specsDir, specIdentifier);
    
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
