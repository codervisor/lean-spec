/**
 * Spec detail page with markdown rendering and enhanced UI
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSpecById, getSpecs } from '@/lib/db/service-queries';
import { Badge } from '@/components/ui/badge';
import { SpecTimeline } from '@/components/spec-timeline';
import { StatusBadge } from '@/components/status-badge';
import { PriorityBadge } from '@/components/priority-badge';
import { SpecsNavSidebar } from '@/components/specs-nav-sidebar';
import { extractH1Title } from '@/lib/utils';
import { MarkdownLink } from '@/components/markdown-link';
import { TableOfContents } from '@/components/table-of-contents';
import { BackToTop } from '@/components/back-to-top';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { 
  FileText, 
  Palette, 
  Code, 
  TestTube, 
  CheckSquare, 
  Wrench, 
  Map, 
  GitBranch, 
  Home,
  TrendingUp
} from 'lucide-react';

// Force dynamic rendering - this page needs runtime data
export const dynamic = 'force-dynamic';

// Tier 1: Route segment caching for performance
export const revalidate = 60; // Cache rendered pages for 60s
export const dynamicParams = true; // Generate new pages on demand

// Icon mapping for sub-specs
const SUB_SPEC_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'FileText': FileText,
  'Palette': Palette,
  'Code': Code,
  'TestTube': TestTube,
  'CheckSquare': CheckSquare,
  'Wrench': Wrench,
  'Map': Map,
  'GitBranch': GitBranch,
  'Home': Home,
  'TrendingUp': TrendingUp,
};

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
    getSpecs()
  ]);

  if (!spec) {
    notFound();
  }

  // Parse tags if stored as JSON string
  const tags = spec.tags ? (typeof spec.tags === 'string' ? JSON.parse(spec.tags) : spec.tags) : [];

  // Extract H1 title from markdown content
  const h1Title = extractH1Title(spec.contentMd);
  const displayTitle = h1Title || spec.title || spec.specName;
  
  // Get content to display (main or sub-spec)
  let displayContent = spec.contentMd;
  
  if (currentSubSpec && spec.subSpecs) {
    const subSpecData = spec.subSpecs.find(s => s.file === currentSubSpec);
    if (subSpecData) {
      displayContent = subSpecData.content;
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
    <div className="flex min-h-[calc(100vh-3.5rem)] w-[calc(100vw-var(--main-sidebar-width,240px))]">
      {/* Specs Navigation Sidebar */}
      <SpecsNavSidebar 
        specs={allSpecs} 
        currentSpecId={spec.id}
        currentSubSpec={currentSubSpec}
      />

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Compact Sticky Header */}
        <header className="sticky top-14 z-20 border-b bg-card">
          <div className="px-6 py-4">
            {/* Line 1: Spec number + H1 Title */}
            <h1 className="text-2xl font-bold tracking-tight mb-3">
              {spec.specNumber && (
                <span className="text-muted-foreground">#{spec.specNumber.toString().padStart(3, '0')} </span>
              )}
              {displayTitle}
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

          {/* Horizontal Tabs for Sub-specs (only if sub-specs exist) */}
          {spec.subSpecs && spec.subSpecs.length > 0 && (
            <div className="border-t bg-muted/30">
              <div className="px-6 overflow-x-auto">
                <div className="flex gap-1 py-2 min-w-max">
                  {/* Overview tab (README.md) */}
                  <Link
                    href={`/specs/${spec.specNumber || spec.id}`}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                      !currentSubSpec
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <Home className="h-4 w-4" />
                    Overview
                  </Link>

                  
                  {/* Sub-spec tabs */}
                  {spec.subSpecs.map((subSpec) => {
                    const Icon = SUB_SPEC_ICONS[subSpec.iconName] || FileText;
                    return (
                      <Link
                        key={subSpec.file}
                        href={`/specs/${spec.specNumber || spec.id}?subspec=${subSpec.file}`}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                          currentSubSpec === subSpec.file
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${subSpec.color}`} />
                        {subSpec.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Main content (full width) */}
        <main className="px-6 py-8">
          <div className="space-y-6">
            {/* Markdown content with embedded timeline */}
            {/* Compact inline timeline at the top */}
            <div className="mb-6 pb-6 border-b">
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">Status Timeline</h2>
              <SpecTimeline
                createdAt={spec.createdAt}
                updatedAt={spec.updatedAt}
                completedAt={spec.completedAt}
                status={spec.status || 'planned'}
              />
            </div>

            <article className="prose prose-slate dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  a: (props) => <MarkdownLink {...props} currentSpecNumber={spec.specNumber || undefined} />,
                }}
              >
                {displayContent}
              </ReactMarkdown>
            </article>
          </div>
        </main>

        {/* Floating action buttons */}
        <TableOfContents content={displayContent} />
        <BackToTop />
      </div>
    </div>
  );
}
