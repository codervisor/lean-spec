import { getSpecsWithMetadata, getStats } from '@/lib/db/service-queries';
import { SpecsClient } from '@/app/specs/specs-client';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function ProjectSpecsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  
  const [specs, stats] = await Promise.all([
    getSpecsWithMetadata(projectId),
    getStats(projectId),
  ]);

  return <SpecsClient initialSpecs={specs} initialStats={stats} projectId={projectId} />;
}
