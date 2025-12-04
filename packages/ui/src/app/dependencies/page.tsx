import { ProjectDependencyGraphClient } from './dependencies-client';
import type { ProjectDependencyGraph } from '@/app/api/dependencies/route';

async function getDependencyGraph(): Promise<ProjectDependencyGraph> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/dependencies`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch dependency graph');
  }

  return res.json();
}

export default async function DependenciesPage() {
  const data = await getDependencyGraph();

  if (data.nodes.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="rounded-lg border border-border bg-muted/30 p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">No Specs Found</h2>
          <p className="text-muted-foreground">
            There are no specifications with dependencies to visualize yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 h-[calc(100vh-7rem)]">
      <ProjectDependencyGraphClient data={data} />
    </div>
  );
}
