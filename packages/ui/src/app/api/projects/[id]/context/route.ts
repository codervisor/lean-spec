/**
 * API endpoint for project context data
 * Spec 131 - UI Project Context Visibility
 */

import { NextResponse } from 'next/server';
import { getProjectContext } from '@/lib/db/service-queries';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Note: getProjectContext is filesystem-based and doesn't use projectId yet
    // In multi-project mode, it reads from the current project's filesystem
    const context = await getProjectContext();
    return NextResponse.json(context);
  } catch (error) {
    console.error('Error fetching project context:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project context' },
      { status: 500 }
    );
  }
}
