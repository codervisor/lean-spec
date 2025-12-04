import { ProjectDependencyGraphClient } from '@/app/dependencies/dependencies-client';
import type { ProjectDependencyGraph } from '@/app/api/dependencies/route';

async function getDependencyGraph(projectId: string): Promise<ProjectDependencyGraph> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/projects/${projectId}/dependencies`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch dependency graph');
  }

  return res.json();
}

export default async function ProjectDependenciesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const data = await getDependencyGraph(projectId);

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
