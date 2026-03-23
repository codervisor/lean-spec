import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { useSpecDetailLayoutContext } from '../components/spec-detail-layout.context';
import { Button, formatRelativeTime } from '@/library';
import { api } from '../lib/api';
import { describeApiError } from '../lib/api-error';
import { getBackend } from '../lib/backend-adapter';
import type { SubSpec, SpecTokenResponse, SpecValidationResponse, SpecDetail } from '../types/api';
import { SpecDetailSkeleton } from '../components/shared/skeletons';
import { EmptyState } from '../components/shared/empty-state';
import { useCurrentProject } from '../hooks/useProjectQuery';
import { useSpecDetail } from '../hooks/useSpecsQuery';
import { useSessions } from '../hooks/useSessionsQuery';
import { useMachineStore } from '../stores/machine';
import { useSessionsUiStore } from '../stores/sessions-ui';
import { useTranslation } from 'react-i18next';
import { PageTransition } from '../components/shared/page-transition';
import { getSubSpecStyle, formatSubSpecName } from '../lib/sub-spec-utils';
import { RelationshipsEditor } from '../components/relationships/relationships-editor';
import { TokenDetailsDialog } from '../components/specs/token-details-dialog';
import { ValidationDialog } from '../components/specs/validation-dialog';

import { SpecDetailHeader } from '../components/spec-detail/spec-detail-header';
import { SubSpecTabs, type EnrichedSubSpec } from '../components/spec-detail/sub-spec-tabs';
import { SpecDetailContent } from '../components/spec-detail/spec-detail-content';

/**
 * Optimistically toggle a checkbox in markdown content.
 */
function toggleCheckboxInContent(content: string, itemText: string, checked: boolean): string {
  const lines = content.split('\n');
  const target = itemText.trim().toLowerCase();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim().toLowerCase();
    if (
      (trimmed.startsWith('- [ ]') || trimmed.startsWith('- [x]')) &&
      trimmed.includes(target)
    ) {
      lines[i] = checked
        ? line.replace(/- \[[ ]\]/, '- [x]')
        : line.replace(/- \[[xX]\]/, '- [ ]');
      break;
    }
  }

  return lines.join('\n');
}

