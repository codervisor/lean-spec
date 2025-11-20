/**
 * GET /api/projects - List all projects
 */

import { NextResponse } from 'next/server';
import { getProjects } from '@/lib/db/queries';
import { projectRegistry } from '@/lib/projects/registry';

export async function GET() {
  try {
    // Check if running in multi-project mode
    if (process.env.SPECS_MODE === 'multi-project') {
      const projects = await projectRegistry.getProjects();
      const recentProjects = await projectRegistry.getRecentProjects();
      const favoriteProjects = await projectRegistry.getFavoriteProjects();
      return NextResponse.json({ projects, recentProjects, favoriteProjects });
    }

    const projects = await getProjects();
    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (process.env.SPECS_MODE !== 'multi-project') {
      return NextResponse.json(
        { error: 'Multi-project mode is not enabled' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { path, favorite, color } = body;

    if (!path) {
      return NextResponse.json(
        { error: 'Project path is required' },
        { status: 400 }
      );
    }

    const project = await projectRegistry.addProject(path, { favorite, color });
    return NextResponse.json({ project });
  } catch (error: any) {
    console.error('Error adding project:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add project' },
      { status: 500 }
    );
  }
}
