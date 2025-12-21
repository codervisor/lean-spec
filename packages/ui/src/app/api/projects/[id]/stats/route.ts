/**
 * GET /api/projects/[id]/stats - Get stats for a project
 * 
 * For unified routing (spec 151):
 * - 'default' projectId is treated as single-project mode
 * - Other projectIds use multi-project source
 */

import { NextResponse } from 'next/server';
import { getStats } from '@/lib/db/service-queries';
import { isDefaultProject } from '@/lib/projects/constants';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Use 'default' project as undefined for backward compatibility
    const projectId = isDefaultProject(id) ? undefined : id;
    const stats = await getStats(projectId);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
