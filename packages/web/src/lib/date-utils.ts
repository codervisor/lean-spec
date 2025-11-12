/**
 * Utility functions for date formatting
 */

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

/**
 * Format a date as relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(date: Date | string | number | null | undefined): string {
  if (!date) return 'Unknown';
  return dayjs(date).fromNow();
}

/**
 * Format a date in a readable format (e.g., "Nov 12, 2025")
 */
export function formatDate(date: Date | string | number | null | undefined): string {
  if (!date) return 'Unknown';
  return dayjs(date).format('MMM D, YYYY');
}

/**
 * Format a date with time (e.g., "Nov 12, 2025 10:30 AM")
 */
export function formatDateTime(date: Date | string | number | null | undefined): string {
  if (!date) return 'Unknown';
  return dayjs(date).format('MMM D, YYYY h:mm A');
}
