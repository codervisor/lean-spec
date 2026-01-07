import { getBackend, APIError } from "./backend-adapter";

// API client utilities and adapter exports
export function parseDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function estimateTokenCount(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words * 1.15));
}

export function extractSpecNumber(name: string): number | null {
  const match = name.match(/^(\d+)-/);
  return match ? parseInt(match[1], 10) : null;
}

export function calculateCompletionRate(byStatus: Record<string, number>): number {
  const total = Object.values(byStatus || {}).reduce((sum, count) => sum + count, 0);
  const complete = byStatus?.complete || 0;
  return total > 0 ? (complete / total) * 100 : 0;
}

export const api = getBackend();

export { APIError };