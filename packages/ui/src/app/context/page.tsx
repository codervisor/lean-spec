/**
 * Project Context Page
 * Displays project-level context files for AI agents and development workflows
 * Spec 131 - UI Project Context Visibility
 */

import { redirect } from 'next/navigation';
import { getProjectContext } from '@/lib/db/service-queries';
import { projectRegistry } from '@/lib/projects/registry';
import { ContextClient } from './context-client';

// Force dynamic rendering - this page needs runtime data
export const dynamic = 'force-dynamic';

export default async function ContextPage() {
  const specsMode = process.env.SPECS_MODE || 'filesystem';
  
  // In multi-project mode, redirect to the most recent project's context
  if (specsMode === 'multi-project') {
    const recentProjects = await projectRegistry.getRecentProjects();
    
    if (recentProjects.length > 0) {
      redirect(`/projects/${recentProjects[0].id}/context`);
    }
    
    // If no recent projects, check for any projects
    const projects = await projectRegistry.getProjects();
    if (projects.length > 0) {
      redirect(`/projects/${projects[0].id}/context`);
    }
    
    // No projects at all - redirect to projects page to add one
    redirect('/projects');
  }
  
  const context = await getProjectContext();

  return <ContextClient context={context} />;
}
