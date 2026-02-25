import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Download, Copy, Play, Square, RotateCcw, Pause } from 'lucide-react';
import { Button, Card, CardContent, cn } from '@/library';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import type { Session, SessionEvent, SessionLog, SessionStreamEvent } from '../types/api';
import { useCurrentProject } from '../hooks/useProjectQuery';
import { EmptyState } from '../components/shared/empty-state';
import { PageHeader } from '../components/shared/page-header';
import { PageTransition } from '../components/shared/page-transition';
import { PageContainer } from '../components/shared/page-container';
import { AcpConversation } from '../components/sessions/acp-conversation';
import {
  SESSION_STATUS_STYLES,
  estimateSessionCost,
  formatSessionDuration,
  formatTokenCount,
} from '../lib/session-utils';
import {
  appendStreamEvent,
  getAcpFilterType,
  isAcpSession,
  parseSessionLog,
  parseStreamEventPayload,
  type AcpFilterType,
} from '../lib/session-stream';

export function SessionDetailPage() {
  const { t } = useTranslation('common');
  const { sessionId, projectId } = useParams<{ sessionId: string; projectId: string }>();
  const navigate = useNavigate();
  const { currentProject, loading: projectLoading } = useCurrentProject();
  const resolvedProjectId = projectId ?? currentProject?.id;
  const basePath = resolvedProjectId ? `/projects/${resolvedProjectId}` : '/projects';
  const projectReady = !projectId || currentProject?.id === projectId;

  const [session, setSession] = useState<Session | null>(null);
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [streamEvents, setStreamEvents] = useState<SessionStreamEvent[]>([]);
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archivePath, setArchivePath] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<Set<string>>(new Set());
  const [autoScroll, setAutoScroll] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);

  const loadSession = useCallback(async () => {
    if (!sessionId || !projectReady || projectLoading) return;
    setLoading(true);
    try {
      const data = await api.getSession(sessionId);
      setSession(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('sessions.errors.load'));
    } finally {
      setLoading(false);
    }
  }, [projectLoading, projectReady, sessionId, t]);

  const loadLogs = useCallback(async () => {
    if (!sessionId || !projectReady || projectLoading) return;
    setLogsLoading(true);
    try {
      const data = await api.getSessionLogs(sessionId);
      setLogs(data);
      const nextStreamEvents = data
        .slice()
        .reverse()
        .reduce<SessionStreamEvent[]>((acc, log) => appendStreamEvent(acc, parseSessionLog(log)), []);
      setStreamEvents(nextStreamEvents);
    } finally {
      setLogsLoading(false);
    }
  }, [projectLoading, projectReady, sessionId]);

  const loadEvents = useCallback(async () => {
    if (!sessionId || !projectReady || projectLoading) return;
    setEventsLoading(true);
    try {
      const data = await api.getSessionEvents(sessionId);
      setEvents(data);
    } finally {
      setEventsLoading(false);
    }
  }, [projectLoading, projectReady, sessionId]);

  useEffect(() => {
    void loadSession();
    void loadLogs();
    void loadEvents();
  }, [loadSession, loadLogs, loadEvents]);

  useEffect(() => {
    if (!session || session.status !== 'running') return;

    const base = import.meta.env.VITE_API_URL || window.location.origin;
    const wsUrl = base.replace(/^http/, 'ws') + `/api/sessions/${session.id}/stream`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const streamEvent = parseStreamEventPayload(payload);
        if (streamEvent) {
          setStreamEvents((prev) => appendStreamEvent(prev, streamEvent));
          if (streamEvent.type === 'log') {
            setLogs((prev) => [
              ...prev,
              {
                id: Date.now(),
                timestamp: streamEvent.timestamp,
                level: streamEvent.level,
                message: streamEvent.message,
              },
            ]);
          }
        }
      } catch {
        // ignore malformed
      }
    };

    return () => ws.close();
  }, [session]);

  useEffect(() => {
    if (!autoScroll) return;
    const container = logRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [autoScroll, logs]);

  const isAcp = isAcpSession(session);

  const availableLevels = useMemo(() => {
    if (!isAcp) {
      return Array.from(new Set(logs.map((log) => log.level))).sort();
    }
    const filters: AcpFilterType[] = ['messages', 'thoughts', 'tools', 'plan'];
    return filters.filter((filter) => streamEvents.some((event) => getAcpFilterType(event) === filter));
  }, [isAcp, logs, streamEvents]);

  const filteredLogs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return logs.filter((log) => {
      if (levelFilter.size > 0 && !levelFilter.has(log.level)) return false;
      if (normalizedQuery) {
        const haystack = `${log.level} ${log.message}`.toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }
      return true;
    });
  }, [levelFilter, logs, searchQuery]);

  const filteredStreamEvents = useMemo(() => {
    if (!isAcp) return [];
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return streamEvents.filter((event) => {
      const category = getAcpFilterType(event);
      if (levelFilter.size > 0) {
        if (!category || !levelFilter.has(category)) return false;
      }

      if (!normalizedQuery) return true;

      if (event.type === 'acp_message') {
        return event.content.toLowerCase().includes(normalizedQuery);
      }
      if (event.type === 'acp_thought') {
        return event.content.toLowerCase().includes(normalizedQuery);
      }
      if (event.type === 'acp_tool_call') {
        return `${event.tool} ${JSON.stringify(event.args)} ${JSON.stringify(event.result ?? '')}`
          .toLowerCase()
          .includes(normalizedQuery);
      }
      if (event.type === 'acp_plan') {
        return event.entries.some((entry) => entry.title.toLowerCase().includes(normalizedQuery));
      }
      return false;
    });
  }, [isAcp, levelFilter, searchQuery, streamEvents]);

  const durationLabel = session ? formatSessionDuration(session) : null;
  const tokenLabel = session ? formatTokenCount(session.tokenCount) : null;
  const costEstimate = session ? estimateSessionCost(session.tokenCount) : null;

  const formatEventLabel = (event: SessionEvent) => {
    const raw = event.eventType ?? (event as { event_type?: string }).event_type ?? '';
    return raw
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  const handleToggleLevel = (level: string) => {
    setLevelFilter((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  };

  const handleStart = async () => {
    if (!session) return;
    await api.startSession(session.id);
    await loadSession();
  };

  const handleStop = async () => {
    if (!session) return;
    await api.stopSession(session.id);
    await loadSession();
  };

  const handlePause = async () => {
    if (!session) return;
    await api.pauseSession(session.id);
    await loadSession();
  };

  const handleResume = async () => {
    if (!session) return;
    await api.resumeSession(session.id);
    await loadSession();
  };

  const handleRestart = async () => {
    if (!session || !currentProject?.path) return;
    const created = await api.createSession({
      projectPath: currentProject.path,
      specIds: session.specIds ?? [],
      runner: session.runner,
      mode: session.mode,
    });
    await api.startSession(created.id);
    navigate(`${basePath}/sessions/${created.id}`);
  };

  const handleExport = () => {
    const exportPayload = isAcp
      ? JSON.stringify(filteredStreamEvents, null, 2)
      : filteredLogs.map((log) => `[${log.timestamp}] ${log.level.toUpperCase()} ${log.message}`).join('\n');
    const blob = new Blob([exportPayload], {
      type: isAcp ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `session-${sessionId ?? t('sessions.export.fallbackName')}.${isAcp ? 'json' : 'txt'}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleCopyId = async () => {
    if (!session?.id) return;
    await navigator.clipboard.writeText(session.id);
  };

  const handleArchive = async () => {
    if (!session) return;
    setArchiveLoading(true);
    setArchiveError(null);
    try {
      const result = await api.archiveSession(session.id, { compress: true });
      setArchivePath(result.path);
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : t('sessionDetail.archiveError'));
    } finally {
      setArchiveLoading(false);
    }
  };

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

  if (error || !session) {
    return (
      <PageContainer>
        <EmptyState
          icon={AlertTriangle}
          title={t('sessionDetail.state.notFoundTitle')}
          description={error || t('sessionDetail.state.notFoundDescription')}
          tone="error"
          actions={(
            <Link to={`${basePath}/sessions`} className="inline-flex">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                {t('sessions.actions.back')}
              </Button>
            </Link>
          )}
        />
      </PageContainer>
    );
  }

  return (
    <PageTransition className="flex-1 min-w-0">
      <PageContainer
        className="h-[calc(100vh-3.5rem)]"
        contentClassName="flex h-full flex-col gap-4"
      >
        <PageHeader
          title={t('sessionDetail.title', { id: session.id })}
          description={t('sessionDetail.description')}
          actions={(
            <Link to={`${basePath}/sessions`} className="inline-flex">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                {t('sessions.actions.back')}
              </Button>
            </Link>
          )}
        />

        <Card className="border-border/60">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  {session.runner}
                  <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    {isAcp ? t('sessions.labels.protocolAcp') : t('sessions.labels.protocolCli')}
                  </span>
                  <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', SESSION_STATUS_STYLES[session.status])}>
                    {t(`sessions.status.${session.status}`)}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {t('sessions.labels.mode')}: {session.mode}
                  {(session.specIds?.length ?? 0) > 0 ? ` • ${t('sessions.labels.spec')}: ${session.specIds.join(', ')}` : ''}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {session.status === 'running' && (
                  <>
                    <Button size="sm" variant="secondary" className="gap-1" onClick={() => void handlePause()}>
                      <Pause className="h-3.5 w-3.5" />
                      {t('sessions.actions.pause')}
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1" onClick={() => void handleStop()}>
                      <Square className="h-3.5 w-3.5" />
                      {t('sessions.actions.stop')}
                    </Button>
                  </>
                )}
                {session.status === 'pending' && (
                  <Button size="sm" variant="secondary" className="gap-1" onClick={() => void handleStart()}>
                    <Play className="h-3.5 w-3.5" />
                    {t('sessions.actions.start')}
                  </Button>
                )}
                {session.status === 'paused' && (
                  <>
                    <Button size="sm" variant="secondary" className="gap-1" onClick={() => void handleResume()}>
                      <Play className="h-3.5 w-3.5" />
                      {t('sessions.actions.resume')}
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1" onClick={() => void handleStop()}>
                      <Square className="h-3.5 w-3.5" />
                      {t('sessions.actions.stop')}
                    </Button>
                  </>
                )}
                <Button size="sm" variant="outline" className="gap-1" onClick={() => void handleRestart()}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t('sessions.actions.restart')}
                </Button>
                <Button size="sm" variant="ghost" className="gap-1" onClick={() => void handleCopyId()}>
                  <Copy className="h-3.5 w-3.5" />
                  {t('sessions.actions.copyId')}
                </Button>
                {(session.specIds?.length ?? 0) > 0 && (
                  <Link to={`${basePath}/specs/${session.specIds[0]}`} className="inline-flex">
                    <Button size="sm" variant="ghost" className="gap-1">
                      {t('sessions.actions.viewSpec')}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
            <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="text-[11px] uppercase">{t('sessions.labels.started')}</div>
                <div>{new Date(session.startedAt).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase">{t('sessions.labels.ended')}</div>
                <div>{session.endedAt ? new Date(session.endedAt).toLocaleString() : t('sessions.labels.unknownTime')}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase">{t('sessions.labels.duration')}</div>
                <div>{durationLabel ?? t('sessions.labels.unknownTime')}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase">{t('sessions.labels.tokens')}</div>
                <div>{tokenLabel ?? t('sessions.labels.unknownTime')}</div>
              </div>
            </div>
            {session.prompt && (
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
                <div className="text-[11px] uppercase text-muted-foreground mb-1">{t('sessions.labels.prompt')}</div>
                <div className="text-foreground">{session.prompt}</div>
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              {t('sessions.labels.cost')}: {costEstimate == null ? t('sessions.labels.costUnknown') : t('sessions.labels.costApprox', { value: costEstimate.toFixed(2) })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4 space-y-3">
            <div>
              <div className="text-sm font-semibold">{t('sessionDetail.eventsTitle')}</div>
              <p className="text-xs text-muted-foreground">{t('sessionDetail.eventsDescription')}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
              {eventsLoading ? (
                <div className="text-muted-foreground">{t('actions.loading')}</div>
              ) : events.length === 0 ? (
                <div className="text-muted-foreground">{t('sessionDetail.eventsEmpty')}</div>
              ) : (
                <div className="space-y-2">
                  {events.map((event) => (
                    <div key={event.id} className="flex flex-wrap items-center gap-2">
                      <span className="text-muted-foreground">[{event.timestamp}]</span>
                      <span className="font-semibold">{formatEventLabel(event)}</span>
                      {event.data ? (
                        <span className="text-muted-foreground">{event.data}</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 flex-1 min-h-0">
          <CardContent className="p-4 space-y-3 h-full flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">{t('sessionDetail.logsTitle')}</div>
                <p className="text-xs text-muted-foreground">{t('sessionDetail.logsDescription')}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" className="gap-1" onClick={handleArchive} disabled={archiveLoading}>
                  <Download className="h-3.5 w-3.5" />
                  {archiveLoading ? t('actions.loading') : t('sessions.actions.archive')}
                </Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={handleExport}>
                  <Download className="h-3.5 w-3.5" />
                  {t('sessions.actions.export')}
                </Button>
                <Button size="sm" variant={autoScroll ? 'secondary' : 'outline'} onClick={() => setAutoScroll((prev) => !prev)}>
                  {t('sessionDetail.filters.autoScroll')}
                </Button>
              </div>
            </div>

            {(archivePath || archiveError) && (
              <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
                {archivePath && (
                  <div className="text-muted-foreground">{t('sessionDetail.archiveSuccess', { path: archivePath })}</div>
                )}
                {archiveError && (
                  <div className="text-destructive">{archiveError}</div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('sessionDetail.filters.search')}
                className="h-8 rounded-md border border-border bg-background px-3 text-xs"
              />
              <div className="flex flex-wrap items-center gap-1 text-xs">
                {availableLevels.map((level) => (
                  <button
                    key={level}
                    onClick={() => handleToggleLevel(level)}
                    className={cn(
                      'rounded-full border px-2 py-1 transition-colors',
                      levelFilter.has(level)
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {isAcp ? t(`sessionDetail.filters.acp.${level}`) : level.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {isAcp ? (
              <div className="h-full min-h-0">
                <AcpConversation
                  events={filteredStreamEvents}
                  loading={logsLoading}
                  emptyTitle={t('sessions.emptyLogs')}
                  emptyDescription={t('sessionDetail.logsDescription')}
                />
              </div>
            ) : (
              <div ref={logRef} className="rounded-lg border border-border bg-muted/30 p-3 text-xs font-mono h-full overflow-y-auto whitespace-pre-wrap">
                {logsLoading ? (
                  <div className="text-muted-foreground">{t('actions.loading')}</div>
                ) : filteredLogs.length === 0 ? (
                  <div className="text-muted-foreground">{t('sessions.emptyLogs')}</div>
                ) : (
                  filteredLogs.map((log) => (
                    <div key={`${log.id}-${log.timestamp}`} className="mb-1">
                      <span className="text-muted-foreground">[{log.timestamp}]</span>{' '}
                      <span className="uppercase text-[10px]">{log.level}</span>{' '}
                      <span>{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </PageContainer>
    </PageTransition>
  );
}
