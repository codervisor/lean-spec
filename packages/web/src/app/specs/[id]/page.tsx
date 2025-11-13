/**
 * Spec detail page with markdown rendering and enhanced UI
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getSpecById, getSpecs } from '@/lib/db/queries';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { SpecTimeline } from '@/components/spec-timeline';
import { SpecMetadata } from '@/components/spec-metadata';
import { StatusBadge } from '@/components/status-badge';
import { PriorityBadge } from '@/components/priority-badge';
import { SubSpecTabs } from '@/components/sub-spec-tabs';
import { SpecSidebar } from '@/components/spec-sidebar';

// Force dynamic rendering - this page needs runtime data
export const dynamic = 'force-dynamic';

export default async function SpecDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const [spec, allSpecs] = await Promise.all([
    getSpecById(id),
    getSpecs()
  ]);

  if (!spec) {
    notFound();
  }

  // Parse tags if stored as JSON string
  const tags = spec.tags ? (typeof spec.tags === 'string' ? JSON.parse(spec.tags) : spec.tags) : [];
  const specWithTags = { ...spec, tags };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Sidebar - Spec List */}
      <SpecSidebar specs={allSpecs} currentSpecId={spec.id} />

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Sticky Breadcrumb Navigation */}
        <div className="sticky top-14 z-30 border-b border-gray-200 dark:border-gray-800 bg-muted/50 backdrop-blur supports-[backdrop-filter]:bg-muted/95">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Specs</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {spec.specNumber ? `#${spec.specNumber}` : spec.specName}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>

        {/* Sticky Header */}
        <header className="sticky top-[calc(3.5rem+3.25rem)] z-20 border-b border-gray-200 dark:border-gray-800 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/95">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
            {/* Back button */}
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Specs
              </Button>
            </Link>

            {/* Title and badges */}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {spec.specNumber && (
                  <span className="text-muted-foreground">#{spec.specNumber} </span>
                )}
                {spec.title || spec.specName}
              </h1>
              
              <div className="flex flex-wrap gap-2 mt-3">
                <StatusBadge status={spec.status || 'planned'} />
                <PriorityBadge priority={spec.priority || 'medium'} />
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left sidebar - Metadata (Sticky) */}
            <div className="lg:col-span-1">
              <div className="sticky top-[calc(3.5rem+3.25rem+12rem)] space-y-6">
                {/* Timeline */}
                <Card className="p-4">
                  <h3 className="text-sm font-semibold mb-2">Timeline</h3>
                  <SpecTimeline
                    createdAt={spec.createdAt}
                    updatedAt={spec.updatedAt}
                    completedAt={spec.completedAt}
                    status={spec.status || 'planned'}
                  />
                </Card>

                {/* Metadata */}
                <SpecMetadata spec={specWithTags} />
              </div>
            </div>

            {/* Main content - Markdown */}
            <div className="lg:col-span-2">
              <Card className="p-8">
                <SubSpecTabs 
                  mainContent={spec.contentMd} 
                  subSpecs={spec.subSpecs || []} 
                />
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
