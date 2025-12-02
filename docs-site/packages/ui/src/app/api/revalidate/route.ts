/**
 * POST /api/revalidate - Cache invalidation endpoint
 * 
 * Invalidates the in-memory cache for filesystem mode.
 * Requires authentication via REVALIDATION_SECRET.
 * 
 * Usage:
 *   POST /api/revalidate
 *   Body: { "secret": "your-secret", "specPath": "082" }
 * 
 * Examples:
 *   - Invalidate specific spec: { "secret": "...", "specPath": "082" }
 *   - Invalidate all specs: { "secret": "..." }
 */

import { NextResponse } from 'next/server';
import { specsService } from '@/lib/specs/service';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  try {
    const { secret, specPath } = await request.json();

    // Verify secret
    const expectedSecret = process.env.REVALIDATION_SECRET;
    if (!expectedSecret) {
      return NextResponse.json(
        { error: 'Revalidation not configured' },
        { status: 503 }
      );
    }

    if (secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Invalidate cache
    await specsService.invalidateCache(specPath);

    // Also revalidate Next.js cache
    if (specPath) {
      revalidatePath(`/specs/${specPath}`);
    } else {
      revalidatePath('/specs');
      revalidatePath('/');
    }

    return NextResponse.json({
      revalidated: true,
      specPath: specPath || 'all',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error revalidating cache:', error);
    return NextResponse.json(
      { error: 'Failed to revalidate cache' },
      { status: 500 }
    );
  }
}
