import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Download, Copy, Play, Square, RotateCcw, Pause } from 'lucide-react';
import { Button, Card, CardContent, cn } from '@leanspec/ui-components';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import type { Session, SessionEvent, SessionLog } from '../types/api';
import { useLayout, useProject } from '../contexts';
import { EmptyState } from '../components/shared/EmptyState';
import { PageHeader } from '../components/shared/PageHeader';
import { PageTransition } from '../components/shared/PageTransition';
import {
  SESSION_STATUS_STYLES,
  estimateSessionCost,
  formatSessionDuration,
  formatTokenCount,
} from '../lib/session-utils';

export function SessionDetailPage() {
  const { t } = useTranslation('common');
  const { sessionId, projectId } = useParams<{ sessionId: string; projectId: string }>();
  const navigate = useNavigate();
  const { currentProject, loading: projectLoading } = useProject();
  const resolvedProjectId = projectId ?? currentProject?.id;
  const basePath = resolvedProjectId ? `/projects/${resolvedProjectId}` : '/projects';
  const { isWideMode } = useLayout();
  const projectReady = !projectId || currentProject?.id === projectId;

  const [session, setSession] = useState<Session | null>(null);
  const [logs, setLogs] = useState<SessionLog[]>([]);
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
        if (payload.type === 'log') {
          setLogs((prev) => [
            ...prev,
            {
              id: Date.now(),
              timestamp: payload.timestamp,
              level: payload.level,
              message: payload.message,
            },
          ]);
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

  const availableLevels = useMemo(() => {
    return Array.from(new Set(logs.map((log) => log.level))).sort();
  }, [logs]);

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
      specId: session.specId ?? null,
      tool: session.tool,
      mode: session.mode,
    });
    await api.startSession(created.id);
    navigate(`${basePath}/sessions/${created.id}`);
  };

  const handleExport = () => {
    const lines = filteredLogs.map((log) => `[${log.timestamp}] ${log.level.toUpperCase()} ${log.message}`).join('\n');
    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `session-${sessionId ?? 'logs'}.txt`;
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
      <div className="p-4 sm:p-6">
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t('actions.loading')}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !session) {
    return (
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
    );
  }

  return (
    <PageTransition className="flex-1 min-w-0">
      <div className={cn('h-[calc(100vh-3.5rem)] flex flex-col gap-4 p-4 sm:p-6 mx-auto w-full', isWideMode ? 'max-w-full' : 'max-w-6xl')}>
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
                  {session.tool}
                  <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', SESSION_STATUS_STYLES[session.status])}>
                    {t(`sessions.status.${session.status}`)}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {t('sessions.labels.mode')}: {session.mode}
                  {session.specId ? ` • ${t('sessions.labels.spec')}: ${session.specId}` : ''}
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
                {session.specId && (
                  <Link to={`${basePath}/specs/${session.specId}`} className="inline-flex">
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
                    {level.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

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
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
