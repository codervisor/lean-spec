import type { Session, SessionStatus } from '../types/api';

export const SESSION_STATUS_STYLES: Record<SessionStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  running: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  completed: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  failed: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  cancelled: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-300',
};

export const SESSION_STATUS_DOT_STYLES: Record<SessionStatus, string> = {
  pending: 'bg-muted-foreground/60',
  running: 'bg-emerald-500',
  paused: 'bg-amber-500',
  completed: 'bg-sky-500',
  failed: 'bg-rose-500',
  cancelled: 'bg-zinc-500',
};

const COST_PER_1K_TOKENS = 0.01;

export function getSessionDurationMs(session: Session, now = Date.now()): number | null {
  if (typeof session.durationMs === 'number') return session.durationMs;
  const startedAt = Date.parse(session.startedAt);
  if (Number.isNaN(startedAt)) return null;
  if (session.endedAt) {
    const endedAt = Date.parse(session.endedAt);
    return Number.isNaN(endedAt) ? null : Math.max(endedAt - startedAt, 0);
  }
  return Math.max(now - startedAt, 0);
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function formatSessionDuration(session: Session, now = Date.now()): string | null {
  const duration = getSessionDurationMs(session, now);
  return duration == null ? null : formatDuration(duration);
}

export function formatTokenCount(tokens?: number | null): string | null {
  if (!tokens && tokens !== 0) return null;
  return new Intl.NumberFormat().format(tokens);
}

export function estimateSessionCost(tokens?: number | null): number | null {
  if (!tokens && tokens !== 0) return null;
  return (tokens / 1000) * COST_PER_1K_TOKENS;
}
