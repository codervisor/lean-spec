/**
 * Utility functions for date formatting
 */

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);

function isChineseLocale(locale?: string) {
  if (!locale) return false;
  return locale.toLowerCase().startsWith('zh');
}

function resolveDayjsLocale(locale?: string) {
  return isChineseLocale(locale) ? 'zh-cn' : 'en';
}

/**
 * Format a date as relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(
  date: Date | string | number | null | undefined,
  locale?: string
): string {
  if (!date) return isChineseLocale(locale) ? '未知' : 'Unknown';
  return dayjs(date).locale(resolveDayjsLocale(locale)).fromNow();
}

/**
 * Format a date in a readable format (e.g., "Nov 12, 2025")
 */
export function formatDate(
  date: Date | string | number | null | undefined,
  locale?: string
): string {
  if (!date) return isChineseLocale(locale) ? '未知' : 'Unknown';
  return dayjs(date).locale(resolveDayjsLocale(locale)).format('MMM D, YYYY');
}

/**
 * Format a date with time (e.g., "Nov 12, 2025 10:30 AM")
 */
export function formatDateTime(
  date: Date | string | number | null | undefined,
  locale?: string
): string {
  if (!date) return isChineseLocale(locale) ? '未知' : 'Unknown';
  return dayjs(date).locale(resolveDayjsLocale(locale)).format('MMM D, YYYY h:mm A');
}

/**
 * Format duration between two dates in a human-readable format
 */
export function formatDuration(
  start: Date | string | number | null | undefined,
  end: Date | string | number | null | undefined,
  locale?: string
): string {
  if (!start || !end) return '';

  const startDate = dayjs(start);
  const endDate = dayjs(end);
  const diffMs = endDate.diff(startDate);

  if (diffMs < 0) return '';

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const chinese = isChineseLocale(locale);

  const unitFormatters = chinese
    ? {
      minute: (value: number) => `${value} 分钟`,
      hour: (value: number) => `${value} 小时`,
      day: (value: number) => `${value} 天`,
      month: (value: number) => `${value} 个月`,
      year: (value: number) => `${value} 年`,
    }
    : {
      minute: (value: number) => `${value}m`,
      hour: (value: number) => `${value}h`,
      day: (value: number) => `${value}d`,
      month: (value: number) => `${value}mo`,
      year: (value: number) => `${value}y`,
    };

  const joinValues = (...parts: string[]) => parts.filter(Boolean).join(chinese ? ' ' : ' ');
  const lessThanMinute = chinese ? '小于 1 分钟' : '< 1m';

  if (days === 0 && hours === 0) {
    if (minutes === 0) return lessThanMinute;
    return unitFormatters.minute(minutes);
  }

  if (days === 0) {
    return unitFormatters.hour(hours);
  }

  if (days < 30) {
    return hours > 0
      ? joinValues(unitFormatters.day(days), unitFormatters.hour(hours))
      : unitFormatters.day(days);
  }

  const months = Math.floor(days / 30);
  const remainingDays = days % 30;

  if (months < 12) {
    return remainingDays > 0
      ? joinValues(unitFormatters.month(months), unitFormatters.day(remainingDays))
      : unitFormatters.month(months);
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return remainingMonths > 0
    ? joinValues(unitFormatters.year(years), unitFormatters.month(remainingMonths))
    : unitFormatters.year(years);
}
