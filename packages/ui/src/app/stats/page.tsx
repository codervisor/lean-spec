/**
 * Stats page with detailed metrics and charts
 */

import { redirect } from 'next/navigation';
import { getStats, getSpecs } from '@/lib/db/service-queries';
import { projectRegistry } from '@/lib/projects/registry';
import { StatsClient } from './stats-client';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function StatsPage() {
  const specsMode = process.env.SPECS_MODE || 'filesystem';
  
  // In multi-project mode, redirect to the most recent project's stats
  if (specsMode === 'multi-project') {
    const recentProjects = await projectRegistry.getRecentProjects();
    
    if (recentProjects.length > 0) {
      redirect(`/projects/${recentProjects[0].id}/stats`);
    }
    
    // If no recent projects, check for any projects
    const projects = await projectRegistry.getProjects();
    if (projects.length > 0) {
      redirect(`/projects/${projects[0].id}/stats`);
    }
    
    // No projects at all - redirect to projects page to add one
    redirect('/projects');
  }
  
  const [stats, specs] = await Promise.all([
    getStats(),
    getSpecs(),
  ]);

  return <StatsClient stats={stats} specs={specs} />;
}
