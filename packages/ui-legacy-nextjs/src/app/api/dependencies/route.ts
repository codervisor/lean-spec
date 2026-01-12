import { NextResponse } from 'next/server';
import { getDependencyGraph, type DependencyGraph } from '@/lib/db/service-queries';

// Re-export for backwards compatibility
export type ProjectDependencyGraph = DependencyGraph;

export async function GET() {
  try {
    const graph = await getDependencyGraph();
    return NextResponse.json(graph);
  } catch (error) {
    console.error('Error fetching dependency graph:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dependency graph' },
      { status: 500 }
    );
  }
}
