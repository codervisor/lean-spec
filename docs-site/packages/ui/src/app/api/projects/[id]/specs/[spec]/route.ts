import { NextResponse } from 'next/server';
import { getSpecById } from '@/lib/db/queries';
import { specsService } from '@/lib/specs/service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; spec: string }> }
) {
  try {
    const { id, spec: specId } = await params;

    if (process.env.SPECS_MODE === 'multi-project') {
      const spec = await specsService.getSpec(specId, id);
      if (!spec) {
        return NextResponse.json(
          { error: 'Spec not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ spec });
    }

    const spec = await getSpecById(specId);
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
