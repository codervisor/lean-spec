/**
 * GET /api/projects/[id]/tags - Get all unique tags from specs in a project
 */

import { NextResponse } from 'next/server';
import { getAllTags } from '@/lib/db/service-queries';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    
    if (process.env.SPECS_MODE !== 'multi-project') {
      return NextResponse.json({ error: 'Multi-project mode not enabled' }, { status: 400 });
    }
    
    const tags = await getAllTags(projectId);
    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}
