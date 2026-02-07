/**
 * Loading skeleton components for various UI states
 *
 * These components provide consistent loading states across the application.
 * All skeletons follow a unified pattern with consistent spacing and structure.
 */

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// Pre-computed widths for content lines to avoid Math.random() hydration issues
const CONTENT_LINE_WIDTHS = ['92%', '88%', '95%', '85%', '90%', '87%', '93%', '89%'];

// ============================================================================
// Page-Level Skeletons
// ============================================================================

/**
 * Skeleton for projects page loading state
 */
export function ProjectsSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto py-6 space-y-6 px-4 max-w-7xl">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-full max-w-md" />
        </div>
      </div>

      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, idx) => (
            <Card key={idx} className="flex flex-col overflow-hidden">
              <CardHeader className="px-4 pt-4 pb-2 space-y-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </CardHeader>
              <CardContent className="p-2 px-4 pb-4 flex-1">
                <div className="flex items-center gap-4 py-1">
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-3 w-14" />
                    <Skeleton className="h-6 w-10" />
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-6 w-14" />
                  </div>
                </div>
              </CardContent>
              <div className="px-4 py-3 bg-muted/20 border-t mt-auto flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="w-1.5 h-1.5 rounded-full" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-3 w-20" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for machines page loading state
 */
export function MachinesSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto py-6 space-y-6 px-4 max-w-7xl">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
      </div>

      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, idx) => (
            <Card key={idx}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3.5 w-3.5 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for chat page loading state
 */
export function ChatSkeleton() {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <div className="w-64 border-r bg-muted/10 flex-shrink-0 flex flex-col">
        <div className="p-3 border-b">
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex-1 p-2 space-y-1">
          {[...Array(8)].map((_, idx) => (
            <Skeleton key={idx} className="h-9 w-full" />
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 p-4 space-y-4">
          {[...Array(4)].map((_, idx) => (
            <div
              key={idx}
              className={`flex ${idx % 2 === 0 ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`space-y-2 max-w-[70%] ${idx % 2 === 0 ? '' : 'items-end'}`}
              >
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-16 w-96" />
              </div>
            </div>
          ))}
        </div>

        {/* Input area */}
        <div className="p-4 border-t">
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for dependencies page loading state
 */
export function DependenciesSkeleton() {
  return (
    <div className="mx-auto w-full p-6 h-[calc(100vh-7rem)] max-w-7xl">
      <div className="flex h-full flex-col gap-4">
        {/* Header */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="flex justify-end">
          <Skeleton className="h-9 w-[240px]" />
        </div>

        {/* Summary text */}
        <Skeleton className="h-5 w-64" />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[...Array(5)].map((_, idx) => (
            <Skeleton key={idx} className="h-7 w-24" />
          ))}
        </div>

        {/* Main content - Graph area */}
        <div className="flex flex-1 gap-3 min-h-0">
          <Card className="flex-1 overflow-hidden">
            <CardContent className="p-0 h-full">
              <div className="h-full w-full bg-muted/10 flex items-center justify-center">
                <div className="grid grid-cols-4 gap-8">
                  {[...Array(12)].map((_, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2">
                      <Skeleton className="h-16 w-24 rounded-lg" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sidebar */}
          <Card className="w-80 flex-shrink-0">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(4)].map((_, idx) => (
                <div key={idx} className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-48 ml-auto" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for dashboard page loading state
 */
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto space-y-6 sm:space-y-8 max-w-7xl">
        <div className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-8 w-64" />
        </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, idx) => (
          <Card key={idx} className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(5)].map((_, idx) => (
              <div key={idx} className="space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(4)].map((_, idx) => (
              <div key={idx} className="space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for stats page loading state
 */
export function StatsSkeleton() {
  return (
    <div className="space-y-6 p-6 mx-auto w-full max-w-7xl">
      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-7 w-48" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, idx) => (
          <Card key={idx}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(2)].map((_, idx) => (
          <Card key={idx}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[220px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for context page loading state
 */
export function ContextPageSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="h-full">
        <CardHeader className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-9 w-full" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(6)].map((_, idx) => (
            <div key={idx} className="space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Skeleton for settings page loading state
 */
export function SettingsSkeleton() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-background">
      {/* Header */}
      <div className="border-b p-6 flex-none">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-muted/10 p-4 overflow-y-auto hidden md:block">
          <nav className="space-y-1">
            {[...Array(3)].map((_, idx) => (
              <Skeleton key={idx} className="h-10 w-full" />
            ))}
          </nav>
        </aside>

        {/* Mobile Tab Selector */}
        <div className="md:hidden p-4 border-b">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[...Array(2)].map((_, idx) => (
              <Skeleton key={idx} className="h-9 w-32 shrink-0" />
            ))}
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Section header */}
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full max-w-md" />
            </div>

            {/* Cards */}
            {[...Array(3)].map((_, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <Skeleton className="h-5 w-40" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

// ============================================================================
// Component-Level Skeletons
// ============================================================================

/**
 * Skeleton for spec list loading state
 */
export function SpecListSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Skeleton for spec detail loading state
 */
export function SpecDetailSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Skeleton className="h-5 w-48" />

        {/* Header */}
        <div className="space-y-3">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-5 w-1/3" />
        </div>

        {/* Metadata section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="py-2" />
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Skeleton for stats card loading state
 */
export function StatsCardSkeleton() {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for kanban board loading state
 */
export function KanbanBoardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-8" />
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, j) => (
              <Card key={j}>
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for project card loading state
 */
export function ProjectCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for sidebar loading state
 */
export function SidebarSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-full" />
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for specs navigation sidebar loading state
 */
export function SpecsNavSidebarSkeleton() {
  // Matches the list items in SpecsNavSidebar (rowHeight=60)
  return (
    <div className="h-full px-2 py-0.5 space-y-0.5 overflow-hidden">
      {[...Array(12)].map((_, idx) => (
        <div key={idx} className="flex flex-col gap-1 p-1.5 rounded-md h-[60px] justify-center">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-8" /> {/* Number */}
            <Skeleton className="h-3 flex-1" /> {/* Title */}
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-3 rounded-full" /> {/* Status */}
            <Skeleton className="h-3 w-3 rounded-full" /> {/* Priority */}
            <Skeleton className="h-2 w-12 ml-auto" /> {/* Time */}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Generic/Utility Skeletons
// ============================================================================

/**
 * Generic content skeleton with configurable lines
 */
export interface ContentSkeletonProps {
  /** Number of lines to display */
  lines?: number;
  /** Additional CSS classes */
  className?: string;
}

export function ContentSkeleton({ lines = 4, className }: ContentSkeletonProps) {
  return (
    <div className={className}>
      <div className="space-y-3">
        {[...Array(lines)].map((_, i) => (
          <Skeleton
            key={i}
            className="h-4"
            style={{ width: CONTENT_LINE_WIDTHS[i % CONTENT_LINE_WIDTHS.length] }}
          />
        ))}
      </div>
    </div>
  );
}
