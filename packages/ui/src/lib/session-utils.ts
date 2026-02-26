import { Clock, PlayCircle, Pause, CheckCircle2, XCircle, Ban, Compass, Bot, type LucideIcon } from 'lucide-react';
import type { Session, SessionMode, SessionStatus } from '../types/api';

export interface SessionStatusConfig {
  icon: LucideIcon;
  label: string;
  labelKey: string;
  className: string;
  dotClassName: string;
}

/**
 * Session status badge configuration
 * Aligned with spec status badge pattern from badge-config.ts
 */
export const sessionStatusConfig: Record<SessionStatus, SessionStatusConfig> = {
  pending: {
    icon: Clock,
    label: 'Pending',
    labelKey: 'sessions.status.pending',
    className: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300',
    dotClassName: 'bg-slate-500',
  },
  running: {
    icon: PlayCircle,
    label: 'Running',
    labelKey: 'sessions.status.running',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    dotClassName: 'bg-green-500',
  },
  paused: {
    icon: Pause,
    label: 'Paused',
    labelKey: 'sessions.status.paused',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    dotClassName: 'bg-orange-500',
  },
  completed: {
    icon: CheckCircle2,
    label: 'Completed',
    labelKey: 'sessions.status.completed',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    dotClassName: 'bg-green-500',
  },
  failed: {
    icon: XCircle,
    label: 'Failed',
    labelKey: 'sessions.status.failed',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    dotClassName: 'bg-red-500',
  },
  cancelled: {
    icon: Ban,
    label: 'Cancelled',
    labelKey: 'sessions.status.cancelled',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
    dotClassName: 'bg-gray-500',
  },
};

export interface SessionModeConfig {
  icon: LucideIcon;
  label: string;
  labelKey: string;
}

export const sessionModeConfig: Record<SessionMode, SessionModeConfig> = {
  autonomous: {
    icon: Bot,
    label: 'Autonomous',
    labelKey: 'sessions.modes.autonomous',
  },
  guided: {
    icon: Compass,
    label: 'Guided',
    labelKey: 'sessions.modes.guided',
  },
  ralph: {
    icon: Bot,
    label: 'Ralph',
    labelKey: 'sessions.modes.ralph',
  },
};

// Legacy exports for backward compatibility
export const SESSION_STATUS_STYLES: Record<SessionStatus, string> = Object.fromEntries(
  Object.entries(sessionStatusConfig).map(([k, v]) => [k, v.className])
) as Record<SessionStatus, string>;

export const SESSION_STATUS_DOT_STYLES: Record<SessionStatus, string> = Object.fromEntries(
  Object.entries(sessionStatusConfig).map(([k, v]) => [k, v.dotClassName])
) as Record<SessionStatus, string>;

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

/**
 * Get translated runner display name, falling back to the raw runner ID
 * with the first letter capitalized.
 */
export function getRunnerDisplayName(runnerId: string, t: (key: string) => string): string {
  const key = `sessions.runners.${runnerId}`;
  const translated = t(key);
  // i18next returns the key itself when the translation is missing
  if (translated !== key) return translated;
  return runnerId.charAt(0).toUpperCase() + runnerId.slice(1);
}
