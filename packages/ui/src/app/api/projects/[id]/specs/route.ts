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

const VALID_STATUSES = ['planned', 'in-progress', 'complete', 'archived'];

function isValidStatusFilter(statusParam: string | null): boolean {
  if (!statusParam) return true;
  return statusParam.split(',').every((s) => VALID_STATUSES.includes(s));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const statusParam = url.searchParams.get('status');
    if (!isValidStatusFilter(statusParam)) {
      return NextResponse.json(
        { error: 'Invalid status filter', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }
    
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
