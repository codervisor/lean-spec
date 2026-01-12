/**
 * API Route for project discovery
 * 
 * POST /api/local-projects/discover - Discover projects in a directory
 */

import { NextRequest, NextResponse } from 'next/server';
import { projectRegistry } from '@/lib/projects';

/**
 * POST /api/local-projects/discover
 * Discover LeanSpec projects in a directory tree
 * 
 * Body: { path: string, maxDepth?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, maxDepth = 3 } = body;

    if (!path || typeof path !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: path is required' },
        { status: 400 }
      );
    }

    const discovered = await projectRegistry.discoverProjects(path, maxDepth);

    return NextResponse.json({ 
      discovered,
      count: discovered.length,
    });
  } catch (error: any) {
    console.error('Error discovering projects:', error);
    return NextResponse.json(
      { error: 'Failed to discover projects', details: error.message },
      { status: 500 }
    );
  }
}
