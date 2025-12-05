/**
 * Spec detail page with markdown rendering and enhanced UI
 * Phase 2: Tier 2 - Hybrid Rendering with client-side caching
 */

import { notFound, redirect } from 'next/navigation';
import { getSpecById, getSpecsWithSubSpecCount } from '@/lib/db/service-queries';
import { projectRegistry } from '@/lib/projects/registry';
import { SpecDetailWrapper } from '@/components/spec-detail-wrapper';

// Tier 1: Route segment caching for performance
export const revalidate = 60; // Cache rendered pages for 60s
export const dynamicParams = true; // Generate new pages on demand

export default async function SpecDetailPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ id: string }>;
  searchParams: Promise<{ subspec?: string }>;
}) {
  const { id } = await params;
  const { subspec: currentSubSpec } = await searchParams;
  
  const specsMode = process.env.SPECS_MODE || 'filesystem';
  
  // In multi-project mode, redirect to the most recent project's spec detail
  if (specsMode === 'multi-project') {
    const recentProjects = await projectRegistry.getRecentProjects();
    
    if (recentProjects.length > 0) {
      const subspecParam = currentSubSpec ? `?subspec=${currentSubSpec}` : '';
      redirect(`/projects/${recentProjects[0].id}/specs/${id}${subspecParam}`);
    }
    
    // If no recent projects, check for any projects
    const projects = await projectRegistry.getProjects();
    if (projects.length > 0) {
      const subspecParam = currentSubSpec ? `?subspec=${currentSubSpec}` : '';
      redirect(`/projects/${projects[0].id}/specs/${id}${subspecParam}`);
    }
    
    // No projects at all - redirect to projects page to add one
    redirect('/projects');
  }
  
  const [spec, allSpecs] = await Promise.all([
    getSpecById(id),
    getSpecsWithSubSpecCount()
  ]);

  if (!spec) {
    notFound();
  }

  return (
    <SpecDetailWrapper 
      spec={spec}
      allSpecs={allSpecs}
      currentSubSpec={currentSubSpec}
    />
  );
}



