import { notFound } from 'next/navigation';
import { getSpecById, getSpecsWithSubSpecCount } from '@/lib/db/service-queries';
import { SpecDetailWrapper } from '@/components/spec-detail-wrapper';

export const revalidate = 0; // No caching for local dev
export const dynamic = 'force-dynamic';

export default async function ProjectSpecDetailPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ projectId: string; specId: string }>;
  searchParams: Promise<{ subspec?: string }>;
}) {
  const { projectId, specId } = await params;
  const { subspec: currentSubSpec } = await searchParams;
  
  const [spec, allSpecs] = await Promise.all([
    getSpecById(specId, projectId),
    getSpecsWithSubSpecCount(projectId)
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
