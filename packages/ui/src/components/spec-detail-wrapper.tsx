/**
 * Client wrapper for spec detail page with prefetching support
 * Phase 2: Tier 2 - Hybrid Rendering
 */

'use client';

import * as React from 'react';
import { SpecsNavSidebar } from '@/components/specs-nav-sidebar';
import { SpecDetailClient } from '@/components/spec-detail-client';
import { primeSpecsSidebar, setActiveSidebarSpec } from '@/lib/stores/specs-sidebar-store';
import { useProjectUrl } from '@/contexts/project-context';
import { cn } from '@/lib/utils';
import type { SpecWithMetadata, SidebarSpec } from '@/types/specs';
import type { LightweightSpec } from '@/lib/db/service-queries';

interface SpecDetailWrapperProps {
  spec: SpecWithMetadata;
  allSpecs: LightweightSpec[];
  currentSubSpec?: string;
}

export function SpecDetailWrapper({ spec, allSpecs, currentSubSpec }: SpecDetailWrapperProps) {
  const { projectId } = useProjectUrl();
  
  const [isFocusMode, setIsFocusMode] = React.useState(false);

  // Initialize focus mode from localStorage after mount to avoid hydration mismatch
  React.useEffect(() => {
    const saved = localStorage.getItem('spec-detail-focus-mode');
    if (saved === 'true') {
      setIsFocusMode(true);
    }
  }, []);

  // Persist focus mode preference
  const handleToggleFocusMode = React.useCallback(() => {
    setIsFocusMode(prev => {
      const next = !prev;
      localStorage.setItem('spec-detail-focus-mode', String(next));
      return next;
    });
  }, []);

  const sidebarSpecs = React.useMemo<SidebarSpec[]>(() => (
    allSpecs.map((item) => ({
      id: item.id,
      specNumber: item.specNumber,
      title: item.title,
      specName: item.specName,
      status: item.status,
      priority: item.priority,
      tags: item.tags,
      updatedAt: item.updatedAt,
      subSpecsCount: ('subSpecsCount' in item) ? (item as unknown as { subSpecsCount: number }).subSpecsCount : undefined,
    }))
  ), [allSpecs]);

  // Prime sidebar store with latest metadata (only publishes when signature changes)
  React.useEffect(() => {
    primeSpecsSidebar(sidebarSpecs);
  }, [sidebarSpecs]);

  React.useEffect(() => {
    setActiveSidebarSpec(spec.id);
  }, [spec.id]);

  // Prefetch spec data on hover using project-scoped API
  const handleSpecPrefetch = React.useCallback((specId: string) => {
    const apiUrl = `/api/projects/${projectId}/specs/${specId}`;
    fetch(apiUrl).catch(() => {
      // Prefetch is opportunistic, ignore failures
    });
  }, [projectId]);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] w-full min-w-0">
      <SpecsNavSidebar 
        initialSpecs={sidebarSpecs}
        currentSpecId={spec.id}
        currentSubSpec={currentSubSpec}
        onSpecHover={handleSpecPrefetch}
        className={cn(isFocusMode && 'hidden')}
      />

      <div className="flex-1 min-w-0">
        <SpecDetailClient 
          initialSpec={spec}
          initialSubSpec={currentSubSpec}
          isFocusMode={isFocusMode}
          onToggleFocusMode={handleToggleFocusMode}
        />
      </div>
    </div>
  );
}
