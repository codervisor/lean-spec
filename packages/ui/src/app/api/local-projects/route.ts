/**
 * API Routes for local project management
 * 
 * GET /api/local-projects - List all local projects
 * POST /api/local-projects - Add a new project
 */

import { NextRequest, NextResponse } from 'next/server';
import { projectRegistry } from '@/lib/projects';

/**
 * GET /api/local-projects
 * Returns all registered local projects
 */
export async function GET() {
  try {
    const projects = await projectRegistry.getProjects();
    const recentProjects = await projectRegistry.getRecentProjects();
    const favoriteProjects = await projectRegistry.getFavoriteProjects();

    return NextResponse.json({
      projects,
      recentProjects,
      favoriteProjects,
    });
  } catch (error: any) {
    console.error('Error fetching local projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch local projects', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/local-projects
 * Add a new project to the registry
 * 
 * Body: { path: string, favorite?: boolean, color?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, favorite, color } = body;

    if (!path || typeof path !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: path is required' },
        { status: 400 }
      );
    }

    const project = await projectRegistry.addProject(path, { favorite, color });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding project:', error);
    return NextResponse.json(
      { error: 'Failed to add project', details: error.message },
      { status: 500 }
    );
  }
}
