import { NextResponse } from 'next/server';
import { getSpecsWithMetadata } from '@/lib/db/service-queries';
import type { ProjectDependencyGraph } from '@/app/api/dependencies/route';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const specs = await getSpecsWithMetadata(projectId);
    
    const nodes = specs
      .filter(spec => spec.specNumber !== null)
      .map(spec => ({
        id: spec.id,
        name: spec.title || spec.specName || `Spec ${spec.specNumber}`,
        number: spec.specNumber!,
        status: spec.status || 'planned',
        priority: spec.priority || 'medium',
        tags: spec.tags || [],
      }));

    const edges: ProjectDependencyGraph['edges'] = [];
    const specIdByFolder = new Map<string, string>();
    
    specs.forEach(spec => {
      if (spec.specNumber !== null) {
        const folderName = spec.filePath
          .replace(/^specs\//, '')
          .replace(/\/README\.md$/, '');
        specIdByFolder.set(folderName, spec.id);
        
        const paddedNumber = spec.specNumber.toString().padStart(3, '0');
        specIdByFolder.set(paddedNumber, spec.id);
        specIdByFolder.set(spec.specNumber.toString(), spec.id);
      }
    });

    specs.forEach(spec => {
      if (!spec.specNumber) return;
      
      spec.relationships.dependsOn.forEach(dep => {
        const depTrimmed = dep.trim();
        const match = depTrimmed.match(/^(\d+)/);
        const targetId = match 
          ? specIdByFolder.get(match[1]) || specIdByFolder.get(match[1].padStart(3, '0'))
          : specIdByFolder.get(depTrimmed);
        
        if (targetId && targetId !== spec.id) {
          edges.push({
            source: targetId,
            target: spec.id,
            type: 'dependsOn',
          });
        }
      });
    });

    const graph: ProjectDependencyGraph = { nodes, edges };
    return NextResponse.json(graph);
  } catch (error) {
    console.error('Error fetching dependency graph:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dependency graph' },
      { status: 500 }
    );
  }
}
