import { redirect } from 'next/navigation';
import { ProjectDependencyGraphClient } from './dependencies-client';
import { getDependencyGraph } from '@/lib/db/service-queries';
import { projectRegistry } from '@/lib/projects/registry';

// Force dynamic rendering - this page needs runtime data
export const dynamic = 'force-dynamic';

export default async function DependenciesPage() {
  const specsMode = process.env.SPECS_MODE || 'filesystem';
  
  // In multi-project mode, redirect to the most recent project's dependencies
  if (specsMode === 'multi-project') {
    const recentProjects = await projectRegistry.getRecentProjects();
    
    if (recentProjects.length > 0) {
      redirect(`/projects/${recentProjects[0].id}/dependencies`);
    }
    
    // If no recent projects, check for any projects
    const projects = await projectRegistry.getProjects();
    if (projects.length > 0) {
      redirect(`/projects/${projects[0].id}/dependencies`);
    }
    
    // No projects at all - redirect to projects page to add one
    redirect('/projects');
  }
  
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
