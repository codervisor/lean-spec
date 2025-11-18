/**
 * Spec detail page with markdown rendering and enhanced UI
 * Phase 2: Tier 2 - Hybrid Rendering with client-side caching
 */

import { notFound } from 'next/navigation';
import { getSpecById, getSpecsWithSubSpecCount } from '@/lib/db/service-queries';
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



