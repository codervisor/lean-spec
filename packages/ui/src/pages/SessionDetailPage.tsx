import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { 
  AlertTriangle, ArrowLeft, Download, Copy, Play, Square, RotateCcw, Pause, 
  Terminal, Activity, Eye, EyeOff, Search, Clock, Cpu, Zap
} from 'lucide-react';
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
  const [respondingPermissionIds, setRespondingPermissionIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<Set<string>>(new Set());
  const [showHeartbeatLogs, setShowHeartbeatLogs] = useState(false);
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
      if (!showHeartbeatLogs && log.message.includes('Session still running')) return false;
      if (levelFilter.size > 0 && !levelFilter.has(log.level)) return false;
      if (normalizedQuery) {
        const haystack = `${log.level} ${log.message}`.toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }
      return true;
    });
  }, [levelFilter, logs, searchQuery, showHeartbeatLogs]);

  const filteredStreamEvents = useMemo(() => {
    if (!isAcp) return [];
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return streamEvents.filter((event) => {
      if (event.type === 'log' && !showHeartbeatLogs && event.message.includes('Session still running')) return false;

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
  }, [isAcp, levelFilter, searchQuery, streamEvents, showHeartbeatLogs]);

  const durationLabel = session ? formatSessionDuration(session) : null;
  const tokenLabel = session ? formatTokenCount(session.tokenCount) : null;
  const costEstimate = session ? estimateSessionCost(session.tokenCount) : null;

  const shortId = (id: string) => id.length > 12 ? id.slice(0, 8) : id;

  const formatEventLabel = (event: SessionEvent) => {
    const raw = event.eventType ?? (event as { event_type?: string }).event_type ?? '';
    return raw
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  const formatEventTimestamp = (ts: string) => {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? ts : d.toLocaleTimeString();
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

  const handleAcpResumeSession = async () => {
    if (!session) return;
    await api.startSession(session.id);
    await loadSession();
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

  const handlePermissionResponse = async (permissionId: string, option: string) => {
    if (!session) return;

    setRespondingPermissionIds((prev) => {
      const next = new Set(prev);
      next.add(permissionId);
      return next;
    });

    try {
      const updated = await api.respondToSessionPermission(session.id, permissionId, option);
      setSession(updated);
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : t('sessions.errors.load'));
    } finally {
      setRespondingPermissionIds((prev) => {
        const next = new Set(prev);
        next.delete(permissionId);
        return next;
      });
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

  const canResumeAcpCompletedSession =
    isAcp &&
    (session.status === 'completed' || session.status === 'failed' || session.status === 'cancelled');

  return (
    <PageTransition className="flex-1 min-w-0">
      <PageContainer
        className="h-[calc(100vh-3.5rem)]"
        contentClassName="flex h-full flex-col gap-4"
      >
        <PageHeader
          title={
            <div className="flex items-center gap-3">
              <span>{t('sessionDetail.title', { id: shortId(session.id) })}</span>
            </div>
          }
          description={
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className={cn('rounded-md border px-2 py-0.5 text-xs font-medium uppercase', SESSION_STATUS_STYLES[session.status])}>
                  {t(`sessions.status.${session.status}`)}
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  <Terminal className="h-3.5 w-3.5" />
                  {session.runner}
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  <Activity className="h-3.5 w-3.5" />
                  {isAcp ? t('sessions.labels.protocolAcp') : t('sessions.labels.protocolCli')} / {session.mode}
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  <Clock className="h-3.5 w-3.5" />
                  {durationLabel ?? '—'}
                </span>
                {tokenLabel && (
                  <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    <Cpu className="h-3.5 w-3.5" />
                    {tokenLabel}
                  </span>
                )}
                {costEstimate != null && (
                  <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    <Zap className="h-3.5 w-3.5" />
                    {t('sessions.labels.costApprox', { value: costEstimate.toFixed(2) })}
                  </span>
                )}
              </div>
              
              {eventsLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground" />
                  Loading...
                </div>
              ) : events.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground/80 mt-1">
                  {events.slice(-3).map((event) => (
                    <span key={event.id} className="inline-flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded">
                      <span className={cn(
                        'block h-1.5 w-1.5 rounded-full',
                        formatEventLabel(event).toLowerCase().includes('fail') || formatEventLabel(event).toLowerCase().includes('error')
                          ? 'bg-rose-500'
                          : formatEventLabel(event).toLowerCase().includes('complete')
                            ? 'bg-sky-500'
                            : formatEventLabel(event).toLowerCase().includes('start') || formatEventLabel(event).toLowerCase().includes('run')
                              ? 'bg-emerald-500'
                              : 'bg-muted-foreground/50'
                      )} />
                      <span>{formatEventLabel(event)}</span>
                      <span className="opacity-60">{formatEventTimestamp(event.timestamp)}</span>
                    </span>
                  ))}
                  {events.length > 3 && <span className="text-[10px] opacity-60">+{events.length - 3} more</span>}
                </div>
              )}
            </div>
          }
          actions={(
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 mr-2">
                {session.status === 'running' && (
                  <>
                    <Button size="sm" variant="secondary" className="gap-1.5 h-8" onClick={() => void handlePause()}>
                      <Pause className="h-3.5 w-3.5" />
                      {t('sessions.actions.pause')}
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1.5 h-8" onClick={() => void handleStop()}>
                      <Square className="h-3.5 w-3.5" />
                      {t('sessions.actions.stop')}
                    </Button>
                  </>
                )}
                {session.status === 'pending' && (
                  <Button size="sm" variant="secondary" className="gap-1.5 h-8" onClick={() => void handleStart()}>
                    <Play className="h-3.5 w-3.5" />
                    {t('sessions.actions.start')}
                  </Button>
                )}
                {session.status === 'paused' && (
                  <>
                    <Button size="sm" variant="secondary" className="gap-1.5 h-8" onClick={() => void handleResume()}>
                      <Play className="h-3.5 w-3.5" />
                      {t('sessions.actions.resume')}
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1.5 h-8" onClick={() => void handleStop()}>
                      <Square className="h-3.5 w-3.5" />
                      {t('sessions.actions.stop')}
                    </Button>
                  </>
                )}
                {canResumeAcpCompletedSession && (
                  <Button size="sm" variant="secondary" className="gap-1.5 h-8" onClick={() => void handleAcpResumeSession()}>
                    <Play className="h-3.5 w-3.5" />
                    {t('sessions.actions.resume')}
                  </Button>
                )}
                <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => void handleRestart()}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t('sessions.actions.restart')}
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 px-0" onClick={() => void handleCopyId()} title={t('sessions.actions.copyId')}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              
              <Link to={`${basePath}/sessions`}>
                <Button variant="ghost" size="sm" className="gap-2 h-8">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        />

        {session.prompt && (
          <div className="bg-muted/30 border rounded-md px-3 py-2 text-xs">
            <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-1 tracking-wider">{t('sessions.labels.prompt')}</div>
            <div className="text-foreground/90 line-clamp-2 hover:line-clamp-none transition-all">{session.prompt}</div>
          </div>
        )}

        {(archivePath || archiveError) && (
          <div className={cn("rounded-md border px-3 py-2 text-xs", archiveError ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400")}>
            {archivePath && t('sessionDetail.archiveSuccess', { path: archivePath })}
            {archiveError && archiveError}
          </div>
        )}

        <div className="flex-1 min-h-0 flex flex-col border rounded-md bg-background shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-2 border-b bg-muted/5 gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
               <div className="relative flex-1 max-w-sm">
                 <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                 <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t('sessionDetail.filters.search')}
                  className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
               </div>
               
               <div className="h-4 w-px bg-border mx-1" />

               <div className="flex items-center gap-1">
                 {availableLevels.map((level) => (
                    <button
                      key={level}
                      onClick={() => handleToggleLevel(level)}
                      className={cn(
                        'rounded-md px-2 py-1 text-[10px] font-medium uppercase transition-colors border',
                        levelFilter.has(level)
                          ? 'border-primary/50 bg-primary/10 text-primary'
                          : 'border-transparent text-muted-foreground hover:bg-muted'
                      )}
                    >
                      {isAcp ? t(`sessionDetail.filters.acp.${level}`) : level}
                    </button>
                  ))}
               </div>
            </div>

            <div className="flex items-center gap-1">
               <Button
                  size="sm"
                  variant="ghost"
                  className={cn("h-7 w-7 p-0", showHeartbeatLogs ? "text-primary bg-primary/10" : "text-muted-foreground")}
                  onClick={() => setShowHeartbeatLogs(!showHeartbeatLogs)}
                  title={showHeartbeatLogs ? "Hide system logs" : "Show system logs"}
                >
                  {showHeartbeatLogs ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </Button>
            
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className={cn("h-7 w-7 p-0", autoScroll ? "text-primary" : "text-muted-foreground")}
                  onClick={() => setAutoScroll((prev) => !prev)}
                  title={t('sessionDetail.filters.autoScroll')}
                >
                  <ArrowLeft className={cn("h-3.5 w-3.5 -rotate-90 transition-transform", !autoScroll && "rotate-90")} />
                </Button>
                
                <div className="h-4 w-px bg-border mx-1" />

                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleArchive} disabled={archiveLoading} title={t('sessions.actions.archive')}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleExport} title={t('sessions.actions.export')}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
            </div>
          </div>

          <div className="flex-1 min-h-0 relative">
             {isAcp ? (
                <div className="absolute inset-0 overflow-hidden">
                  <AcpConversation
                    events={filteredStreamEvents}
                    loading={logsLoading}
                    emptyTitle={t('sessions.emptyLogs')}
                    emptyDescription={t('sessionDetail.logsDescription')}
                    onPermissionResponse={(permissionId, option) => {
                      void handlePermissionResponse(permissionId, option);
                    }}
                    isPermissionResponding={(permissionId) => respondingPermissionIds.has(permissionId)}
                  />
                </div>
              ) : (
                <div ref={logRef} className="absolute inset-0 overflow-y-auto p-3 font-mono text-xs">
                  {logsLoading ? (
                    <div className="text-muted-foreground p-4">{t('actions.loading')}</div>
                  ) : filteredLogs.length === 0 ? (
                    <div className="text-muted-foreground p-4 text-center">{t('sessions.emptyLogs')}</div>
                  ) : (
                    filteredLogs.map((log) => {
                       const isJson = log.message.trim().startsWith('{') || log.message.trim().startsWith('[');
                       return (
                        <div key={`${log.id}-${log.timestamp}`} className="mb-0.5 group hover:bg-muted/30 -mx-3 px-3 py-0.5 flex gap-2 items-start">
                          <span className="text-muted-foreground/50 whitespace-nowrap select-none w-20 shrink-0 text-[10px] pt-0.5 text-right font-light">
                             {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}.
                             <span className="opacity-50">{new Date(log.timestamp).getMilliseconds().toString().padStart(3, '0')}</span>
                          </span>
                          <span className={cn("uppercase text-[10px] font-bold w-12 shrink-0 pt-0.5 select-none", 
                             log.level === 'error' ? "text-rose-500" : 
                             log.level === 'warn' ? "text-amber-500" : 
                             "text-muted-foreground"
                          )}>{log.level}</span>
                          <div className={cn("flex-1 min-w-0 break-all whitespace-pre-wrap", isJson && "text-emerald-600 dark:text-emerald-400")}>
                             {log.message}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
          </div>
        </div>
      </PageContainer>
    </PageTransition>
  );
}
