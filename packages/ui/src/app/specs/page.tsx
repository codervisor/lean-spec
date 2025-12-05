/**
 * Specs page - Browse all LeanSpec specifications with list/board switcher
 */

import { redirect } from 'next/navigation';
import { getSpecsWithMetadata, getStats } from '@/lib/db/service-queries';
import { projectRegistry } from '@/lib/projects/registry';
import { SpecsClient } from './specs-client';

// Force dynamic rendering - this page needs runtime data
export const dynamic = 'force-dynamic';

export default async function SpecsPage() {
  const specsMode = process.env.SPECS_MODE || 'filesystem';
  
  // In multi-project mode, redirect to the most recent project's specs
  if (specsMode === 'multi-project') {
    const recentProjects = await projectRegistry.getRecentProjects();
    
    if (recentProjects.length > 0) {
      redirect(`/projects/${recentProjects[0].id}/specs`);
    }
    
    // If no recent projects, check for any projects
    const projects = await projectRegistry.getProjects();
    if (projects.length > 0) {
      redirect(`/projects/${projects[0].id}/specs`);
    }
    
    // No projects at all - redirect to projects page to add one
    redirect('/projects');
  }
  
  const [specs, stats] = await Promise.all([
    getSpecsWithMetadata(),
    getStats(),
  ]);

  return <SpecsClient initialSpecs={specs} initialStats={stats} />;
}
