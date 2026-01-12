/**
 * Home page - Dashboard with project overview
 * In multi-project mode, redirects to the most recent project
 */

import { redirect } from 'next/navigation';
import { getStats, getSpecs } from '@/lib/db/service-queries';
import { projectRegistry } from '@/lib/projects/registry';
import { DashboardClient } from './dashboard-client';

// Force dynamic rendering - this page needs runtime data
export const dynamic = 'force-dynamic';

export default async function Home() {
  const specsMode = process.env.SPECS_MODE || 'filesystem';
  
  // In multi-project mode, redirect to the most recent or first project
  if (specsMode === 'multi-project') {
    const recentProjects = await projectRegistry.getRecentProjects();
    
    if (recentProjects.length > 0) {
      redirect(`/projects/${recentProjects[0].id}`);
    }
    
    // If no recent projects, check for any projects
    const projects = await projectRegistry.getProjects();
    if (projects.length > 0) {
      redirect(`/projects/${projects[0].id}`);
    }
    
    // No projects at all - redirect to projects page to add one
    redirect('/projects');
  }
  
  // Single-project mode - show dashboard
  const [stats, specs] = await Promise.all([
    getStats(),
    getSpecs(),
  ]);

  return <DashboardClient initialSpecs={specs} initialStats={stats} />;
}
