/**
 * Client wrapper for spec detail page with prefetching support
 * Phase 2: Tier 2 - Hybrid Rendering
 */

'use client';

import * as React from 'react';
import { SpecsNavSidebar } from '@/components/specs-nav-sidebar';
import { SpecDetailClient } from '@/components/spec-detail-client';
import { primeSpecsSidebar, setActiveSidebarSpec } from '@/lib/stores/specs-sidebar-store';
import { cn } from '@/lib/utils';
import type { SpecWithMetadata, SidebarSpec } from '@/types/specs';
import type { ParsedSpec } from '@/lib/db/service-queries';

interface SpecDetailWrapperProps {
  spec: SpecWithMetadata;
  allSpecs: ParsedSpec[];
  currentSubSpec?: string;
}

export function SpecDetailWrapper({ spec, allSpecs, currentSubSpec }: SpecDetailWrapperProps) {
  const [isFocusMode, setIsFocusMode] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('spec-detail-focus-mode') === 'true';
    }
    return false;
  });

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
      contentMd: item.contentMd,
      updatedAt: item.updatedAt,
      subSpecsCount: ('subSpecsCount' in item) ? (item as any).subSpecsCount : undefined,
    }))
  ), [allSpecs]);

  // Prime sidebar store with latest metadata (only publishes when signature changes)
  React.useEffect(() => {
    primeSpecsSidebar(sidebarSpecs);
  }, [sidebarSpecs]);

  React.useEffect(() => {
    setActiveSidebarSpec(spec.id);
  }, [spec.id]);

  // Prefetch spec data on hover
  const handleSpecPrefetch = React.useCallback((specId: string) => {
    fetch(`/api/specs/${specId}`).catch(() => {
      // Prefetch is opportunistic, ignore failures
    });
  }, []);

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
