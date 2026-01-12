/**
 * API endpoint for project context data
 * Spec 131 - UI Project Context Visibility
 * 
 * For unified routing (spec 151):
 * - 'default' projectId is treated as single-project mode
 * - Other projectIds use project registry
 */

import { NextResponse } from 'next/server';
import { getProjectContext } from '@/lib/db/service-queries';
import { projectRegistry } from '@/lib/projects/registry';
import { isDefaultProject } from '@/lib/projects/constants';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // For default project, use current working directory
    if (isDefaultProject(id)) {
      const context = await getProjectContext();
      return NextResponse.json(context);
    }
    
    // For multi-project mode, get project from registry
    const project = await projectRegistry.getProject(id);
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    // Get context from the project's directory
    const context = await getProjectContext(project.path);
    return NextResponse.json(context);
  } catch (error) {
    console.error('Error fetching project context:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project context' },
      { status: 500 }
    );
  }
}
