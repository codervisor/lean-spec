import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, cn } from '@leanspec/ui-components';
import { Play, Square, Terminal, Plus, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import type { Session, SessionLog, SessionMode, SessionStatus } from '../../types/api';
import { useTranslation } from 'react-i18next';

const STATUS_STYLES: Record<SessionStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  running: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  completed: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  failed: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  cancelled: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-300',
};

const MODES: SessionMode[] = ['guided', 'autonomous', 'ralph'];

interface SessionPanelProps {
  specId: string;
  projectPath?: string | null;
}

export function SessionPanel({ specId, projectPath }: SessionPanelProps) {
  const { t } = useTranslation('common');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tools, setTools] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const [tool, setTool] = useState('claude');
  const [mode, setMode] = useState<SessionMode>('autonomous');

  const canCreate = Boolean(projectPath);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listSessions({ specId });
      setSessions(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('sessions.errors.load'));
    } finally {
      setLoading(false);
    }
  }, [specId, t]);

  const loadTools = useCallback(async () => {
    try {
      const available = await api.listAvailableTools();
      setTools(available.length ? available : ['claude', 'copilot', 'codex', 'opencode']);
    } catch {
      setTools(['claude', 'copilot', 'codex', 'opencode']);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
    void loadTools();
  }, [loadSessions, loadTools]);

  const statusLabel = useCallback(
    (status: SessionStatus) => t(`sessions.status.${status}`),
    [t]
  );

  const formatTime = useCallback((iso: string | null | undefined) => {
    if (!iso) return t('sessions.labels.unknownTime');
    return new Date(iso).toLocaleString();
  }, [t]);

  const runCreate = useCallback(async () => {
    if (!projectPath) return;
    setCreating(true);
    try {
      const created = await api.createSession({
        projectPath,
        specId,
        tool,
        mode,
      });
      await api.startSession(created.id);
      await loadSessions();
      setCreateOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('sessions.errors.create'));
    } finally {
      setCreating(false);
    }
  }, [projectPath, specId, tool, mode, loadSessions, t]);

  const handleStart = useCallback(async (sessionId: string) => {
    await api.startSession(sessionId);
    await loadSessions();
  }, [loadSessions]);

  const handleStop = useCallback(async (sessionId: string) => {
    await api.stopSession(sessionId);
    await loadSessions();
  }, [loadSessions]);

  const handleViewLogs = useCallback(async (session: Session) => {
    setSelectedSession(session);
    setLogsOpen(true);
    setLogsLoading(true);
    try {
      const data = await api.getSessionLogs(session.id);
      setLogs(data);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!logsOpen || !selectedSession || selectedSession.status !== 'running') return;

    const base = import.meta.env.VITE_API_URL || window.location.origin;
    const wsUrl = base.replace(/^http/, 'ws') + `/api/sessions/${selectedSession.id}/stream`;
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
  }, [logsOpen, selectedSession]);

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()),
    [sessions]
  );

  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{t('sessions.title')}</h2>
          <p className="text-xs text-muted-foreground">{t('sessions.subtitle')}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setCreateOpen(true)}
          disabled={!canCreate}
          title={!canCreate ? t('sessions.errors.noProjectPath') : undefined}
        >
          <Plus className="h-4 w-4" />
          {t('sessions.actions.new')}
        </Button>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('actions.loading')}
          </div>
        ) : sortedSessions.length === 0 ? (
          <div className="text-xs text-muted-foreground">{t('sessions.empty')}</div>
        ) : (
          sortedSessions.map((session) => (
            <div key={session.id} className="rounded-lg border border-border/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {session.tool}
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', STATUS_STYLES[session.status])}>
                      {statusLabel(session.status)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {t('sessions.labels.mode')}: {session.mode} • {t('sessions.labels.started')}: {formatTime(session.startedAt)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => void handleViewLogs(session)}>
                    <Terminal className="h-3.5 w-3.5" />
                    {t('sessions.actions.logs')}
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="w-[min(520px,90vw)]">
          <DialogHeader>
            <DialogTitle>{t('sessions.dialogs.createTitle')}</DialogTitle>
            <DialogDescription>{t('sessions.dialogs.createDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t('sessions.labels.tool')}</label>
              <select
                value={tool}
                onChange={(e) => setTool(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {tools.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t('sessions.labels.mode')}</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as SessionMode)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {MODES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>
              {t('actions.cancel')}
            </Button>
            <Button size="sm" onClick={() => void runCreate()} disabled={!canCreate || creating}>
              {creating ? t('actions.loading') : t('sessions.actions.run')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent className="w-[min(900px,90vw)] max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t('sessions.dialogs.logsTitle')}</DialogTitle>
            <DialogDescription>
              {selectedSession ? `${selectedSession.tool} • ${statusLabel(selectedSession.status)}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs font-mono h-[50vh] overflow-y-auto whitespace-pre-wrap">
            {logsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('actions.loading')}
              </div>
            ) : logs.length === 0 ? (
              <div className="text-muted-foreground">{t('sessions.emptyLogs')}</div>
            ) : (
              logs.map((log) => (
                <div key={`${log.id}-${log.timestamp}`} className="mb-1">
                  <span className="text-muted-foreground">[{log.timestamp}]</span>{' '}
                  <span className="uppercase text-[10px]">{log.level}</span>{' '}
                  {log.message}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
