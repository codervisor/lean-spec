/**
 * GET /api/projects/[id]/specs/[spec]/dependency-graph - Get complete dependency graph for a spec (multi-project mode)
 * 
 * Returns upstream dependencies, downstream dependents for the specified spec
 * in multi-project mode where specs are loaded from project registries.
 */

import { NextResponse } from 'next/server';
import { getSpecById, getSpecsWithMetadata } from '@/lib/db/service-queries';

/**
 * Helper to extract title from name
 */
function getTitle(name: string): string {
  const parts = name.split('-');
  if (parts.length > 1) {
    return parts.slice(1).join('-').replace(/-/g, ' ');
  }
  return name;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; spec: string }> }
) {
  try {
    const { id: projectId, spec: specId } = await params;
    
    // Get the target spec
    const spec = await getSpecById(specId, projectId);
    if (!spec) {
      return NextResponse.json(
        { error: 'Spec not found' },
        { status: 404 }
      );
    }

    // Get all specs with metadata to build the dependency graph
    const allSpecs = await getSpecsWithMetadata(projectId);
    
    // Build lookup maps
    const specByName = new Map<string, typeof allSpecs[0]>();
    const specByNumber = new Map<string, typeof allSpecs[0]>();
    
    for (const s of allSpecs) {
      specByName.set(s.specName, s);
      if (s.specNumber) {
        specByNumber.set(s.specNumber.toString(), s);
        specByNumber.set(s.specNumber.toString().padStart(3, '0'), s);
      }
    }
    
    // Find this spec's relationships
    const currentSpec = allSpecs.find(s => 
      s.specNumber?.toString() === specId || 
      s.specNumber?.toString().padStart(3, '0') === specId ||
      s.specName === specId ||
      s.id === specId
    );
    
    if (!currentSpec) {
      return NextResponse.json(
        { error: 'Spec not found in project' },
        { status: 404 }
      );
    }
    
    // Resolve dependsOn specs
    const dependsOnSpecs = currentSpec.relationships.dependsOn
      .map(dep => {
        const match = dep.match(/^(\d+)/);
        if (match) {
          return specByNumber.get(match[1]) || specByNumber.get(match[1].padStart(3, '0'));
        }
        return specByName.get(dep);
      })
      .filter((s): s is typeof allSpecs[0] => s !== undefined);
    
    // Resolve requiredBy specs
    const requiredBySpecs = currentSpec.relationships.requiredBy
      .map(dep => {
        const match = dep.match(/^(\d+)/);
        if (match) {
          return specByNumber.get(match[1]) || specByNumber.get(match[1].padStart(3, '0'));
        }
        return specByName.get(dep);
      })
      .filter((s): s is typeof allSpecs[0] => s !== undefined);
    
    // Format response with simplified spec metadata
    const response = {
      current: {
        id: spec.id,
        specNumber: spec.specNumber,
        specName: spec.specName,
        title: spec.title,
        status: spec.status,
        priority: spec.priority,
      },
      dependsOn: dependsOnSpecs.map(s => ({
        specNumber: s.specNumber,
        specName: s.specName,
        title: s.title || getTitle(s.specName),
        status: s.status,
        priority: s.priority,
      })),
      requiredBy: requiredBySpecs.map(s => ({
        specNumber: s.specNumber,
        specName: s.specName,
        title: s.title || getTitle(s.specName),
        status: s.status,
        priority: s.priority,
      })),
    };
    
    // Return with cache headers
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    });
  } catch (error) {
    console.error('Error fetching dependency graph:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dependency graph' },
      { status: 500 }
    );
  }
}
