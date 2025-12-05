/**
 * GET /api/tags - Get all unique tags from specs
 */

import { NextResponse } from 'next/server';
import { getAllTags } from '@/lib/db/service-queries';

export async function GET() {
  try {
    const tags = await getAllTags();
    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}
