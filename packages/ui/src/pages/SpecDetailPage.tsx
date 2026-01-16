import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  RefreshCcw,
  GitBranch,
  Home,
  Clock,
  Maximize2,
  Minimize2,
  List as ListIcon,
  ExternalLink
} from 'lucide-react';
import { useSpecDetailLayoutContext } from '../components/SpecDetailLayout.context';
import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  SpecTimeline,
  SpecDependencyGraph,
  StatusBadge,
  PriorityBadge,
  type CompleteSpecRelationships
} from '@leanspec/ui-components';
import { APIError, api } from '../lib/api';
import { StatusEditor } from '../components/metadata-editors/StatusEditor';
import { PriorityEditor } from '../components/metadata-editors/PriorityEditor';
import { TagsEditor } from '../components/metadata-editors/TagsEditor';
import type { SubSpec } from '../types/api';
import { TableOfContents, TableOfContentsSidebar } from '../components/spec-detail/TableOfContents';
import { SpecDetailSkeleton } from '../components/shared/Skeletons';
import { EmptyState } from '../components/shared/EmptyState';
import { MarkdownRenderer } from '../components/spec-detail/MarkdownRenderer';
import { BackToTop } from '../components/shared/BackToTop';
import { useProject, useLayout, useMachine } from '../contexts';
import { useTranslation } from 'react-i18next';
import { formatDate, formatRelativeTime } from '../lib/date-utils';
import type { SpecDetail } from '../types/api';
import { PageTransition } from '../components/shared/PageTransition';
import { getSubSpecStyle, formatSubSpecName } from '../lib/sub-spec-utils';
import type { LucideIcon } from 'lucide-react';

// Sub-spec with frontend-assigned styling
interface EnrichedSubSpec extends SubSpec {
  icon: LucideIcon;
  color: string;
}

