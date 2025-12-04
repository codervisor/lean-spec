/**
 * Project Stats page with detailed metrics and charts
 */

import { getStats, getSpecs } from '@/lib/db/service-queries';
import { StatsClient } from '@/app/stats/stats-client';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function ProjectStatsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  
  const [stats, specs] = await Promise.all([
    getStats(projectId),
    getSpecs(projectId),
  ]);

  return <StatsClient stats={stats} specs={specs} />;
}
