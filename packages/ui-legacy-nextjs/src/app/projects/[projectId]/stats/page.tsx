/**
 * Project Stats page with detailed metrics and charts
 */

import { getStats, getSpecs } from '@/lib/db/service-queries';
import { StatsClient } from '@/components/stats-client';
import { isDefaultProject } from '@/lib/projects/constants';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function ProjectStatsPage({
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

  return <StatsClient stats={stats} specs={specs} />;
}
