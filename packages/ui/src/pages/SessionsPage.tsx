import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { FilterX, RefreshCcw, FileQuestion, Play, Square, RotateCcw, ArrowUpRight, Plus } from 'lucide-react';
import { Button, Card, CardContent } from '@leanspec/ui-components';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import type { Session, SessionStatus, Spec } from '../types/api';
import { useLayout, useProject } from '../contexts';
import { EmptyState } from '../components/shared/EmptyState';
import { PageHeader } from '../components/shared/PageHeader';
import { PageTransition } from '../components/shared/PageTransition';
import { SESSION_STATUS_DOT_STYLES, SESSION_STATUS_STYLES, formatSessionDuration } from '../lib/session-utils';
import { SessionCreateDialog } from '../components/sessions/SessionCreateDialog';
import { cn } from '../lib/utils';

const PAGE_SIZE = 20;

type SortOption = 'started-desc' | 'started-asc' | 'duration-desc' | 'status';

export function SessionsPage() {
  const { t } = useTranslation('common');
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject, loading: projectLoading } = useProject();
  const resolvedProjectId = projectId ?? currentProject?.id;
  const basePath = resolvedProjectId ? `/projects/${resolvedProjectId}` : '/projects';
  const { isWideMode } = useLayout();
  const projectReady = !projectId || currentProject?.id === projectId;

  const [sessions, setSessions] = useState<Session[]>([]);
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [toolFilter, setToolFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [specFilter, setSpecFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('started-desc');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [createOpen, setCreateOpen] = useState(false);

  const [searchParams] = useSearchParams();
  const initializedFromQuery = useRef(false);

  const loadSessions = useCallback(async () => {
    if (!projectReady || projectLoading) return;
    setLoading(true);
    try {
      const data = await api.listSessions();
      setSessions(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('sessions.errors.load'));
    } finally {
      setLoading(false);
    }
  }, [projectLoading, projectReady, t]);

  const loadSpecs = useCallback(async () => {
    if (!projectReady || projectLoading) return;
    try {
      const data = await api.getSpecs();
      setSpecs(data);
    } catch {
      setSpecs([]);
    }
  }, [projectLoading, projectReady]);

  useEffect(() => {
    void loadSessions();
    void loadSpecs();
  }, [loadSessions, loadSpecs]);

  useEffect(() => {
    if (initializedFromQuery.current) return;
    const initialSpec = searchParams.get('spec');
    if (initialSpec) {
      setSpecFilter(initialSpec);
    }
    initializedFromQuery.current = true;
  }, [searchParams]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, statusFilter, toolFilter, modeFilter, specFilter, sortBy]);

  const uniqueStatuses = useMemo(() => {
    const statuses = sessions.map((s) => s.status).filter(Boolean) as SessionStatus[];
    return Array.from(new Set(statuses));
  }, [sessions]);

  const uniqueTools = useMemo(() => {
    const tools = sessions.map((s) => s.tool).filter(Boolean);
    return Array.from(new Set(tools));
  }, [sessions]);

  const uniqueModes = useMemo(() => {
    const modes = sessions.map((s) => s.mode).filter(Boolean);
    return Array.from(new Set(modes));
  }, [sessions]);

  const specOptions = useMemo(() => {
    return specs
      .map((spec) => ({
        id: spec.specName,
        label: spec.specNumber ? `#${spec.specNumber} ${spec.title ?? spec.specName}` : (spec.title ?? spec.specName),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [specs]);

  const filteredSessions = useMemo(() => {
    const filtered = sessions.filter((session) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          session.id.toLowerCase().includes(query) ||
          (session.specId ? session.specId.toLowerCase().includes(query) : false) ||
          session.tool.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      if (statusFilter !== 'all' && session.status !== statusFilter) return false;
      if (toolFilter !== 'all' && session.tool !== toolFilter) return false;
      if (modeFilter !== 'all' && session.mode !== modeFilter) return false;

      if (specFilter !== 'all') {
        if (!session.specId) return false;
        if (session.specId !== specFilter && !session.specId.includes(specFilter)) return false;
      }

      return true;
    });

    const sorted = [...filtered];
    switch (sortBy) {
      case 'started-asc':
        sorted.sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
        break;
      case 'duration-desc':
        sorted.sort((a, b) => {
          const aDuration = a.durationMs ?? 0;
          const bDuration = b.durationMs ?? 0;
          return bDuration - aDuration;
        });
        break;
      case 'status':
        sorted.sort((a, b) => a.status.localeCompare(b.status));
        break;
      case 'started-desc':
      default:
        sorted.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
        break;
    }

    return sorted;
  }, [modeFilter, searchQuery, sessions, sortBy, specFilter, statusFilter, toolFilter]);

  const visibleSessions = filteredSessions.slice(0, visibleCount);

  const handleStart = useCallback(async (sessionId: string) => {
    await api.startSession(sessionId);
    await loadSessions();
  }, [loadSessions]);

  const handleStop = useCallback(async (sessionId: string) => {
    await api.stopSession(sessionId);
    await loadSessions();
  }, [loadSessions]);

  const handleRetry = useCallback(async (session: Session) => {
    if (!currentProject?.path) return;
    await api.createSession({
      projectPath: currentProject.path,
      specId: session.specId ?? null,
      tool: session.tool,
      mode: session.mode,
    }).then((created) => api.startSession(created.id));
    await loadSessions();
  }, [currentProject?.path, loadSessions]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t('actions.loading')}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <div className="text-lg font-semibold">{t('sessionsPage.state.errorTitle')}</div>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="secondary" size="sm" onClick={loadSessions} className="mt-2">
              {t('actions.retry')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PageTransition className={cn('flex-1 min-w-0')}>
      <div className={cn('h-[calc(100vh-3.5rem)] flex flex-col gap-4 p-4 sm:p-6 mx-auto w-full', isWideMode ? 'max-w-full' : 'max-w-7xl')}>
        <div className="flex flex-col gap-4 sticky top-14 bg-background mt-0 py-2 z-10">
          <PageHeader
            title={t('sessionsPage.title')}
            description={t('sessionsPage.description')}
            actions={(
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                {t('sessions.actions.new')}
              </Button>
            )}
          />

          <p className="text-sm text-muted-foreground">{t('sessionsPage.count', { count: filteredSessions.length })}</p>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t('sessionsPage.filters.search')}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="all">{t('sessionsPage.filters.status')}</option>
              {uniqueStatuses.map((status) => (
                <option key={status} value={status}>{t(`sessions.status.${status}`)}</option>
              ))}
            </select>
            <select
              value={toolFilter}
              onChange={(event) => setToolFilter(event.target.value)}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="all">{t('sessionsPage.filters.tool')}</option>
              {uniqueTools.map((tool) => (
                <option key={tool} value={tool}>{tool}</option>
              ))}
            </select>
            <select
              value={modeFilter}
              onChange={(event) => setModeFilter(event.target.value)}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="all">{t('sessionsPage.filters.mode')}</option>
              {uniqueModes.map((mode) => (
                <option key={mode} value={mode}>{mode}</option>
              ))}
            </select>
            <select
              value={specFilter}
              onChange={(event) => setSpecFilter(event.target.value)}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="all">{t('sessionsPage.filters.spec')}</option>
              {specOptions.map((spec) => (
                <option key={spec.id} value={spec.id}>{spec.label}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="started-desc">{t('sessionsPage.sort.startedDesc')}</option>
              <option value="started-asc">{t('sessionsPage.sort.startedAsc')}</option>
              <option value="duration-desc">{t('sessionsPage.sort.durationDesc')}</option>
              <option value="status">{t('sessionsPage.sort.status')}</option>
            </select>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          {sessions.length === 0 ? (
            <EmptyState
              icon={FileQuestion}
              title={t('sessionsPage.state.emptyTitle')}
              description={t('sessionsPage.state.emptyDescription')}
              actions={(
                <Button variant="secondary" size="sm" onClick={() => setCreateOpen(true)}>
                  {t('sessions.actions.new')}
                </Button>
              )}
            />
          ) : filteredSessions.length === 0 ? (
            <EmptyState
              icon={FilterX}
              title={t('sessionsPage.state.noResultsTitle')}
              description={t('sessionsPage.state.noResultsDescription')}
              actions={(
                <div className="flex gap-2 flex-wrap justify-center">
                  <Button variant="outline" size="sm" onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setToolFilter('all');
                    setModeFilter('all');
                    setSpecFilter('all');
                  }}>
                    {t('specsNavSidebar.clearFilters')}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={loadSessions}>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    {t('sessionsPage.buttons.refresh')}
                  </Button>
                </div>
              )}
            />
          ) : (
            <div className="space-y-3">
              {visibleSessions.map((session) => (
                <Card key={session.id} className="border-border/60">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <span className={cn('inline-flex h-2.5 w-2.5 rounded-full', SESSION_STATUS_DOT_STYLES[session.status])} />
                          {session.tool}
                          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', SESSION_STATUS_STYLES[session.status])}>
                            {t(`sessions.status.${session.status}`)}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {t('sessions.labels.mode')}: {session.mode}
                          {session.specId ? ` • ${t('sessions.labels.spec')}: ${session.specId}` : ''}
                          {` • ${t('sessions.labels.started')}: ${new Date(session.startedAt).toLocaleString()}`}
                        </div>
                        {formatSessionDuration(session) && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {t('sessions.labels.duration')}: {formatSessionDuration(session)}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" variant="outline" className="gap-1" asChild>
                          <Link to={`${basePath}/sessions/${session.id}`}>
                            <ArrowUpRight className="h-3.5 w-3.5" />
                            {t('sessions.actions.view')}
                          </Link>
                        </Button>
                        {session.status === 'pending' && (
                          <Button size="sm" variant="secondary" className="gap-1" onClick={() => void handleStart(session.id)}>
                            <Play className="h-3.5 w-3.5" />
                            {t('sessions.actions.start')}
                          </Button>
                        )}
                        {session.status === 'running' && (
                          <Button size="sm" variant="destructive" className="gap-1" onClick={() => void handleStop(session.id)}>
                            <Square className="h-3.5 w-3.5" />
                            {t('sessions.actions.stop')}
                          </Button>
                        )}
                        {session.status === 'failed' && (
                          <Button size="sm" variant="secondary" className="gap-1" onClick={() => void handleRetry(session)}>
                            <RotateCcw className="h-3.5 w-3.5" />
                            {t('sessions.actions.retry')}
                          </Button>
                        )}
                        {session.specId && (
                          <Button size="sm" variant="ghost" className="gap-1" asChild>
                            <Link to={`${basePath}/specs/${session.specId}`}>
                              {t('sessions.actions.viewSpec')}
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {visibleSessions.length < filteredSessions.length && (
                <div className="flex justify-center">
                  <Button variant="outline" size="sm" onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}>
                    {t('sessionsPage.buttons.loadMore')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <SessionCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectPath={currentProject?.path}
        specOptions={specOptions}
        onCreated={() => void loadSessions()}
      />
    </PageTransition>
  );
}
