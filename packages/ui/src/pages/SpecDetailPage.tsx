import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  RefreshCcw,
  Home,
  Clock,
  Maximize2,
  Minimize2,
  List as ListIcon,
  Terminal,
  CornerDownRight,
  ChevronRight,
  Link2
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
  formatDate,
  formatRelativeTime,
  SpecTimeline,
  StatusBadge,
  PriorityBadge,
} from '@leanspec/ui-components';
import { APIError } from '../lib/api';
import { getBackend } from '../lib/backend-adapter';
import { StatusEditor } from '../components/metadata-editors/StatusEditor';
import { PriorityEditor } from '../components/metadata-editors/PriorityEditor';
import { TagsEditor } from '../components/metadata-editors/TagsEditor';
import type { SubSpec, SpecTokenResponse, SpecValidationResponse } from '../types/api';
import { TableOfContents, TableOfContentsSidebar } from '../components/spec-detail/TableOfContents';
import { SpecDetailSkeleton } from '../components/shared/Skeletons';
import { EmptyState } from '../components/shared/EmptyState';
import { MarkdownRenderer } from '../components/spec-detail/MarkdownRenderer';
import { BackToTop } from '../components/shared/BackToTop';
import { useCurrentProject } from '../hooks/useProjectQuery';
import { useSpecDetail } from '../hooks/useSpecsQuery';
import { useSessions } from '../hooks/useSessionsQuery';
import { useLayoutStore } from '../stores/layout';
import { useMachineStore } from '../stores/machine';
import { useSessionsUiStore } from '../stores/sessions-ui';
import { useTranslation } from 'react-i18next';
import type { SpecDetail } from '../types/api';
import { PageTransition } from '../components/shared/PageTransition';
import { getSubSpecStyle, formatSubSpecName } from '../lib/sub-spec-utils';
import type { LucideIcon } from 'lucide-react';
import { RelationshipsEditor } from '../components/relationships/RelationshipsEditor';
import { TokenBadge } from '../components/TokenBadge';
import { ValidationBadge } from '../components/ValidationBadge';
import { TokenDetailsDialog } from '../components/specs/TokenDetailsDialog';
import { ValidationDialog } from '../components/specs/ValidationDialog';

// Sub-spec with frontend-assigned styling
interface EnrichedSubSpec extends SubSpec {
  icon: LucideIcon;
  color: string;
}

