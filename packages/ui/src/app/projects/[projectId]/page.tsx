/**
 * Project Home Page - Dashboard for a specific project
 */

import { getStats, getSpecs } from '@/lib/db/service-queries';
import { DashboardClient } from '@/app/dashboard-client';

// Force dynamic rendering - this page needs runtime data
export const dynamic = 'force-dynamic';

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  
  // TODO: In future, use projectId to fetch project-specific data
  // For now, we use the same data source as single-project mode
  const [stats, specs] = await Promise.all([
    getStats(projectId),
    getSpecs(projectId),
  ]);

  return <DashboardClient initialSpecs={specs} initialStats={stats} projectId={projectId} />;
}
