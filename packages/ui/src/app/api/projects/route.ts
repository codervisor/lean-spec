/**
 * GET /api/projects - List all projects
 * 
 * Modes:
 * - filesystem (default): returns a single virtual project for the local specs
 * - multi-project: reads from project registry (filesystem-based)
 * 
 * Database mode was planned for external GitHub repos (spec 035/082) but not yet implemented.
 */

import { NextResponse } from 'next/server';
import { projectRegistry } from '@/lib/projects/registry';

export async function GET() {
  try {
    const specsMode = process.env.SPECS_MODE || 'filesystem';

    // Multi-project mode: use project registry (filesystem-based)
    if (specsMode === 'multi-project') {
      const projects = await projectRegistry.getProjects();
      const recentProjects = await projectRegistry.getRecentProjects();
      const favoriteProjects = await projectRegistry.getFavoriteProjects();
      return NextResponse.json({ 
        mode: 'multi-project',
        projects, 
        recentProjects, 
        favoriteProjects 
      });
    }

    // Filesystem mode: return a virtual single project (no database needed)
    const specsDir = process.env.SPECS_DIR || 'specs';
    return NextResponse.json({ 
      mode: 'single-project',
      projects: [{
        id: 'local',
        displayName: 'Local Project',
        specsDir,
        isFeatured: true,
      }]
    });
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
  } catch (error) {
    console.error('Error adding project:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add project' },
      { status: 500 }
    );
  }
}
