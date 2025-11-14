/**
 * Spec detail page with markdown rendering and enhanced UI
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSpecById, getSpecs } from '@/lib/db/queries';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SpecTimeline } from '@/components/spec-timeline';
import { StatusBadge } from '@/components/status-badge';
import { PriorityBadge } from '@/components/priority-badge';
import { SpecsNavSidebar } from '@/components/specs-nav-sidebar';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

// Force dynamic rendering - this page needs runtime data
export const dynamic = 'force-dynamic';

export default async function SpecDetailPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ id: string }>;
  searchParams: Promise<{ subspec?: string }>;
}) {
  const { id } = await params;
  const { subspec } = await searchParams;
  
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

  // Get content to display (main or sub-spec)
  let displayContent = spec.contentMd;
  let displayTitle = spec.title || spec.specName;
  
  if (subspec && spec.subSpecs) {
    const subSpecData = spec.subSpecs.find(s => s.file === subspec);
    if (subSpecData) {
      displayContent = subSpecData.content;
      displayTitle = `${spec.title || spec.specName} - ${subSpecData.name}`;
    }
  }

  // Format dates
  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      {/* Specs Navigation Sidebar */}
      <SpecsNavSidebar 
        specs={allSpecs} 
        currentSpecId={spec.id}
        currentSubSpec={subspec}
      />

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Compact Sticky Header */}
        <header className="sticky top-14 z-20 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/95">
          <div className="px-6 py-4">
            {/* Line 1: Spec number + Title */}
            <h1 className="text-2xl font-bold tracking-tight mb-3">
              {spec.specNumber && (
                <span className="text-muted-foreground">#{spec.specNumber.toString().padStart(3, '0')} </span>
              )}
              {spec.title || spec.specName}
            </h1>
            
            {/* Line 2: Status, Priority, Tags, Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={spec.status || 'planned'} />
              <PriorityBadge priority={spec.priority || 'medium'} />
              
              {tags.length > 0 && (
                <>
                  <div className="h-4 w-px bg-border mx-1" />
                  {tags.slice(0, 5).map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {tags.length > 5 && (
                    <Badge variant="secondary" className="text-xs">
                      +{tags.length - 5} more
                    </Badge>
                  )}
                </>
              )}
            </div>

            {/* Line 3: Small metadata row */}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-3">
              <span>Created: {formatDate(spec.createdAt)}</span>
              <span>•</span>
              <span>Updated: {formatDate(spec.updatedAt)}</span>
              <span>•</span>
              <span>Name: {spec.specName}</span>
              {spec.assignee && (
                <>
                  <span>•</span>
                  <span>Assignee: {spec.assignee}</span>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main content (full width) */}
        <main className="px-6 py-8">
          <div className="space-y-8">
            {/* Timeline embedded in content */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Timeline</h2>
              <SpecTimeline
                createdAt={spec.createdAt}
                updatedAt={spec.updatedAt}
                completedAt={spec.completedAt}
                status={spec.status || 'planned'}
              />
            </Card>

            {/* Markdown content */}
            <Card className="p-8">
              <article className="prose prose-slate dark:prose-invert max-w-none">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                >
                  {displayContent}
                </ReactMarkdown>
              </article>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
