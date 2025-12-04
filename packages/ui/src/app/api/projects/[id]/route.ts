/**
 * Project API routes
 * 
 * Uses filesystem-based project registry for all modes.
 * Database mode was planned for external GitHub repos (spec 035/082) but not yet implemented.
 */

import { NextResponse } from 'next/server';
import { projectRegistry } from '@/lib/projects/registry';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const specsMode = process.env.SPECS_MODE || 'filesystem';

    if (specsMode === 'multi-project') {
      const project = await projectRegistry.getProject(id);
      if (!project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }
      // Touch project to update lastAccessed
      await projectRegistry.touchProject(id);
      return NextResponse.json({ project });
    }

    // Filesystem mode: return a virtual single project
    if (id === 'local') {
      const specsDir = process.env.SPECS_DIR || 'specs';
      return NextResponse.json({ 
        project: {
          id: 'local',
          displayName: 'Local Project',
          specsDir,
          isFeatured: true,
        }
      });
    }

    return NextResponse.json(
      { error: 'Project not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (process.env.SPECS_MODE !== 'multi-project') {
      return NextResponse.json(
        { error: 'Multi-project mode is not enabled' },
        { status: 400 }
      );
    }

    const { id } = await params;
    await projectRegistry.removeProject(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (process.env.SPECS_MODE !== 'multi-project') {
      return NextResponse.json(
        { error: 'Multi-project mode is not enabled' },
        { status: 400 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Handle favorite toggle separately
    if ('favorite' in body) {
      const favorite = await projectRegistry.toggleFavorite(id);
      const project = await projectRegistry.getProject(id);
      return NextResponse.json({ project, favorite });
    }

    const project = await projectRegistry.updateProject(id, body);
    return NextResponse.json({ project });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}
