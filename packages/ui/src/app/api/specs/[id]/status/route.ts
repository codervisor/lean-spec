/**
 * PATCH /api/specs/[id]/status - Update a spec's status (filesystem mode)
 */

import { NextResponse } from 'next/server';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { updateSpec } from '@cli/commands/update';

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
    await updateSpec(specIdentifier, { status }, { cwd: PROJECT_ROOT });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update spec status:', error);
    return NextResponse.json({ error: 'Failed to update spec status' }, { status: 500 });
  }
}
