/**
 * API Routes for individual project management
 * 
 * GET /api/local-projects/[id] - Get project details
 * PATCH /api/local-projects/[id] - Update project
 * DELETE /api/local-projects/[id] - Remove project
 */

import { NextRequest, NextResponse } from 'next/server';
import { projectRegistry } from '@/lib/projects';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/local-projects/[id]
 * Get project details and touch lastAccessed
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    
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
  } catch (error: any) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/local-projects/[id]
 * Update project metadata
 * 
 * Body: { name?: string, color?: string, description?: string, favorite?: boolean }
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    
    // Handle favorite toggle separately
    if ('favorite' in body && Object.keys(body).length === 1) {
      const favorite = await projectRegistry.toggleFavorite(id);
      const project = await projectRegistry.getProject(id);
      return NextResponse.json({ project, favorite });
    }

    const { name, color, description } = body;
    const updates: any = {};
    
    if (name !== undefined) updates.name = name;
    if (color !== undefined) updates.color = color;
    if (description !== undefined) updates.description = description;

    const project = await projectRegistry.updateProject(id, updates);

    return NextResponse.json({ project });
  } catch (error: any) {
    console.error('Error updating project:', error);
    
    if (error.message === 'Project not found') {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update project', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/local-projects/[id]
 * Remove project from registry (doesn't delete files)
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    
    await projectRegistry.removeProject(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing project:', error);
    return NextResponse.json(
      { error: 'Failed to remove project', details: error.message },
      { status: 500 }
    );
  }
}