export function SpecDetailPage() {
  const { specName, projectId } = useParams<{ specName: string; projectId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentProject } = useCurrentProject();
  const resolvedProjectId = projectId ?? currentProject?.id;
  const basePath = resolvedProjectId ? `/projects/${resolvedProjectId}` : '/projects';
  const { isWideMode } = useLayoutStore();
  const { machineModeEnabled, isMachineAvailable } = useMachineStore();
  const { t, i18n } = useTranslation(['common', 'errors']);
  const [spec, setSpec] = useState<SpecDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentSubSpec = searchParams.get('subspec');
  const headerRef = useRef<HTMLElement>(null);
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [relationshipsDialogOpen, setRelationshipsDialogOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [tokenDialogLoading, setTokenDialogLoading] = useState(false);
  const [tokenDialogData, setTokenDialogData] = useState<SpecTokenResponse | null>(null);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [validationDialogLoading, setValidationDialogLoading] = useState(false);
  const [validationDialogData, setValidationDialogData] = useState<SpecValidationResponse | null>(null);
  const [asyncMetadata, setAsyncMetadata] = useState<{
    tokenCount?: number;
    tokenStatus?: import('../types/api').TokenStatus;
    validationStatus?: import('../types/api').ValidationStatus;
    validationErrors?: number;
  }>({});
  const { setMobileOpen } = useSpecDetailLayoutContext();
  const { openDrawer } = useSessionsUiStore();
  const sessionsQuery = useSessions(resolvedProjectId ?? null);
  const sessions = sessionsQuery.data ?? [];
  const specQuery = useSpecDetail(resolvedProjectId ?? null, specName ?? null);
  const backend = getBackend();

  const [showSidebar, setShowSidebar] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
  const observerRef = useRef<ResizeObserver | null>(null);

  const mainContentRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (node) {
      // Initial check
      setShowSidebar(node.clientWidth >= 1024);

      observerRef.current = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setShowSidebar(entry.contentRect.width >= 1024);
        }
      });
      observerRef.current.observe(node);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

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
    setLoading(true);
    await specQuery.refetch();
  }, [specQuery]);

  // Fetch tokens and validation asynchronously
  useEffect(() => {
    if (!spec?.specName || !resolvedProjectId) return;

    // Reset metadata when spec changes to clear old badges
    setAsyncMetadata({});

    const specId = spec.specName;
    const fetchTokens = async () => {
      try {
        const data = await backend.getSpecTokens(resolvedProjectId, specId);
        setAsyncMetadata(prev => ({
          ...prev,
          tokenCount: data.tokenCount,
          tokenStatus: data.tokenStatus
        }));
      } catch (err) {
        // Silently fail for badges
        console.debug('Failed to async fetch tokens', err);
      }
    };

    const fetchValidation = async () => {
      try {
        const data = await backend.getSpecValidation(resolvedProjectId, specId);
        setAsyncMetadata(prev => ({
          ...prev,
          validationStatus: data.status,
          validationErrors: data.errors.length
        }));
      } catch (err) {
        // Silently fail for badges
        console.debug('Failed to async fetch validation', err);
      }
    };

    void fetchTokens();
    void fetchValidation();
  }, [backend, resolvedProjectId, spec?.specName]);

  useEffect(() => {
    if (!specQuery.data) return;
    setSpec(specQuery.data);
    setError(null);
    setLoading(false);
  }, [specQuery.data]);

  useEffect(() => {
    if (!specQuery.error) return;
    setError(describeError(specQuery.error));
    setLoading(false);
  }, [describeError, specQuery.error]);

  useEffect(() => {
    if (specQuery.isLoading) {
      setLoading(true);
    }
  }, [specQuery.isLoading, specName, resolvedProjectId]);

  useEffect(() => {
    if (!tokenDialogOpen || !resolvedProjectId || !spec?.specName) return;
    setTokenDialogLoading(true);
    backend.getSpecTokens(resolvedProjectId, spec.specName)
      .then((data) => setTokenDialogData(data))
      .catch(() => setTokenDialogData(null))
      .finally(() => setTokenDialogLoading(false));
  }, [backend, resolvedProjectId, spec?.specName, tokenDialogOpen]);

  useEffect(() => {
    if (!validationDialogOpen || !resolvedProjectId || !spec?.specName) return;
    setValidationDialogLoading(true);
    backend.getSpecValidation(resolvedProjectId, spec.specName)
      .then((data) => setValidationDialogData(data))
      .catch(() => setValidationDialogData(null))
      .finally(() => setValidationDialogLoading(false));
  }, [backend, resolvedProjectId, spec?.specName, validationDialogOpen]);


  const activeSessionsCount = useMemo(() => {
    if (!spec?.specName) return 0;
    return sessions.filter(s => s.specId === spec.specName && (s.status === 'running' || s.status === 'pending')).length;
  }, [sessions, spec?.specName]);

  const totalSessionsCount = useMemo(() => {
    if (!spec?.specName) return 0;
    return sessions.filter(s => s.specId === spec.specName).length;
  }, [sessions, spec?.specName]);

  const subSpecs: EnrichedSubSpec[] = useMemo(() => {
    const raw = (spec?.subSpecs as unknown) ?? (spec?.metadata?.sub_specs as unknown);
    if (!Array.isArray(raw)) return [];
    return raw
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const record = entry as Record<string, unknown>;
        const content = typeof record.content === 'string'
          ? record.content
          : typeof record.contentMd === 'string'
            ? record.contentMd
            : null;
        if (typeof content !== 'string') return null;

        const file = typeof record.filename === 'string'
          ? record.filename
          : typeof record.file === 'string'
            ? record.file
            : typeof record.name === 'string'
              ? record.name
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
      displayContent = subSpecData.content ?? subSpecData.contentMd ?? '';
    }
  }

  // Extract title
  const displayTitle = spec?.title || spec?.specName || '';
  const tags = useMemo(() => spec?.tags || [], [spec?.tags]);
  const updatedRelative = spec?.updatedAt ? formatRelativeTime(spec.updatedAt, i18n.language) : null;

  const currentTokenCount = asyncMetadata.tokenCount ?? spec?.tokenCount;
  const currentValidationStatus = asyncMetadata.validationStatus ?? spec?.validationStatus;
  const showMetadataBadges = useMemo(() =>
    currentTokenCount !== undefined || currentValidationStatus !== undefined,
    [currentTokenCount, currentValidationStatus]
  );

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

  return (
    <PageTransition className="flex-1 min-w-0">
      <div id="spec-detail-main" className="overflow-y-auto h-[calc(100vh-3.5rem)]">
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
                  <TokenBadge
                    count={currentTokenCount}
                    size="sm"
                    onClick={() => {
                      if (!resolvedProjectId) return;
                      setTokenDialogOpen(true);
                    }}
                  />
                  <ValidationBadge
                    status={currentValidationStatus}
                    errorCount={asyncMetadata.validationErrors}
                    size="sm"
                    onClick={() => {
                      if (!resolvedProjectId) return;
                      setValidationDialogOpen(true);
                    }}
                  />
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
                {/* Breadcrumb Hierarchy */}
                {spec.parent && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                    <Link to={`${basePath}/specs/${spec.parent}`} className="hover:text-primary hover:underline flex items-center gap-1 group">
                      <CornerDownRight className="h-3 w-3 group-hover:text-primary" />
                      <span className="font-medium">{spec.parent}</span>
                    </Link>
                    <ChevronRight className="h-3 w-3 opacity-50" />
                    <span className="truncate opacity-70">{displayTitle}</span>
                  </div>
                )}

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

                {/* Line 2: Status, Priority, Tokens, Validation, Tags */}
                <div className="flex flex-wrap items-center gap-2">
                  <StatusEditor
                    specName={spec.specName}
                    value={spec.status}
                    expectedContentHash={spec.contentHash}
                    disabled={machineModeEnabled && !isMachineAvailable()}
                    onChange={(status) => applySpecPatch({ status })}
                  />
                  <PriorityEditor
                    specName={spec.specName}
                    value={spec.priority}
                    expectedContentHash={spec.contentHash}
                    disabled={machineModeEnabled && !isMachineAvailable()}
                    onChange={(priority) => applySpecPatch({ priority })}
                  />

                  {showMetadataBadges && <>
                    <div className="h-4 w-px bg-border mx-1 hidden sm:block" />

                    <div className="flex items-center gap-2">
                      <TokenBadge
                        count={currentTokenCount}
                        size="md"
                        onClick={() => {
                          if (!resolvedProjectId) return;
                          setTokenDialogOpen(true);
                        }}
                      />
                      <ValidationBadge
                        status={currentValidationStatus}
                        errorCount={asyncMetadata.validationErrors}
                        size="md"
                        onClick={() => {
                          if (!resolvedProjectId) return;
                          setValidationDialogOpen(true);
                        }}
                      />
                    </div>
                  </>}

                  <div className="h-4 w-px bg-border mx-1 hidden sm:block" />

                  <TagsEditor
                    specName={spec.specName}
                    value={tags}
                    expectedContentHash={spec.contentHash}
                    disabled={machineModeEnabled && !isMachineAvailable()}
                    onChange={(tags) => applySpecPatch({ tags })}
                    compact={true}
                    className="min-w-0"
                  />
                </div>

                {machineModeEnabled && !isMachineAvailable() && (
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

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-haspopup="dialog"
                    aria-expanded={relationshipsDialogOpen}
                    onClick={() => setRelationshipsDialogOpen(true)}
                    className={cn(
                      'h-8 rounded-full border px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground'
                    )}
                  >
                    <Link2 className="mr-1.5 h-3.5 w-3.5" />
                    {t('relationships.button')}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openDrawer(spec.specName)}
                    className="h-8 rounded-full border px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Terminal className="mr-1.5 h-3.5 w-3.5" />
                    {t('navigation.sessions')}
                    <span className={cn(
                      "ml-2 rounded-full px-2 py-0.5 text-[10px]",
                      activeSessionsCount > 0 ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                    )}>
                      {activeSessionsCount > 0 ? `● ${activeSessionsCount}` : totalSessionsCount}
                    </span>
                  </Button>


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
                        onClick={() => handleSubSpecSwitch(subSpec.file ?? null)}
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
        <div
          ref={mainContentRef}
          className={cn("flex flex-col mx-auto w-full",
            showSidebar ? "flex-row items-start" : "",
            isWideMode ? "max-w-full" : "max-w-7xl"
          )}
        >
          <main className="flex-1 px-3 sm:px-6 py-3 sm:py-6 min-w-0">
            <MarkdownRenderer content={displayContent} specName={specName} basePath={basePath} />
          </main>

          {/* Right Sidebar for TOC (Desktop only) */}
          <aside
            className={cn(
              "w-72 shrink-0 px-6 py-6 sticky overflow-y-auto scrollbar-auto-hide",
              showSidebar ? "block" : "hidden",
              subSpecs.length > 0
                ? "top-[calc(16.375rem-3.5rem)] h-[calc(100vh-16.375rem)]"
                : "top-[calc(13.125rem-3.5rem)] h-[calc(100vh-13.125rem)]"
            )}
          >
            <TableOfContentsSidebar content={displayContent} />
          </aside>
        </div>

        {/* Floating action buttons (Mobile/Tablet only) */}
        <div className={showSidebar ? "hidden" : "block"}>
          <TableOfContents content={displayContent} />
        </div>
        <BackToTop />
      </div>
      {spec && (
        <RelationshipsEditor
          spec={spec}
          open={relationshipsDialogOpen}
          onOpenChange={setRelationshipsDialogOpen}
          basePath={basePath}
          disabled={machineModeEnabled && !isMachineAvailable()}
          onUpdated={() => void loadSpec()}
        />
      )}
      {spec?.specName && tokenDialogOpen && (
        <TokenDetailsDialog
          open={tokenDialogOpen}
          onClose={() => {
            setTokenDialogOpen(false);
            setTokenDialogData(null);
          }}
          specName={spec.specName}
          data={tokenDialogData}
          loading={tokenDialogLoading}
        />
      )}
      {spec?.specName && validationDialogOpen && (
        <ValidationDialog
          open={validationDialogOpen}
          onClose={() => {
            setValidationDialogOpen(false);
            setValidationDialogData(null);
          }}
          specName={spec.specName}
          data={validationDialogData}
          loading={validationDialogLoading}
        />
      )}
    </PageTransition>
  );
}