export function SpecDetailPage() {
  const { specName, projectId } = useParams<{ specName: string; projectId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentProject } = useCurrentProject();
  const resolvedProjectId = projectId ?? currentProject?.id;
  const basePath = resolvedProjectId ? `/projects/${resolvedProjectId}` : '/projects';
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

  const describeError = useCallback((err: unknown) => describeApiError(err, t), [t]);

  const loadSpec = useCallback(async () => {
    setLoading(true);
    await specQuery.refetch();
  }, [specQuery]);

  // Fetch tokens and validation asynchronously
  useEffect(() => {
    if (!spec?.specName || !resolvedProjectId) return;
    setAsyncMetadata({});

    const specId = spec.specName;
    void (async () => {
      try {
        const data = await backend.getSpecTokens(resolvedProjectId, specId);
        setAsyncMetadata(prev => ({ ...prev, tokenCount: data.tokenCount, tokenStatus: data.tokenStatus }));
      } catch (err) { console.debug('Failed to async fetch tokens', err); }
    })();
    void (async () => {
      try {
        const data = await backend.getSpecValidation(resolvedProjectId, specId);
        setAsyncMetadata(prev => ({ ...prev, validationStatus: data.status, validationErrors: data.errors.length }));
      } catch (err) { console.debug('Failed to async fetch validation', err); }
    })();
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
    if (specQuery.isLoading) setLoading(true);
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
    return sessions.filter(s => (s.specIds?.includes(spec.specName) ?? false) && (s.status === 'running' || s.status === 'pending')).length;
  }, [sessions, spec?.specName]);

  const totalSessionsCount = useMemo(() => {
    if (!spec?.specName) return 0;
    return sessions.filter(s => s.specIds?.includes(spec.specName) ?? false).length;
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

  const handleChecklistToggle = useCallback(async (itemText: string, checked: boolean) => {
    if (!spec?.specName) return;

    if (!currentSubSpec) {
      setSpec((prev) => {
        if (!prev) return prev;
        const updatedContent = toggleCheckboxInContent(prev.contentMd || '', itemText, checked);
        return { ...prev, contentMd: updatedContent };
      });
    } else {
      setSpec((prev) => {
        if (!prev || !prev.subSpecs) return prev;
        const updatedSubSpecs = (prev.subSpecs as SubSpec[]).map((ss: SubSpec) => {
          if (ss.file === currentSubSpec) {
            const updatedContent = toggleCheckboxInContent(ss.content || ss.contentMd || '', itemText, checked);
            return { ...ss, content: updatedContent, contentMd: updatedContent };
          }
          return ss;
        });
        return { ...prev, subSpecs: updatedSubSpecs };
      });
    }

    try {
      await api.toggleSpecChecklist(spec.specName, [{ itemText, checked }], { subspec: currentSubSpec || undefined });
      void specQuery.refetch();
    } catch (err) {
      console.error('Failed to toggle checklist item:', err);
      void specQuery.refetch();
    }
  }, [spec?.specName, currentSubSpec, specQuery]);

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

  const displayTitle = spec?.title || spec?.specName || '';
  const tags = useMemo(() => spec?.tags || [], [spec?.tags]);
  const updatedRelative = spec?.updatedAt ? formatRelativeTime(spec.updatedAt, i18n.language) : null;
  const currentTokenCount = asyncMetadata.tokenCount ?? spec?.tokenCount;
  const currentValidationStatus = asyncMetadata.validationStatus ?? spec?.validationStatus;

  // Handle scroll padding for sticky header
  useEffect(() => {
    const updateScrollPadding = () => {
      const navbarHeight = 56;
      let offset = 0;
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
    if (headerRef.current) observer.observe(headerRef.current);

    return () => {
      window.removeEventListener('resize', updateScrollPadding);
      observer.disconnect();
      document.documentElement.style.scrollPaddingTop = '';
    };
  }, [spec, tags]);

  if (loading) return <SpecDetailSkeleton />;

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
              <Button variant="outline" size="sm" className="gap-2">{t('specDetail.links.backToSpecs')}</Button>
            </Link>
            <Button variant="secondary" size="sm" className="gap-2" onClick={() => void loadSpec()}>
              <RefreshCcw className="h-4 w-4" />{t('actions.retry')}
            </Button>
            <a href="https://github.com/codervisor/lean-spec/issues" target="_blank" rel="noreferrer" className="inline-flex">
              <Button variant="ghost" size="sm" className="gap-2">{t('specDetail.links.reportIssue')}</Button>
            </a>
          </>
        )}
      />
    );
  }

  return (
    <PageTransition className="flex-1 min-w-0">
      <div id="spec-detail-main" className="overflow-y-auto h-[calc(100dvh-3.5rem)]">
        {/* Mobile Sidebar Toggle */}
        <div className="lg:hidden sticky top-0 z-20 flex items-center justify-between bg-background/95 backdrop-blur border-b px-3 py-2">
          <span className="text-sm font-semibold">{t('specsNavSidebar.title')}</span>
          <Button size="sm" variant="outline" onClick={() => setMobileOpen(true)}>{t('actions.openSidebar')}</Button>
        </div>

        {/* Header */}
        <SpecDetailHeader
          spec={spec}
          basePath={basePath}
          displayTitle={displayTitle}
          tags={tags}
          updatedRelative={updatedRelative}
          isFocusMode={isFocusMode}
          setIsFocusMode={setIsFocusMode}
          headerRef={headerRef}
          machineModeEnabled={machineModeEnabled}
          isMachineAvailable={isMachineAvailable}
          applySpecPatch={applySpecPatch}
          onOpenTimeline={() => setTimelineDialogOpen(true)}
          onOpenRelationships={() => setRelationshipsDialogOpen(true)}
          onOpenSessions={() => openDrawer(spec.specName)}
          onOpenMobile={() => setMobileOpen(true)}
          timelineDialogOpen={timelineDialogOpen}
          setTimelineDialogOpen={setTimelineDialogOpen}
          activeSessionsCount={activeSessionsCount}
          totalSessionsCount={totalSessionsCount}
          currentTokenCount={currentTokenCount}
          currentValidationStatus={currentValidationStatus}
          asyncMetadata={asyncMetadata}
          onOpenTokenDialog={() => { if (resolvedProjectId) setTokenDialogOpen(true); }}
          onOpenValidationDialog={() => { if (resolvedProjectId) setValidationDialogOpen(true); }}
          t={t}
          i18n={i18n}
        />

        {/* Sub-spec tabs */}
        <SubSpecTabs
          subSpecs={subSpecs}
          currentSubSpec={currentSubSpec}
          onSwitch={handleSubSpecSwitch}
          t={t}
        />

        {/* Content */}
        <SpecDetailContent
          displayContent={displayContent}
          specName={specName}
          basePath={basePath}
          hasSubSpecs={subSpecs.length > 0}
          onChecklistToggle={handleChecklistToggle}
        />
      </div>

      {/* Dialogs */}
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
          onClose={() => { setTokenDialogOpen(false); setTokenDialogData(null); }}
          specName={spec.specName}
          data={tokenDialogData}
          loading={tokenDialogLoading}
        />
      )}
      {spec?.specName && validationDialogOpen && (
        <ValidationDialog
          open={validationDialogOpen}
          onClose={() => { setValidationDialogOpen(false); setValidationDialogData(null); }}
          specName={spec.specName}
          data={validationDialogData}
          loading={validationDialogLoading}
        />
      )}
    </PageTransition>
  );
}
