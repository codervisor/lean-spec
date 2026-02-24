import { useCallback, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { FilterX, RefreshCcw, FileQuestion, Play, Square, RotateCcw, ArrowUpRight, Plus, Pause, Search, Filter } from 'lucide-react';
import { Button, Card, CardContent, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/library';
import { useTranslation } from 'react-i18next';
import type { Session, SessionStatus, Spec } from '../types/api';
import { useCurrentProject } from '../hooks/useProjectQuery';
import { useSessions, useSessionMutations } from '../hooks/useSessionsQuery';
import { useSpecsList } from '../hooks/useSpecsQuery';
import { EmptyState } from '../components/shared/empty-state';
import { PageHeader } from '../components/shared/page-header';
import { PageTransition } from '../components/shared/page-transition';
import { PageContainer } from '../components/shared/page-container';
import { SESSION_STATUS_DOT_STYLES, SESSION_STATUS_STYLES, formatSessionDuration } from '../lib/session-utils';
import { SessionCreateDialog } from '../components/sessions/session-create-dialog';
import { cn } from '@/library';

const PAGE_SIZE = 20;

type SortOption = 'started-desc' | 'started-asc' | 'duration-desc' | 'status';

export function SessionsPage() {
  const { t } = useTranslation('common');
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject, loading: projectLoading } = useCurrentProject();
  const resolvedProjectId = projectId ?? currentProject?.id;
  const basePath = resolvedProjectId ? `/projects/${resolvedProjectId}` : '/projects';
  const sessionsQuery = useSessions(resolvedProjectId ?? null);
  const specsQuery = useSpecsList(resolvedProjectId ?? null);
  const { createSession, startSession, stopSession, pauseSession, resumeSession } = useSessionMutations(resolvedProjectId ?? null);

  const sessions = useMemo(() => (sessionsQuery.data as Session[] | undefined) ?? [], [sessionsQuery.data]);
  const specs = useMemo(() => (specsQuery.data as Spec[] | undefined) ?? [], [specsQuery.data]);
  const loading = projectLoading || sessionsQuery.isLoading;
  const error = sessionsQuery.error ? t('sessions.errors.load') : null;

  const [searchParams] = useSearchParams();

  const [searchQuery, setSearchQueryRaw] = useState('');
  const [statusFilter, setStatusFilterRaw] = useState<string>('all');
  const [runnerFilter, setRunnerFilterRaw] = useState<string>('all');
  const [modeFilter, setModeFilterRaw] = useState<string>('all');
  const [specFilter, setSpecFilterRaw] = useState<string>(() => searchParams.get('spec') ?? 'all');
  const [sortBy, setSortByRaw] = useState<SortOption>('started-desc');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [createOpen, setCreateOpen] = useState(false);

  // Wrap filter setters to reset pagination
  const setSearchQuery = useCallback((value: string) => {
    setSearchQueryRaw(value);
    setVisibleCount(PAGE_SIZE);
  }, []);
  const setStatusFilter = useCallback((value: string) => {
    setStatusFilterRaw(value);
    setVisibleCount(PAGE_SIZE);
  }, []);
  const setRunnerFilter = useCallback((value: string) => {
    setRunnerFilterRaw(value);
    setVisibleCount(PAGE_SIZE);
  }, []);
  const setModeFilter = useCallback((value: string) => {
    setModeFilterRaw(value);
    setVisibleCount(PAGE_SIZE);
  }, []);
  const setSpecFilter = useCallback((value: string) => {
    setSpecFilterRaw(value);
    setVisibleCount(PAGE_SIZE);
  }, []);
  const setSortBy = useCallback((value: SortOption) => {
    setSortByRaw(value);
    setVisibleCount(PAGE_SIZE);
  }, []);

  const loadSessions = useCallback(async () => {
    await sessionsQuery.refetch();
    await specsQuery.refetch();
  }, [sessionsQuery, specsQuery]);

  const uniqueStatuses = useMemo(() => {
    const statuses = sessions.map((s) => s.status).filter(Boolean) as SessionStatus[];
    return Array.from(new Set(statuses));
  }, [sessions]);

  const uniqueRunners = useMemo(() => {
    const runners = sessions.map((s) => s.runner).filter(Boolean);
    return Array.from(new Set(runners));
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
          session.runner.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      if (statusFilter !== 'all' && session.status !== statusFilter) return false;
      if (runnerFilter !== 'all' && session.runner !== runnerFilter) return false;
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
  }, [modeFilter, searchQuery, sessions, sortBy, specFilter, statusFilter, runnerFilter]);

  const visibleSessions = filteredSessions.slice(0, visibleCount);

  const handleStart = useCallback(async (sessionId: string) => {
    await startSession(sessionId);
  }, [startSession]);

  const handleStop = useCallback(async (sessionId: string) => {
    await stopSession(sessionId);
  }, [stopSession]);

  const handlePause = useCallback(async (sessionId: string) => {
    await pauseSession(sessionId);
  }, [pauseSession]);

  const handleResume = useCallback(async (sessionId: string) => {
    await resumeSession(sessionId);
  }, [resumeSession]);

  const handleRetry = useCallback(async (session: Session) => {
    if (!currentProject?.path) return;
    const created = await createSession({
      projectPath: currentProject.path,
      specId: session.specId ?? null,
      runner: session.runner,
      mode: session.mode,
    });
    await startSession(created.id);
  }, [createSession, currentProject?.path, startSession]);

  if (loading) {
    return (
      <PageContainer>
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t('actions.loading')}
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <div className="text-lg font-semibold">{t('sessionsPage.state.errorTitle')}</div>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="secondary" size="sm" onClick={loadSessions} className="mt-2">
              {t('actions.retry')}
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageTransition className={cn('flex-1 min-w-0')}>
      <PageContainer
        className="h-[calc(100vh-3.5rem)]"
        contentClassName="flex h-full flex-col gap-4"
      >
        <div className="flex flex-col gap-4 sticky top-0 bg-background mt-0 py-2 z-10">
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

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('sessionsPage.filters.search')}
                className="w-full pl-10 pr-4 py-2"
              />
            </div>

            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Filter className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('specsNavSidebar.filtersLabel')}</span>
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder={t('sessionsPage.filters.status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="cursor-pointer">{t('sessionsPage.filters.status')}</SelectItem>
                    {uniqueStatuses.map((status) => (
                      <SelectItem key={status} value={status} className="cursor-pointer">
                        {t(`sessions.status.${status}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={runnerFilter} onValueChange={setRunnerFilter}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder={t('sessionsPage.filters.runner')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="cursor-pointer">{t('sessionsPage.filters.runner')}</SelectItem>
                    {uniqueRunners.map((runner) => (
                      <SelectItem key={runner} value={runner} className="cursor-pointer">
                        {runner}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={modeFilter} onValueChange={setModeFilter}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder={t('sessionsPage.filters.mode')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="cursor-pointer">{t('sessionsPage.filters.mode')}</SelectItem>
                    {uniqueModes.map((mode) => (
                      <SelectItem key={mode} value={mode} className="cursor-pointer">{mode}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={specFilter} onValueChange={setSpecFilter}>
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder={t('sessionsPage.filters.spec')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="cursor-pointer">{t('sessionsPage.filters.spec')}</SelectItem>
                    {specOptions.map((spec) => (
                      <SelectItem key={spec.id} value={spec.id} className="cursor-pointer">{spec.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-sm text-muted-foreground hidden sm:block">
                  {filteredSessions.length !== sessions.length
                    ? t('specsPage.filters.showingFiltered', { count: filteredSessions.length, total: sessions.length })
                    : t('specsPage.filters.showingAll', { count: sessions.length })}
                </div>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder={t('sessionsPage.sort.startedDesc')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="started-desc" className="cursor-pointer">{t('sessionsPage.sort.startedDesc')}</SelectItem>
                    <SelectItem value="started-asc" className="cursor-pointer">{t('sessionsPage.sort.startedAsc')}</SelectItem>
                    <SelectItem value="duration-desc" className="cursor-pointer">{t('sessionsPage.sort.durationDesc')}</SelectItem>
                    <SelectItem value="status" className="cursor-pointer">{t('sessionsPage.sort.status')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
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
                    setRunnerFilter('all');
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
            <div className="space-y-2">
              {visibleSessions.map((session) => (
                <div key={session.id} className="block border rounded-lg hover:bg-secondary/50 transition-colors bg-background">
                  <div className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn('inline-flex h-2.5 w-2.5 rounded-full', SESSION_STATUS_DOT_STYLES[session.status])} />
                          <h3 className="font-medium truncate">{session.runner}</h3>
                          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', SESSION_STATUS_STYLES[session.status])}>
                            {t(`sessions.status.${session.status}`)}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
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
                      <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
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
                          <>
                            <Button size="sm" variant="secondary" className="gap-1" onClick={() => void handlePause(session.id)}>
                              <Pause className="h-3.5 w-3.5" />
                              {t('sessions.actions.pause')}
                            </Button>
                            <Button size="sm" variant="destructive" className="gap-1" onClick={() => void handleStop(session.id)}>
                              <Square className="h-3.5 w-3.5" />
                              {t('sessions.actions.stop')}
                            </Button>
                          </>
                        )}
                        {session.status === 'paused' && (
                          <>
                            <Button size="sm" variant="secondary" className="gap-1" onClick={() => void handleResume(session.id)}>
                              <Play className="h-3.5 w-3.5" />
                              {t('sessions.actions.resume')}
                            </Button>
                            <Button size="sm" variant="destructive" className="gap-1" onClick={() => void handleStop(session.id)}>
                              <Square className="h-3.5 w-3.5" />
                              {t('sessions.actions.stop')}
                            </Button>
                          </>
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
                  </div>
                </div>
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
      </PageContainer>

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
