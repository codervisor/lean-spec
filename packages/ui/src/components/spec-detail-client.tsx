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
import { TableOfContents, TableOfContentsSidebar } from '@/components/table-of-contents';
import { BackToTop } from '@/components/back-to-top';
import { SpecDependencyGraph } from '@/components/spec-dependency-graph';
import { MermaidDiagram } from '@/components/mermaid-diagram';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Maximize2,
  Minimize2,
  List as ListIcon
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
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
}

// SWR fetcher with error handling
const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
});

export function SpecDetailClient({ initialSpec, initialSubSpec, isFocusMode = false, onToggleFocusMode }: SpecDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSubSpec = searchParams.get('subspec') || initialSubSpec;
  const [timelineDialogOpen, setTimelineDialogOpen] = React.useState(false);
  const [dependenciesDialogOpen, setDependenciesDialogOpen] = React.useState(false);
  
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

  // Fetch complete dependency graph when dialog opens
  const { data: dependencyGraphData } = useSWR<{
    current: { specName: string; specNumber?: number };
    dependsOn: { specName: string; specNumber?: number }[];
    requiredBy: { specName: string; specNumber?: number }[];
    related: { specName: string; specNumber?: number }[];
  }>(
    dependenciesDialogOpen ? `/api/specs/${initialSpec.specNumber || initialSpec.id}/dependency-graph` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  );

  const spec = specData?.spec || initialSpec;
  const tags = React.useMemo(() => spec.tags || [], [spec.tags]);
  const updatedRelative = spec.updatedAt ? formatRelativeTime(spec.updatedAt) : 'N/A';
  const relationships = spec.relationships;
  
  // Use complete graph if available, otherwise fall back to basic relationships
  const completeRelationships = dependencyGraphData
    ? {
        dependsOn: dependencyGraphData.dependsOn.map(s => s.specName),
        requiredBy: dependencyGraphData.requiredBy.map(s => s.specName),
        related: dependencyGraphData.related.map(s => s.specName),
      }
    : relationships;
  
  const hasRelationships = Boolean(
    relationships && ((relationships.dependsOn?.length ?? 0) > 0 || (relationships.related?.length ?? 0) > 0)
  );

  React.useEffect(() => {
    if (!hasRelationships) {
      setDependenciesDialogOpen(false);
    }
  }, [hasRelationships]);

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

  const headerRef = React.useRef<HTMLElement>(null);

  // Handle scroll padding for sticky header
  React.useEffect(() => {
    const updateScrollPadding = () => {
      const navbarHeight = 56; // 3.5rem / top-14
      let offset = navbarHeight;

      // On large screens, the spec header is also sticky
      if (window.innerWidth >= 1024 && headerRef.current) {
        offset += headerRef.current.offsetHeight - navbarHeight;
      }

      document.documentElement.style.scrollPaddingTop = `${offset}px`;
    };

    // Initial update
    updateScrollPadding();

    // Update on resize
    window.addEventListener('resize', updateScrollPadding);
    
    // Update when content changes (might affect header height if tags wrap)
    const observer = new ResizeObserver(updateScrollPadding);
    if (headerRef.current) {
      observer.observe(headerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateScrollPadding);
      observer.disconnect();
      document.documentElement.style.scrollPaddingTop = '';
    };
  }, [spec, tags]); // Re-run if spec metadata changes

  return (
    <>
      {/* Compact Header - sticky on desktop, static on mobile */}
      <header ref={headerRef} className="lg:sticky lg:top-14 lg:z-20 border-b bg-card">
        <div className={cn("px-3 sm:px-6", isFocusMode ? "py-1.5" : "py-2 sm:py-3")}>
          {/* Focus mode: Single compact row */}
          {isFocusMode ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <h1 className="text-base font-semibold tracking-tight truncate">
                  {spec.specNumber && (
                    <span className="text-muted-foreground">#{spec.specNumber.toString().padStart(3, '0')} </span>
                  )}
                  {displayTitle}
                </h1>
                <StatusBadge status={spec.status || 'planned'} />
                <PriorityBadge priority={spec.priority || 'medium'} />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onToggleFocusMode}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
                title="Exit focus mode"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            /* Normal mode: Full multi-line header */
            <>
              {/* Line 1: Spec number + H1 Title */}
              <div className="flex items-start justify-between gap-2 mb-1.5 sm:mb-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                  {spec.specNumber && (
                    <span className="text-muted-foreground">#{spec.specNumber.toString().padStart(3, '0')} </span>
                  )}
                  {displayTitle}
                </h1>
                
                {/* Mobile Specs List Toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden h-8 w-8 -mr-2 shrink-0 text-muted-foreground"
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.toggleSpecsSidebar) {
                      window.toggleSpecsSidebar();
                    }
                  }}
                >
                  <ListIcon className="h-5 w-5" />
                  <span className="sr-only">Toggle specs list</span>
                </Button>
              </div>
              
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
              <div className="flex flex-wrap gap-2 sm:gap-4 text-xs text-muted-foreground mt-1.5 sm:mt-2">
                <span className="hidden sm:inline">Created: {formatDate(spec.createdAt)}</span>
                <span className="hidden sm:inline">•</span>
                <span>
                  Updated: {formatDate(spec.updatedAt)}
                  {spec.updatedAt && (
                    <span className="ml-1 text-[11px] text-muted-foreground/80">({updatedRelative})</span>
                  )}
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden md:inline">Name: {spec.specName}</span>
                {spec.assignee && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline">Assignee: {spec.assignee}</span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Dialog open={timelineDialogOpen} onOpenChange={setTimelineDialogOpen}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-haspopup="dialog"
                    aria-expanded={timelineDialogOpen}
                    onClick={() => setTimelineDialogOpen(true)}
                    className="h-8 rounded-full border px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Clock className="mr-1.5 h-3.5 w-3.5" />
                    View Timeline
                    <Maximize2 className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                  <DialogContent className="w-[min(900px,90vw)] max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Spec Timeline</DialogTitle>
                      <DialogDescription>Created, updated, and completion milestones.</DialogDescription>
                    </DialogHeader>
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                      <SpecTimeline
                        createdAt={spec.createdAt}
                        updatedAt={spec.updatedAt}
                        completedAt={spec.completedAt}
                        status={spec.status || 'planned'}
                      />
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={dependenciesDialogOpen} onOpenChange={setDependenciesDialogOpen}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-haspopup="dialog"
                    aria-expanded={dependenciesDialogOpen}
                    onClick={() => setDependenciesDialogOpen(true)}
                    disabled={!hasRelationships}
                    className={cn(
                      'h-8 rounded-full border px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground',
                      !hasRelationships && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    <GitBranch className="mr-1.5 h-3.5 w-3.5" />
                    View Dependencies
                    <Maximize2 className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                  <DialogContent className="flex h-[85vh] w-[min(1200px,95vw)] max-w-6xl flex-col gap-4 overflow-hidden">
                    <DialogHeader>
                      <DialogTitle>Dependency Graph</DialogTitle>
                      <DialogDescription>
                        Precedence requirements and connected specs rendered with automatic layout.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="min-h-0 flex-1">
                      {completeRelationships && (
                        <SpecDependencyGraph
                          relationships={completeRelationships}
                          specNumber={spec.specNumber}
                          specTitle={displayTitle}
                        />
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Focus Mode Toggle - Desktop only */}
                {onToggleFocusMode && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onToggleFocusMode}
                    className="hidden lg:inline-flex h-8 rounded-full border px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                    title="Enter focus mode"
                  >
                    <Maximize2 className="mr-1.5 h-3.5 w-3.5" />
                    Focus
                  </Button>
                )}
              </div>
            </>
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

      {/* Main content with Sidebar */}
      <div className="flex flex-col xl:flex-row xl:items-start">
        <main className="flex-1 px-3 sm:px-6 py-3 sm:py-6 min-w-0">
          <div className="space-y-4">
            {isLoading && <div className="text-sm text-muted-foreground">Loading...</div>}
            {error && <div className="text-sm text-destructive">Error loading spec</div>}

            <article className="prose prose-slate dark:prose-invert max-w-none prose-sm sm:prose-base">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkStripHtmlComments]}
                rehypePlugins={[rehypeHighlight, rehypeSlug]}
                components={{
                  a: (props) => <MarkdownLink {...props} currentSpecNumber={spec.specNumber || undefined} />,
                  pre: ({ children, ...props }) => {
                    // Safely get the first child element
                    const childArray = React.Children.toArray(children);
                    const firstChild = childArray[0];
                    
                    // Check if this is a mermaid code block
                    if (
                      React.isValidElement(firstChild) &&
                      firstChild.type === 'code' &&
                      typeof (firstChild.props as { className?: string }).className === 'string' &&
                      (firstChild.props as { className?: string }).className?.includes('language-mermaid')
                    ) {
                      const codeProps = firstChild.props as { children?: React.ReactNode };
                      const code = typeof codeProps.children === 'string'
                        ? codeProps.children
                        : '';
                      return <MermaidDiagram code={code} />;
                    }
                    // Default pre rendering
                    return <pre {...props}>{children}</pre>;
                  },
                }}
              >
                {displayContent}
              </ReactMarkdown>
            </article>
          </div>
        </main>

        {/* Right Sidebar for TOC (Desktop only) */}
        <aside className="hidden xl:block w-72 shrink-0 px-6 py-6 sticky top-32 h-[calc(100vh-8rem)] overflow-y-auto scrollbar-auto-hide">
           <TableOfContentsSidebar content={displayContent} />
        </aside>
      </div>

      {/* Floating action buttons (Mobile/Tablet only) */}
      <div className="xl:hidden">
        <TableOfContents content={displayContent} />
      </div>
      <BackToTop />
    </>
  );
}
