/**
 * GET /api/projects/[id]/specs - Get specs for a project
 * 
 * Uses filesystem-based service-queries for all modes.
 * Database mode was planned for external GitHub repos (spec 035/082) but not yet implemented.
 */

import { NextResponse } from 'next/server';
import { getSpecs } from '@/lib/db/service-queries';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const specsMode = process.env.SPECS_MODE || 'filesystem';

    // Pass projectId only for multi-project mode
    const projectId = specsMode === 'multi-project' ? id : undefined;
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
