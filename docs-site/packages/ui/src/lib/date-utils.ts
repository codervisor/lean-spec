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

/**
 * Format duration between two dates in a human-readable format
 */
export function formatDuration(
  start: Date | string | number | null | undefined,
  end: Date | string | number | null | undefined
): string {
  if (!start || !end) return '';
  
  const startDate = dayjs(start);
  const endDate = dayjs(end);
  const diffMs = endDate.diff(startDate);
  
  if (diffMs < 0) return '';
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days === 0 && hours === 0) {
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (minutes === 0) return '< 1m';
    return `${minutes}m`;
  }
  
  if (days === 0) {
    return `${hours}h`;
  }
  
  if (days < 30) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  
  const months = Math.floor(days / 30);
  const remainingDays = days % 30;
  
  if (months < 12) {
    return remainingDays > 0 ? `${months}mo ${remainingDays}d` : `${months}mo`;
  }
  
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return remainingMonths > 0 ? `${years}y ${remainingMonths}mo` : `${years}y`;
}
