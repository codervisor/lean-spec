/**
 * GET /api/projects/[id]/dependencies - Get dependency graph for a project
 * 
 * For unified routing (spec 151):
 * - 'default' projectId is treated as single-project mode
 * - Other projectIds use multi-project source
 */

import { NextResponse } from 'next/server';
import { getDependencyGraph } from '@/lib/db/service-queries';
import { isDefaultProject } from '@/lib/projects/constants';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Use 'default' project as undefined for backward compatibility
    const projectId = isDefaultProject(id) ? undefined : id;
    const graph = await getDependencyGraph(projectId);
    return NextResponse.json(graph);
  } catch (error) {
    console.error('Error fetching dependency graph:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dependency graph' },
      { status: 500 }
    );
  }
}

