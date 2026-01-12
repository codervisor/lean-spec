import { getSpecsWithMetadata, getStats } from '@/lib/db/service-queries';
import { SpecsClient } from '@/components/specs-client';
import { isDefaultProject } from '@/lib/projects/constants';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function ProjectSpecsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  
  // Convert 'default' project to undefined for filesystem mode (which loads sub-specs)
  const actualProjectId = isDefaultProject(projectId) ? undefined : projectId;
  
  const [specs, stats] = await Promise.all([
    getSpecsWithMetadata(actualProjectId),
    getStats(actualProjectId),
  ]);

  return <SpecsClient initialSpecs={specs} initialStats={stats} projectId={projectId} />;
}
