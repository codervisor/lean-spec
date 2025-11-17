/**
 * Client component for spec detail page with SWR caching and instant sub-spec navigation
 * Phase 2: Tier 2 - Hybrid Rendering
 */

'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SpecTimeline } from '@/components/spec-timeline';
import { StatusBadge } from '@/components/status-badge';
import { PriorityBadge } from '@/components/priority-badge';
import { MarkdownLink } from '@/components/markdown-link';
import { TableOfContents } from '@/components/table-of-contents';
import { BackToTop } from '@/components/back-to-top';
import { SpecRelationships } from '@/components/spec-relationships';
import { extractH1Title, cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/date-utils';
import type { SpecWithMetadata } from '@/types/specs';
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
  TrendingUp,
  Clock,
  ChevronDown
} from 'lucide-react';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import type { Html, Root } from 'mdast';

const remarkStripHtmlComments: Plugin<[], Root> = () => (tree: Root) => {
  visit(tree, 'html', (node: Html) => {
    if (typeof node.value === 'string' && node.value.trim().startsWith('<!--')) {
      node.value = '';
    }
  });
};

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

interface SpecDetailClientProps {
  initialSpec: SpecWithMetadata;
  initialSubSpec?: string;
}

// SWR fetcher with error handling
const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
});

export function SpecDetailClient({ initialSpec, initialSubSpec }: SpecDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSubSpec = searchParams.get('subspec') || initialSubSpec;
  const [timelineOpen, setTimelineOpen] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('spec-timeline-open');
    if (saved !== null) {
      setTimelineOpen(saved === 'true');
    }
  }, []);

  const handleToggleTimeline = React.useCallback(() => {
    setTimelineOpen((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('spec-timeline-open', String(next));
      }
      return next;
    });
  }, []);
  
  // Use SWR for client-side caching with the initial spec as fallback
  const { data: specData, error, isLoading } = useSWR<{ spec: SpecWithMetadata }>(
    `/api/specs/${initialSpec.specNumber || initialSpec.id}`,
    fetcher,
    {
      fallbackData: { spec: initialSpec },
      revalidateOnFocus: false,
      dedupingInterval: 5000, // Don't refetch within 5 seconds
    }
  );

  const spec = specData?.spec || initialSpec;
  const tags = spec.tags || [];
  const updatedRelative = spec.updatedAt ? formatRelativeTime(spec.updatedAt) : 'N/A';

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
  const formatDate = (date: Date | string | number | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Handle sub-spec switching with optimistic UI (instant, no network)
  const handleSubSpecSwitch = (file: string | null) => {
    const newUrl = file 
      ? `/specs/${spec.specNumber || spec.id}?subspec=${file}`
      : `/specs/${spec.specNumber || spec.id}`;
    
    // Use shallow routing to avoid full page reload
    router.push(newUrl, { scroll: false });
  };

  return (
    <>
      {/* Compact Header - sticky on desktop, static on mobile */}
      <header className="lg:sticky lg:top-14 lg:z-20 border-b bg-card">
        <div className="px-3 sm:px-6 py-3 sm:py-4">
          {/* Line 1: Spec number + H1 Title */}
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-2 sm:mb-3">
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
                <div className="h-4 w-px bg-border mx-1 hidden sm:block" />
                <div className="flex flex-wrap gap-1">
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
                </div>
              </>
            )}
          </div>

          {/* Line 3: Small metadata row */}
          <div className="flex flex-wrap gap-2 sm:gap-4 text-xs text-muted-foreground mt-2 sm:mt-3">
            <span className="hidden sm:inline">Created: {formatDate(spec.createdAt)}</span>
            <span className="hidden sm:inline">•</span>
            <span>Updated: {formatDate(spec.updatedAt)}</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden md:inline">Name: {spec.specName}</span>
            {spec.assignee && (
              <>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">Assignee: {spec.assignee}</span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>
                Created {formatDate(spec.createdAt)} · Updated {updatedRelative}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleTimeline}
              className="h-8 px-3 text-xs font-medium"
            >
              {timelineOpen ? 'Hide Timeline' : 'Show Timeline'}
              <ChevronDown
                className={cn(
                  'ml-1.5 h-3.5 w-3.5 transition-transform',
                  timelineOpen && 'rotate-180'
                )}
              />
            </Button>
          </div>

          {timelineOpen && (
            <div className="mt-3 mb-1 rounded-lg border border-border bg-muted/30 p-3">
              <SpecTimeline
                createdAt={spec.createdAt}
                updatedAt={spec.updatedAt}
                completedAt={spec.completedAt}
                status={spec.status || 'planned'}
              />
            </div>
          )}
        </div>

        {/* Horizontal Tabs for Sub-specs (only if sub-specs exist) */}
        {spec.subSpecs && spec.subSpecs.length > 0 && (
          <div className="border-t bg-muted/30">
            <div className="px-3 sm:px-6 overflow-x-auto">
              <div className="flex gap-1 py-2 min-w-max">
                {/* Overview tab (README.md) */}
                <button
                  onClick={() => handleSubSpecSwitch(null)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                    !currentSubSpec
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline">Overview</span>
                </button>

                
                {/* Sub-spec tabs */}
                {spec.subSpecs.map((subSpec) => {
                  const Icon = SUB_SPEC_ICONS[subSpec.iconName] || FileText;
                  return (
                    <button
                      key={subSpec.file}
                      onClick={() => handleSubSpecSwitch(subSpec.file)}
                      className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                        currentSubSpec === subSpec.file
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${subSpec.color}`} />
                      <span className="hidden sm:inline">{subSpec.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main content (full width) */}
      <main className="px-3 sm:px-6 py-4 sm:py-8">
        <div className="space-y-6">
          {isLoading && <div className="text-sm text-muted-foreground">Loading...</div>}
          {error && <div className="text-sm text-destructive">Error loading spec</div>}

          <SpecRelationships relationships={spec.relationships} />

          <article className="prose prose-slate dark:prose-invert max-w-none prose-sm sm:prose-base">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkStripHtmlComments]}
              rehypePlugins={[rehypeHighlight, rehypeSlug]}
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
    </>
  );
}
