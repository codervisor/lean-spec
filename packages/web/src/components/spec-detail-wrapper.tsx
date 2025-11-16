/**
 * Client wrapper for spec detail page with prefetching support
 * Phase 2: Tier 2 - Hybrid Rendering
 */

'use client';

import * as React from 'react';
import { SpecsNavSidebar } from '@/components/specs-nav-sidebar';
import { SpecDetailClient } from '@/components/spec-detail-client';

interface SubSpec {
  name: string;
  file: string;
  iconName: string;
  color: string;
  content: string;
}

interface Spec {
  id: string;
  specNumber: number | null;
  title: string | null;
  specName: string;
  status: string | null;
  priority: string | null;
  tags: string | string[] | null;
  assignee: string | null;
  createdAt: Date | null;
  updatedAt: Date | string | number | null;
  completedAt: Date | null;
  contentMd: string;
  subSpecs?: SubSpec[];
}

interface SpecDetailWrapperProps {
  spec: Spec;
  allSpecs: Spec[];
  currentSubSpec?: string;
}

export function SpecDetailWrapper({ spec, allSpecs, currentSubSpec }: SpecDetailWrapperProps) {
  // Prefetch spec data on hover
  const handleSpecPrefetch = React.useCallback((specId: string) => {
    // Warm the cache by fetching the spec
    fetch(`/api/specs/${specId}`).catch(() => {
      // Silently fail - prefetching is optional
    });
  }, []);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] w-full min-w-0">
      {/* Specs Navigation Sidebar with prefetching */}
      <SpecsNavSidebar 
        specs={allSpecs} 
        currentSpecId={spec.id}
        currentSubSpec={currentSubSpec}
        onSpecHover={handleSpecPrefetch}
      />

      {/* Main Content - Client Component */}
      <div className="flex-1 min-w-0">
        <SpecDetailClient 
          initialSpec={spec}
          initialSubSpec={currentSubSpec}
        />
      </div>
    </div>
  );
}
