import { useCallback, useMemo, useState, memo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { FilterX, RefreshCcw, FileQuestion, Play, Square, Plus, Pause, Search, Filter, Timer, Hash, X } from 'lucide-react';
import { Badge, Button, Card, CardContent, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/library';
import { useTranslation } from 'react-i18next';
import type { Session, SessionStatus, Spec } from '../types/api';
import { useCurrentProject } from '../hooks/useProjectQuery';
import { useSessions, useSessionMutations } from '../hooks/useSessionsQuery';
import { useSpecsList } from '../hooks/useSpecsQuery';
import { EmptyState } from '../components/shared/empty-state';
import { PageHeader } from '../components/shared/page-header';
import { PageTransition } from '../components/shared/page-transition';
import { PageContainer } from '../components/shared/page-container';
import { sessionStatusConfig, sessionModeConfig, formatSessionDuration, getRunnerDisplayName } from '../lib/session-utils';
import { SessionCreateDialog } from '../components/sessions/session-create-dialog';
import { SearchableSelect } from '../components/searchable-select';
import { RunnerLogo } from '../components/library/ai-elements/runner-logo';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/tooltip';
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
  const { startSession, stopSession, pauseSession, resumeSession } = useSessionMutations(resolvedProjectId ?? null);
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
          (session.specIds?.some(id => id.toLowerCase().includes(query)) ?? false) ||
          session.runner.toLowerCase().includes(query) ||
          (session.prompt?.toLowerCase().includes(query) ?? false);
        if (!matchesSearch) return false;
      }

      if (statusFilter !== 'all' && session.status !== statusFilter) return false;
      if (runnerFilter !== 'all' && session.runner !== runnerFilter) return false;
      if (modeFilter !== 'all' && session.mode !== modeFilter) return false;

      if (specFilter !== 'all') {
        if (!session.specIds?.length) return false;
        if (!session.specIds.some(id => id === specFilter || id.includes(specFilter))) return false;
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
                      <span className="flex items-center gap-2">
                        <RunnerLogo runnerId={runner} size={16} />
                        {getRunnerDisplayName(runner, t)}
                      </span>
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
                    <SelectItem key={mode} value={mode} className="cursor-pointer">{t(`sessions.modes.${mode}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="w-[180px]">
                <SearchableSelect
                  value={specFilter}
                  onValueChange={setSpecFilter}
                  options={[
                    { value: 'all', label: t('sessionsPage.filters.spec') },
                    ...specOptions.map((spec) => ({ value: spec.id, label: spec.label })),
                  ]}
                  placeholder={t('sessionsPage.filters.spec')}
                  searchPlaceholder={t('sessions.select.search')}
                  emptyText={t('sessions.select.empty')}
                />
              </div>

              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder={t('sessionsPage.sort.startedDesc')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="started-desc" className="cursor-pointer">{t('sessionsPage.sort.startedDesc')}</SelectItem>
                  <SelectItem value="started-asc" className="cursor-pointer">{t('sessionsPage.sort.startedAsc')}</SelectItem>
                  <SelectItem value="duration-desc" className="cursor-pointer">{t('sessionsPage.sort.durationDesc')}</SelectItem>
                  <SelectItem value="status" className="cursor-pointer">{t('sessionsPage.sort.status')}</SelectItem>
                </SelectContent>
              </Select>

              {(searchQuery || statusFilter !== 'all' || runnerFilter !== 'all' || modeFilter !== 'all' || specFilter !== 'all') && (
                <Button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setRunnerFilter('all');
                    setModeFilter('all');
                    setSpecFilter('all');
                  }}
                  variant="ghost"
                  size="sm"
                  className="h-9 gap-1"
                >
                  <X className="w-4 h-4" />
                  {t('specsNavSidebar.clearFilters')}
                </Button>
              )}

              <span className="text-sm text-muted-foreground">
                {t('specsPage.filters.filteredCount', { filtered: filteredSessions.length, total: sessions.length })}
              </span>
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
                <SessionListItem
                  key={session.id}
                  session={session}
                  basePath={basePath}
                  onStart={handleStart}
                  onStop={handleStop}
                  onPause={handlePause}
                  onResume={handleResume}
                />
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
        onCreated={() => void loadSessions()}
      />
    </PageTransition>
  );
}

// --- Session List Item Component ---

interface SessionListItemProps {
  session: Session;
  basePath: string;
  onStart: (id: string) => Promise<void>;
  onStop: (id: string) => Promise<void>;
  onPause: (id: string) => Promise<void>;
  onResume: (id: string) => Promise<void>;
}

const SessionListItem = memo(function SessionListItem({
  session,
  basePath,
  onStart,
  onStop,
  onPause,
  onResume,
}: SessionListItemProps) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const statusCfg = sessionStatusConfig[session.status];
  const modeCfg = sessionModeConfig[session.mode];
  const StatusIcon = statusCfg.icon;
  const ModeIcon = modeCfg?.icon;
  const duration = formatSessionDuration(session);

  // Use prompt as session title, falling back to spec IDs or session ID
  const sessionTitle = session.prompt
    || (session.specIds?.length ? session.specIds.join(', ') : null)
    || session.id.slice(0, 8);

  const handleClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on a button or link inside the item
    if ((e.target as HTMLElement).closest('button, a')) return;
    navigate(`${basePath}/sessions/${session.id}`);
  };

  return (
    <div
      className="block border rounded-lg hover:bg-secondary/50 transition-colors bg-background cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex items-start">
        <div className="w-8 h-full invisible flex items-center text-muted-foreground" />
        <div className="flex-1 p-4 pl-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex-shrink-0">
                        <RunnerLogo runnerId={session.runner} size={32} />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {getRunnerDisplayName(session.runner, t)}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <h3 className="font-medium truncate">{sessionTitle}</h3>
              </div>
              {(session.specIds?.length ?? 0) > 0 && (
                <p className="text-sm text-muted-foreground truncate">
                  <Hash className="inline h-3 w-3 mr-0.5 -mt-px" />
                  {session.specIds.join(', ')}
                </p>
              )}
            </div>
            <div className="flex gap-2 items-center flex-shrink-0 flex-wrap justify-end">
              {/* Status badge */}
              <Badge
                variant="outline"
                className={cn(
                  'flex items-center gap-1.5 w-fit border-transparent h-5 px-2 py-0.5 text-xs font-medium',
                  statusCfg.className
                )}
              >
                <StatusIcon className="h-3.5 w-3.5" />
                {t(`sessions.status.${session.status}`)}
              </Badge>

              {/* Mode badge */}
              {modeCfg && (
                <Badge
                  variant="outline"
                  className="flex items-center gap-1.5 w-fit border-transparent h-5 px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground"
                >
                  {ModeIcon && <ModeIcon className="h-3.5 w-3.5" />}
                  {t(`sessions.modes.${session.mode}`)}
                </Badge>
              )}

              {/* Duration badge */}
              {duration && (
                <Badge
                  variant="outline"
                  className="flex items-center gap-1.5 w-fit border-transparent h-5 px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground"
                >
                  <Timer className="h-3.5 w-3.5" />
                  {duration}
                </Badge>
              )}

              {/* Action buttons */}
              {session.status === 'pending' && (
                <Button size="sm" variant="secondary" className="gap-1 h-6 text-xs px-2" onClick={() => void onStart(session.id)}>
                  <Play className="h-3 w-3" />
                  {t('sessions.actions.start')}
                </Button>
              )}
              {session.status === 'running' && (
                <>
                  <Button size="sm" variant="secondary" className="gap-1 h-6 text-xs px-2" onClick={() => void onPause(session.id)}>
                    <Pause className="h-3 w-3" />
                    {t('sessions.actions.pause')}
                  </Button>
                  <Button size="sm" variant="destructive" className="gap-1 h-6 text-xs px-2" onClick={() => void onStop(session.id)}>
                    <Square className="h-3 w-3" />
                    {t('sessions.actions.stop')}
                  </Button>
                </>
              )}
              {session.status === 'paused' && (
                <>
                  <Button size="sm" variant="secondary" className="gap-1 h-6 text-xs px-2" onClick={() => void onResume(session.id)}>
                    <Play className="h-3 w-3" />
                    {t('sessions.actions.resume')}
                  </Button>
                  <Button size="sm" variant="destructive" className="gap-1 h-6 text-xs px-2" onClick={() => void onStop(session.id)}>
                    <Square className="h-3 w-3" />
                    {t('sessions.actions.stop')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
