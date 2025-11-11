/**
 * GET /api/stats - Get project and spec statistics
 */

import { NextResponse } from 'next/server';
import { getStats } from '@/lib/db/queries';

export async function GET() {
  try {
    const stats = await getStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
