/**
 * GET /api/projects/[id]/specs - Get specs for a project
 * 
 * Uses filesystem-based service-queries for all modes.
 * Database mode was planned for external GitHub repos (spec 035/082) but not yet implemented.
 * 
 * For unified routing (spec 151):
 * - 'default' projectId is treated as single-project mode
 * - Other projectIds use multi-project source
 */

import { NextResponse } from 'next/server';
import { getSpecs } from '@/lib/db/service-queries';
import { isDefaultProject } from '@/lib/projects/constants';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Use 'default' project as undefined for backward compatibility
    // This routes to filesystem source in single-project mode
    const projectId = isDefaultProject(id) ? undefined : id;
    const specs = await getSpecs(projectId);
    
    return NextResponse.json({ specs });
  } catch (error) {
    console.error('Error fetching specs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch specs' },
      { status: 500 }
    );
  }
}
