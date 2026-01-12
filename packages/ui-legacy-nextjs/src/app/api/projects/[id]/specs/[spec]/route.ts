/**
 * GET /api/projects/[id]/specs/[spec] - Get a single spec
 * 
 * Uses filesystem-based service-queries for all modes.
 * Database mode was planned for external GitHub repos (spec 035/082) but not yet implemented.
 * 
 * For unified routing (spec 151):
 * - 'default' projectId is treated as single-project mode
 * - Other projectIds use multi-project source
 */

import { NextResponse } from 'next/server';
import { getSpecById } from '@/lib/db/service-queries';
import { isDefaultProject } from '@/lib/projects/constants';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; spec: string }> }
) {
  try {
    const { id, spec: specId } = await params;

    // Use 'default' project as undefined for backward compatibility
    // This routes to filesystem source in single-project mode
    const projectId = isDefaultProject(id) ? undefined : id;
    const spec = await getSpecById(specId, projectId);
    
    if (!spec) {
      return NextResponse.json(
        { error: 'Spec not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ spec });
  } catch (error) {
    console.error('Error fetching spec:', error);
    return NextResponse.json(
      { error: 'Failed to fetch spec' },
      { status: 500 }
    );
  }
}
