/**
 * GET /api/specs/[id] - Get a specific spec
 */

import { NextResponse } from 'next/server';
import { getSpecById } from '@/lib/db/service-queries';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const spec = await getSpecById(id);
    
    if (!spec) {
      return NextResponse.json(
        { error: 'Spec not found' },
        { status: 404 }
      );
    }
    
    // Tier 2: Add cache headers for client-side caching
    return NextResponse.json({ spec }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    });
  } catch (error) {
    console.error('Error fetching spec:', error);
    return NextResponse.json(
      { error: 'Failed to fetch spec' },
      { status: 500 }
    );
  }
}
