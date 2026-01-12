"use client";

import { SpecsNavSidebar } from '@/components/specs-nav-sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { useSpecsSidebarState } from '@/lib/stores/specs-sidebar-store';

export function SpecDetailLoadingShell() {
  const sidebarState = useSpecsSidebarState();
  const cachedSpecs = sidebarState.specs;
  const activeSpecId = sidebarState.activeSpecId || '';

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] w-full min-w-0">
      <SpecsNavSidebar initialSpecs={cachedSpecs} currentSpecId={activeSpecId} />

      <div className="flex-1 min-w-0 px-4 py-6 sm:px-8 sm:py-10">
        <div className="space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-7 w-56" />
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-4 w-64" />
          </div>

          <div className="space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-32 w-full" />
          </div>

          <div className="space-y-4">
            {[...Array(6)].map((_, idx) => (
              <Skeleton key={idx} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
