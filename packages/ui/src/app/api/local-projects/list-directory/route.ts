/**
 * API Route for listing directory contents
 * 
 * POST /api/local-projects/list-directory - List directories in a path
 */

import { NextRequest, NextResponse } from 'next/server';
import { projectRegistry } from '@/lib/projects';
import { homedir } from 'node:os';

/**
 * POST /api/local-projects/list-directory
 * List directories in a given path
 * 
 * Body: { path?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path } = body;

    // Use CWD if path is not provided, falling back to homedir
    const targetPath = path || process.cwd() || homedir();

    const items = await projectRegistry.listDirectory(targetPath);

    return NextResponse.json({ 
      path: targetPath,
      items,
    });
  } catch (error: any) {
    console.error('Error listing directory:', error);
    return NextResponse.json(
      { error: 'Failed to list directory', details: error.message },
      { status: 500 }
    );
  }
}
