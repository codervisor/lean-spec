/**
 * GET /api/projects/[id]/tags - Get all unique tags from specs in a project
 * 
 * For unified routing (spec 151):
 * - 'default' projectId is treated as single-project mode
 * - Other projectIds use multi-project source
 */

import { NextResponse } from 'next/server';
import { getAllTags } from '@/lib/db/service-queries';
import { isDefaultProject } from '@/lib/projects/constants';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Use 'default' project as undefined for backward compatibility
    const projectId = isDefaultProject(id) ? undefined : id;
    const tags = await getAllTags(projectId);
    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}
