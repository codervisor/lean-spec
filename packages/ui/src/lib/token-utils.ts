import type { TokenStatus } from '../types/api';

export const TOKEN_THRESHOLDS = {
  optimal: 2000,
  good: 3500,
  warning: 5000,
};

export const tokenStatusClasses: Record<TokenStatus, string> = {
  optimal: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  good: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  warning: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export const tokenProgressClasses: Record<TokenStatus, string> = {
  optimal: 'bg-green-500',
  good: 'bg-blue-500',
  warning: 'bg-orange-500',
  critical: 'bg-red-500',
};

export function resolveTokenStatus(count: number): TokenStatus {
  if (count < TOKEN_THRESHOLDS.optimal) return 'optimal';
  if (count < TOKEN_THRESHOLDS.good) return 'good';
  if (count < TOKEN_THRESHOLDS.warning) return 'warning';
  return 'critical';
}

export function formatCompactTokenCount(count: number): string {
  if (count < 1000) return String(count);
  const decimal = count >= 10000 ? 0 : 1;
  return `${(count / 1000).toFixed(decimal)}k`;
}

export function formatFullTokenCount(count: number): string {
  return new Intl.NumberFormat().format(count);
}

export function getTokenProgressPercent(current: number, max = TOKEN_THRESHOLDS.warning): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (current / max) * 100));
}

export function getNextTokenThreshold(status: TokenStatus): number | null {
  switch (status) {
    case 'optimal':
      return TOKEN_THRESHOLDS.good;
    case 'good':
      return TOKEN_THRESHOLDS.warning;
    case 'warning':
      return TOKEN_THRESHOLDS.warning;
    case 'critical':
    default:
      return null;
  }
}

export function getTokenStatusLabelKey(status: TokenStatus): string {
  return `tokens.status.${status}`;
}
