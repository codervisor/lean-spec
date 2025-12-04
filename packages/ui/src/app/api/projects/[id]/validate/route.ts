/**
 * Project Validation API route
 * Re-validates a project path to check if it still exists and is valid
 */

import { NextResponse } from 'next/server';
import { projectRegistry } from '@/lib/projects/registry';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (process.env.SPECS_MODE !== 'multi-project') {
      return NextResponse.json(
        { error: 'Multi-project mode is not enabled' },
        { status: 400 }
      );
    }

    const { id } = await params;
    const project = await projectRegistry.getProject(id);
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const validation = await projectRegistry.validateProject(project.path);
    
    return NextResponse.json({
      projectId: id,
      path: project.path,
      validation: {
        isValid: validation.isValid,
        error: validation.error,
        specsDir: validation.specsDir,
      }
    });
  } catch (error) {
    console.error('Error validating project:', error);
    return NextResponse.json(
      { error: 'Failed to validate project' },
      { status: 500 }
    );
  }
}
