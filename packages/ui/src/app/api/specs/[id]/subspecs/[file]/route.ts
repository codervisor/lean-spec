/**
 * GET /api/specs/[id]/subspecs/[file] - Get a specific sub-spec file
 */

import { NextResponse } from 'next/server';
import { getSpecById } from '@/lib/db/service-queries';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; file: string }> }
) {
  try {
    const { id, file } = await params;
    const spec = await getSpecById(id);
    
    if (!spec) {
      return NextResponse.json(
        { error: 'Spec not found' },
        { status: 404 }
      );
    }

    // Find the requested sub-spec file
    const subSpec = spec.subSpecs?.find(s => s.file === file);
    
    if (!subSpec) {
      return NextResponse.json(
        { error: 'Sub-spec not found' },
        { status: 404 }
      );
    }
    
    // Tier 2: Add cache headers for client-side caching
    return NextResponse.json({ subSpec }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    });
  } catch (error) {
    console.error('Error fetching sub-spec:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sub-spec' },
      { status: 500 }
    );
  }
}