export function SpecDetailPage() {
  const { specName, projectId } = useParams<{ specName: string; projectId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentProject, loading: projectLoading } = useProject();
  const resolvedProjectId = projectId ?? currentProject?.id;
  const basePath = resolvedProjectId ? `/projects/${resolvedProjectId}` : '/projects';
  const { isWideMode } = useLayout();
  const { machineModeEnabled, isMachineAvailable } = useMachine();
  const { t, i18n } = useTranslation(['common', 'errors']);
  const projectReady = !projectId || currentProject?.id === projectId;
  const [spec, setSpec] = useState<SpecDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentSubSpec = searchParams.get('subspec');
  const headerRef = useRef<HTMLElement>(null);
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [dependenciesDialogOpen, setDependenciesDialogOpen] = useState(false);
  const [dependencyGraphData, setDependencyGraphData] = useState<CompleteSpecRelationships | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const { setMobileOpen } = useSpecDetailLayoutContext();

  const describeError = useCallback((err: unknown) => {
    if (err instanceof APIError) {
      switch (err.status) {
        case 404:
          return t('specNotFound', { ns: 'errors' });
        case 400:
          return t('invalidInput', { ns: 'errors' });
        case 500:
          return t('unknownError', { ns: 'errors' });
        default:
          return t('loadingError', { ns: 'errors' });
      }
    }

    if (err instanceof Error && err.message.includes('Failed to fetch')) {
      return t('networkError', { ns: 'errors' });
    }

    return err instanceof Error ? err.message : t('unknownError', { ns: 'errors' });
  }, [t]);

  const loadSpec = useCallback(async () => {
    if (!specName || !projectReady || projectLoading) return;
    setLoading(true);
    try {
      const data = await api.getSpec(specName);
      setSpec(data);
      setError(null);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [describeError, projectLoading, projectReady, specName]);

  useEffect(() => {
    void loadSpec();
  }, [loadSpec, projectReady]);

  useEffect(() => {
    if (dependenciesDialogOpen && !dependencyGraphData && spec) {
      const loadGraph = async () => {
        try {
          // Fetch all specs to get details for dependencies
          // In a real app, we should have a dedicated endpoint for this
          const allSpecs = await api.getSpecs();

          const findSpec = (idOrName: string) =>
            allSpecs.find(s => s.id === idOrName || s.specName === idOrName);

          const current = {
            specName: spec.specName,
            specNumber: spec.specNumber || undefined,
            status: spec.status || undefined,
            priority: spec.priority || undefined
          };

          const dependsOn = (spec.dependsOn || []).map(id => {
            const s = findSpec(id);
            return {
              specName: s?.specName || id,
              specNumber: s?.specNumber || undefined,
              title: s?.title || undefined,
              status: s?.status || undefined,
              priority: s?.priority || undefined
            };
          });

          const requiredBy = (spec.requiredBy || []).map(id => {
            const s = findSpec(id);
            return {
              specName: s?.specName || id,
              specNumber: s?.specNumber || undefined,
              title: s?.title || undefined,
              status: s?.status || undefined,
              priority: s?.priority || undefined
            };
          });

          setDependencyGraphData({ current, dependsOn, requiredBy });
        } catch (err) {
          console.error('Failed to load dependency graph data', err);
        }
      };
      void loadGraph();
    }
  }, [dependenciesDialogOpen, dependencyGraphData, spec]);

  const subSpecs: EnrichedSubSpec[] = useMemo(() => {
    const raw = (spec?.subSpecs as unknown) ?? (spec?.metadata?.sub_specs as unknown);
    if (!Array.isArray(raw)) return [];
    return raw
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const content = (entry as Record<string, unknown>).content;
        if (typeof content !== 'string') return null;

        const file = typeof (entry as Record<string, unknown>).file === 'string'
          ? (entry as Record<string, unknown>).file as string
          : typeof (entry as Record<string, unknown>).name === 'string'
            ? (entry as Record<string, unknown>).name as string
            : '';

        // Use frontend styling logic based on filename
        const style = getSubSpecStyle(file);

        return {
          name: formatSubSpecName(file),
          content,
          file,
          icon: style.icon,
          color: style.color,
        };
      })
      .filter(Boolean) as EnrichedSubSpec[];
  }, [spec]);

  const applySpecPatch = (updates: Partial<SpecDetail>) => {
    setSpec((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  // Handle sub-spec switching
  const handleSubSpecSwitch = (file: string | null) => {
    const newUrl = file
      ? `${basePath}/specs/${specName}?subspec=${file}`
      : `${basePath}/specs/${specName}`;
    navigate(newUrl);
  };

  // Get content to display (main or sub-spec)
  let displayContent = spec?.content || spec?.contentMd || '';
  if (currentSubSpec && spec && subSpecs.length > 0) {
    const subSpecData = subSpecs.find(s => s.file === currentSubSpec);
    if (subSpecData) {
      displayContent = subSpecData.content;
    }
  }

  // Extract title
  const displayTitle = spec?.title || spec?.specName || '';
  const tags = useMemo(() => spec?.tags || [], [spec?.tags]);
  const updatedRelative = spec?.updatedAt ? formatRelativeTime(spec.updatedAt, i18n.language) : null;

  // Handle scroll padding for sticky header
  useEffect(() => {
    const updateScrollPadding = () => {
      const navbarHeight = 56; // 3.5rem / top-14
      let offset = 0;

      // On large screens, the spec header is also sticky
      if (window.innerWidth >= 1024 && headerRef.current) {
        offset += headerRef.current.offsetHeight - navbarHeight;
      }

      const specDetailMain = document.querySelector<HTMLDivElement>('#spec-detail-main');
      if (specDetailMain) {
        specDetailMain.style.scrollPaddingTop = `${offset}px`;
      }
    };

    updateScrollPadding();
    window.addEventListener('resize', updateScrollPadding);

    const observer = new ResizeObserver(updateScrollPadding);
    if (headerRef.current) {
      observer.observe(headerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateScrollPadding);
      observer.disconnect();
      document.documentElement.style.scrollPaddingTop = '';
    };
  }, [spec, tags]);


  if (loading) {
    return <SpecDetailSkeleton />;
  }

  if (error || !spec) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title={t('specDetail.state.unavailableTitle')}
        description={error || t('specDetail.state.unavailableDescription')}
        tone="error"
        actions={(
          <>
            <Link to={`${basePath}/specs`} className="inline-flex">
              <Button variant="outline" size="sm" className="gap-2">
                {t('specDetail.links.backToSpecs')}
              </Button>
            </Link>
            <Button variant="secondary" size="sm" className="gap-2" onClick={() => void loadSpec()}>
              <RefreshCcw className="h-4 w-4" />
              {t('actions.retry')}
            </Button>
            <a
              href="https://github.com/codervisor/lean-spec/issues"
              target="_blank"
              rel="noreferrer"
              className="inline-flex"
            >
              <Button variant="ghost" size="sm" className="gap-2">
                {t('specDetail.links.reportIssue')}
              </Button>
            </a>
          </>
        )}
      />
    );
  }

  const dependsOn = spec.dependsOn || [];
  const requiredBy = spec.requiredBy || [];
  const hasRelationships = dependsOn.length > 0 || requiredBy.length > 0;

  return (
    <PageTransition className="w-full">
      <div id="spec-detail-main" className="flex-1 min-w-0 overflow-y-auto h-[calc(100vh-3.5rem)]">
        {/* Mobile Sidebar Toggle Button */}
        <div className="lg:hidden sticky top-0 z-20 flex items-center justify-between bg-background/95 backdrop-blur border-b px-3 py-2">
          <span className="text-sm font-semibold">{t('specsNavSidebar.title')}</span>
          <Button size="sm" variant="outline" onClick={() => setMobileOpen(true)}>
            {t('actions.openSidebar')}
          </Button>
        </div>

        {/* Compact Header - sticky on desktop */}
        <header ref={headerRef} className="lg:sticky lg:top-0 lg:z-20 border-b bg-card">
          <div className={cn("px-3 sm:px-6 mx-auto w-full", isWideMode ? "max-w-full" : "max-w-7xl", isFocusMode ? "py-1.5" : "py-2 sm:py-3")}>
            {/* Focus mode: Single compact row */}
            {isFocusMode ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <h1 className="text-base font-semibold tracking-tight truncate">
                    {spec.specNumber && (
                      <span className="text-muted-foreground">#{spec.specNumber} </span>
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
                  onClick={() => setIsFocusMode(false)}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
                  title={t('specDetail.buttons.exitFocus')}
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
                      <span className="text-muted-foreground">#{spec.specNumber} </span>
                    )}
                    {displayTitle}
                  </h1>

                  {/* Mobile Specs List Toggle */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden h-8 w-8 -mr-2 shrink-0 text-muted-foreground"
                    onClick={() => setMobileOpen(true)}
                  >
                    <ListIcon className="h-5 w-5" />
                    <span className="sr-only">{t('specDetail.toggleSidebar')}</span>
                  </Button>
                </div>

                {/* Line 2: Status, Priority, Tags */}
                <div className="flex flex-wrap items-center gap-2">
                  <StatusEditor
                    specName={spec.specName}
                    value={spec.status}
                    expectedContentHash={spec.contentHash}
                    disabled={machineModeEnabled && !isMachineAvailable}
                    onChange={(status) => applySpecPatch({ status })}
                  />
                  <PriorityEditor
                    specName={spec.specName}
                    value={spec.priority}
                    expectedContentHash={spec.contentHash}
                    disabled={machineModeEnabled && !isMachineAvailable}
                    onChange={(priority) => applySpecPatch({ priority })}
                  />

                  <div className="h-4 w-px bg-border mx-1 hidden sm:block" />
                  <TagsEditor
                    specName={spec.specName}
                    value={tags}
                    expectedContentHash={spec.contentHash}
                    disabled={machineModeEnabled && !isMachineAvailable}
                    onChange={(tags) => applySpecPatch({ tags })}
                  />
                </div>

                {machineModeEnabled && !isMachineAvailable && (
                  <div className="text-xs text-destructive mt-2">
                    {t('machines.unavailable')}
                  </div>
                )}

                {/* Line 3: Small metadata row */}
                <div className="flex flex-wrap gap-2 sm:gap-4 text-xs text-muted-foreground mt-1.5 sm:mt-2">
                  <span className="hidden sm:inline">
                    {t('specDetail.metadata.created')}: {formatDate(spec.createdAt, i18n.language)}
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <span>
                    {t('specDetail.metadata.updated')}: {formatDate(spec.updatedAt, i18n.language)}
                    {updatedRelative && (
                      <span className="ml-1 text-[11px] text-muted-foreground/80">({updatedRelative})</span>
                    )}
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden md:inline">{t('specDetail.metadata.name')}: {spec.specName}</span>
                  {spec.metadata?.assignee ? (
                    <>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline">{t('specDetail.metadata.assignee')}: {String(spec.metadata.assignee)}</span>
                    </>
                  ) : null}
                </div>

                {/* Action buttons row */}
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
                      {t('specDetail.buttons.viewTimeline')}
                      <Maximize2 className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                    <DialogContent className="w-[min(900px,90vw)] max-w-3xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{t('specDetail.dialogs.timelineTitle')}</DialogTitle>
                        <DialogDescription>{t('specDetail.dialogs.timelineDescription')}</DialogDescription>
                      </DialogHeader>
                      <div className="rounded-xl border border-border bg-muted/30 p-4">
                        <SpecTimeline
                          createdAt={spec.createdAt}
                          updatedAt={spec.updatedAt}
                          completedAt={spec.completedAt}
                          status={spec.status || 'planned'}
                          labels={{
                            created: t('specTimeline.events.created'),
                            inProgress: t('specTimeline.events.inProgress'),
                            complete: t('specTimeline.events.complete'),
                            archived: t('specTimeline.events.archived'),
                            awaiting: t('specTimeline.state.awaiting'),
                            queued: t('specTimeline.state.queued'),
                            pending: t('specTimeline.state.pending'),
                          }}
                          language={i18n.language}
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
                      {t('specDetail.buttons.viewDependencies')}
                      <Maximize2 className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                    <DialogContent className="flex h-[85vh] w-[min(1200px,95vw)] max-w-6xl flex-col gap-4 overflow-hidden">
                      <DialogHeader>
                        <DialogTitle>{t('specDetail.dialogs.dependenciesTitle')}</DialogTitle>
                        <DialogDescription className="flex flex-col gap-2">
                          <span>{t('specDetail.dialogs.dependenciesDescription')}</span>
                          <Link
                            to={`${basePath}/dependencies?spec=${spec.specNumber || spec.id}`}
                            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline w-fit"
                            onClick={() => setDependenciesDialogOpen(false)}
                          >
                            <ExternalLink className="h-3 w-3" />
                            {t('specDetail.dialogs.dependenciesLink')}
                          </Link>
                        </DialogDescription>
                      </DialogHeader>
                      <div className="min-h-0 flex-1">
                        {dependencyGraphData && (
                          <SpecDependencyGraph
                            relationships={dependencyGraphData}
                            specNumber={spec.specNumber}
                            specTitle={displayTitle}
                            labels={{
                              title: t('dependencyGraph.header.title'),
                              subtitle: t('dependencyGraph.header.subtitle'),
                              badge: t('dependencyGraph.header.badge'),
                              currentBadge: t('dependencyGraph.badges.current'),
                              currentSubtitle: t('dependencyGraph.badges.currentSubtitle'),
                              dependsOnBadge: t('dependencyGraph.badges.dependsOn'),
                              dependsOnSubtitle: t('dependencyGraph.badges.dependsOnSubtitle'),
                              requiredByBadge: t('dependencyGraph.badges.requiredBy'),
                              requiredBySubtitle: t('dependencyGraph.badges.requiredBySubtitle'),
                              completedSubtitle: t('dependencyGraph.statusSubtitles.completed'),
                              inProgressSubtitle: t('dependencyGraph.statusSubtitles.inProgress'),
                              plannedBlockingSubtitle: t('dependencyGraph.statusSubtitles.plannedBlocking'),
                              plannedCanProceedSubtitle: t('dependencyGraph.statusSubtitles.plannedCanProceed'),
                              archivedSubtitle: t('dependencyGraph.statusSubtitles.archived'),
                            }}
                            onNodeClick={(specId) => {
                              const url = `${basePath}/specs/${specId}`;
                              navigate(url);
                              setDependenciesDialogOpen(false);
                            }}
                          />
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Focus Mode Toggle */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFocusMode(true)}
                    className="hidden lg:inline-flex h-8 rounded-full border px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                    title={t('specDetail.buttons.focus')}
                  >
                    <Maximize2 className="mr-1.5 h-3.5 w-3.5" />
                    {t('specDetail.buttons.focus')}
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Horizontal Tabs for Sub-specs */}
          {subSpecs.length > 0 && (
            <div className="border-t bg-muted/30">
              <div className={cn("px-3 sm:px-6 overflow-x-auto mx-auto w-full", isWideMode ? "max-w-full" : "max-w-7xl")}>
                <div className="flex gap-1 py-2 min-w-max">
                  {/* Overview tab (README.md) */}
                  <button
                    onClick={() => handleSubSpecSwitch(null)}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${!currentSubSpec
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                  >
                    <Home className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('specDetail.tabs.overview')}</span>
                  </button>

                  {/* Sub-spec tabs */}
                  {subSpecs.map((subSpec) => {
                    const Icon = subSpec.icon;
                    return (
                      <button
                        key={subSpec.file}
                        onClick={() => handleSubSpecSwitch(subSpec.file)}
                        className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${currentSubSpec === subSpec.file
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
        <div className={cn("flex flex-col xl:flex-row xl:items-start mx-auto w-full", isWideMode ? "max-w-full" : "max-w-7xl")}>
          <main className="flex-1 px-3 sm:px-6 py-3 sm:py-6 min-w-0">
            <MarkdownRenderer content={displayContent} />
          </main>

          {/* Right Sidebar for TOC (Desktop only) */}
          <aside
            className={cn(
              "hidden xl:block w-72 shrink-0 px-6 py-6 sticky overflow-y-auto scrollbar-auto-hide",
              subSpecs.length > 0
                ? "top-[calc(16.375rem-3.5rem)] h-[calc(100vh-16.375rem)]"
                : "top-[calc(13.125rem-3.5rem)] h-[calc(100vh-13.125rem)]"
            )}
          >
            <TableOfContentsSidebar content={displayContent} />
          </aside>
        </div>

        {/* Floating action buttons (Mobile/Tablet only) */}
        <div className="xl:hidden">
          <TableOfContents content={displayContent} />
        </div>
        <BackToTop />
      </div>
    </PageTransition>
  );
}
