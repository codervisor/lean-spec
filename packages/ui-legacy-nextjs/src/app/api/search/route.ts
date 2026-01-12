import { NextResponse } from 'next/server';
import { getSpecsWithMetadata } from '@/lib/db/service-queries';
import { isDefaultProject } from '@/lib/projects/constants';

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body', code: 'INVALID_REQUEST' },
      { status: 400 }
    );
  }

  const { query, projectId } = body || {};
  if (!query || typeof query !== 'string') {
    return NextResponse.json(
      { error: 'Query is required', code: 'INVALID_REQUEST' },
      { status: 400 }
    );
  }

  const scopedProjectId = isDefaultProject(projectId) ? undefined : projectId;

  try {
    const specs = await getSpecsWithMetadata(scopedProjectId);
    const queryLower = query.toLowerCase();

    const results = specs.filter((spec) => {
      const title = spec.title || spec.specName || '';
      const path = spec.specName || '';
      const tags = spec.tags || [];

      return (
        title.toLowerCase().includes(queryLower) ||
        path.toLowerCase().includes(queryLower) ||
        tags.some((tag) => tag.toLowerCase().includes(queryLower))
      );
    });

    return NextResponse.json({
      results,
      total: results.length,
      query,
    });
  } catch (error) {
    console.error('Error performing search:', error);
    return NextResponse.json(
      { error: 'Failed to perform search', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
