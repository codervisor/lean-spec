/**
 * Project Home Page - Dashboard for a specific project
 */

import { getStats, getSpecs } from '@/lib/db/service-queries';
import { DashboardClient } from '@/app/dashboard-client';
import { isDefaultProject } from '@/lib/projects/constants';

// Force dynamic rendering - this page needs runtime data
export const dynamic = 'force-dynamic';

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  
  // Convert 'default' project to undefined for filesystem mode
  const actualProjectId = isDefaultProject(projectId) ? undefined : projectId;
  
  const [stats, specs] = await Promise.all([
    getStats(actualProjectId),
    getSpecs(actualProjectId),
  ]);

  return <DashboardClient initialSpecs={specs} initialStats={stats} projectId={projectId} />;
}
