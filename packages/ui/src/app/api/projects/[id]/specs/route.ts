/**
 * GET /api/projects/[id]/specs - Get specs for a project
 */

import { NextResponse } from 'next/server';
import { getSpecsByProjectId } from '@/lib/db/queries';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const specs = await getSpecsByProjectId(id);
    return NextResponse.json({ specs });
  } catch (error) {
    console.error('Error fetching specs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch specs' },
      { status: 500 }
    );
  }
}
