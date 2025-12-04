/**
 * GET /api/projects/[id]/specs/[spec] - Get a single spec
 * 
 * Uses filesystem-based service-queries for all modes.
 * Database mode was planned for external GitHub repos (spec 035/082) but not yet implemented.
 */

import { NextResponse } from 'next/server';
import { getSpecById } from '@/lib/db/service-queries';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; spec: string }> }
) {
  try {
    const { id, spec: specId } = await params;
    const specsMode = process.env.SPECS_MODE || 'filesystem';

    // Pass projectId only for multi-project mode
    const projectId = specsMode === 'multi-project' ? id : undefined;
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
