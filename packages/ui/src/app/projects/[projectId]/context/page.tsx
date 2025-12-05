/**
 * Project Context Page
 * Displays project-level context files for AI agents and development workflows
 * Spec 131 - UI Project Context Visibility
 */

import { getProjectContext } from '@/lib/db/service-queries';
import { ContextClient } from '@/components/context-client';
import { projectRegistry } from '@/lib/projects/registry';

// Force dynamic rendering - this page needs runtime data
export const dynamic = 'force-dynamic';

export default async function ProjectContextPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  
  // Get project to find its path
  const project = await projectRegistry.getProject(projectId);
  
  if (!project) {
    return (
      <div className="container mx-auto p-6">
        <div className="rounded-lg border border-border bg-muted/30 p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Project Not Found</h2>
          <p className="text-muted-foreground">
            The requested project could not be found.
          </p>
        </div>
      </div>
    );
  }
  
  // Get context from the project's directory
  const context = await getProjectContext(project.path);

  return <ContextClient context={context} />;
}
