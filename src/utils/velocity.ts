import dayjs from 'dayjs';
import type { SpecInfo } from '../spec-loader.js';

/**
 * Velocity metrics for measuring SDD effectiveness
 */
export interface VelocityMetrics {
  cycleTime: {
    average: number; // Average days from created to completed
    median: number;
    p90: number; // 90th percentile
  };
  leadTime: {
    plannedToInProgress: number; // Average days in planned
    inProgressToComplete: number; // Average days in progress
  };
  throughput: {
    perWeek: number;
    perMonth: number;
    trend: 'up' | 'down' | 'stable';
  };
  wip: {
    current: number; // Current work in progress
    average: number; // Average WIP over time
  };
}

/**
 * Calculate cycle time (created → completed) in days
 */
export function calculateCycleTime(spec: SpecInfo): number | null {
  if (spec.frontmatter.status !== 'complete' && spec.frontmatter.status !== 'archived') {
    return null;
  }

  const createdAt = spec.frontmatter.created_at || spec.frontmatter.created;
  const completedAt = spec.frontmatter.completed_at || spec.frontmatter.completed;

  if (!createdAt || !completedAt) {
    return null;
  }

  const created = dayjs(createdAt);
  const completed = dayjs(completedAt);

  return completed.diff(created, 'day', true);
}

/**
 * Calculate lead time for a specific stage
 */
export function calculateLeadTime(
  spec: SpecInfo,
  fromStatus: string,
  toStatus: string
): number | null {
  const transitions = spec.frontmatter.transitions;
  if (!transitions || !Array.isArray(transitions)) {
    return null;
  }

  const fromTransition = transitions.find((t) => t.status === fromStatus);
  const toTransition = transitions.find((t) => t.status === toStatus);

  if (!fromTransition || !toTransition) {
    return null;
  }

  const from = dayjs(fromTransition.at);
  const to = dayjs(toTransition.at);

  return to.diff(from, 'day', true);
}

/**
 * Calculate throughput (completed specs in a time period)
 */
export function calculateThroughput(specs: SpecInfo[], days: number): number {
  const cutoff = dayjs().subtract(days, 'day');

  return specs.filter((s) => {
    if (s.frontmatter.status !== 'complete' && s.frontmatter.status !== 'archived') {
      return false;
    }

    const completedAt = s.frontmatter.completed_at || s.frontmatter.completed;
    if (!completedAt) {
      return false;
    }

    return dayjs(completedAt).isAfter(cutoff);
  }).length;
}

/**
 * Calculate work in progress at a specific point in time
 */
export function calculateWIP(specs: SpecInfo[], date: dayjs.Dayjs = dayjs()): number {
  return specs.filter((s) => {
    const createdAt = s.frontmatter.created_at || s.frontmatter.created;
    const created = dayjs(createdAt);

    // Must be created before the target date
    if (created.isAfter(date)) {
      return false;
    }

    // Check if completed after the target date (or not completed)
    const completedAt = s.frontmatter.completed_at || s.frontmatter.completed;
    if (completedAt) {
      const completed = dayjs(completedAt);
      return completed.isAfter(date);
    }

    // Not completed yet - check if still active
    return s.frontmatter.status !== 'complete' && s.frontmatter.status !== 'archived';
  }).length;
}

/**
 * Calculate comprehensive velocity metrics
 */
export function calculateVelocityMetrics(specs: SpecInfo[]): VelocityMetrics {
  // Calculate cycle times for completed specs
  const cycleTimes = specs
    .map((s) => calculateCycleTime(s))
    .filter((t): t is number => t !== null)
    .sort((a, b) => a - b);

  const averageCycleTime = cycleTimes.length > 0
    ? cycleTimes.reduce((sum, t) => sum + t, 0) / cycleTimes.length
    : 0;

  const medianCycleTime = cycleTimes.length > 0
    ? cycleTimes.length % 2 === 0
      ? (cycleTimes[cycleTimes.length / 2 - 1] + cycleTimes[cycleTimes.length / 2]) / 2
      : cycleTimes[Math.floor(cycleTimes.length / 2)]
    : 0;

  const p90CycleTime = cycleTimes.length > 0
    ? cycleTimes[Math.min(Math.floor(cycleTimes.length * 0.9), cycleTimes.length - 1)]
    : 0;

  // Calculate lead times (if transition data available)
  const plannedToInProgressTimes = specs
    .map((s) => calculateLeadTime(s, 'planned', 'in-progress'))
    .filter((t): t is number => t !== null);

  const inProgressToCompleteTimes = specs
    .map((s) => calculateLeadTime(s, 'in-progress', 'complete'))
    .filter((t): t is number => t !== null);

  const avgPlannedToInProgress = plannedToInProgressTimes.length > 0
    ? plannedToInProgressTimes.reduce((sum, t) => sum + t, 0) / plannedToInProgressTimes.length
    : 0;

  const avgInProgressToComplete = inProgressToCompleteTimes.length > 0
    ? inProgressToCompleteTimes.reduce((sum, t) => sum + t, 0) / inProgressToCompleteTimes.length
    : 0;

  // Calculate throughput
  const throughputWeek = calculateThroughput(specs, 7);
  const throughputMonth = calculateThroughput(specs, 30);
  
  // Calculate throughput for previous week for trend
  const prevWeekStart = dayjs().subtract(14, 'day');
  const prevWeekEnd = dayjs().subtract(7, 'day');
  const throughputPrevWeek = specs.filter((s) => {
    const completedAt = s.frontmatter.completed_at || s.frontmatter.completed;
    if (!completedAt) return false;
    const completed = dayjs(completedAt);
    return completed.isAfter(prevWeekStart) && !completed.isAfter(prevWeekEnd);
  }).length;

  const throughputTrend: 'up' | 'down' | 'stable' =
    throughputWeek > throughputPrevWeek ? 'up' :
    throughputWeek < throughputPrevWeek ? 'down' : 'stable';

  // Calculate WIP
  const currentWIP = calculateWIP(specs);

  // Calculate average WIP over last 30 days
  const wipSamples: number[] = [];
  for (let i = 0; i < 30; i++) {
    const sampleDate = dayjs().subtract(i, 'day');
    wipSamples.push(calculateWIP(specs, sampleDate));
  }
  const avgWIP = wipSamples.length > 0
    ? wipSamples.reduce((sum, w) => sum + w, 0) / wipSamples.length
    : 0;

  return {
    cycleTime: {
      average: Math.round(averageCycleTime * 10) / 10,
      median: Math.round(medianCycleTime * 10) / 10,
      p90: Math.round(p90CycleTime * 10) / 10,
    },
    leadTime: {
      plannedToInProgress: Math.round(avgPlannedToInProgress * 10) / 10,
      inProgressToComplete: Math.round(avgInProgressToComplete * 10) / 10,
    },
    throughput: {
      perWeek: throughputWeek,
      perMonth: throughputMonth,
      trend: throughputTrend,
    },
    wip: {
      current: currentWIP,
      average: Math.round(avgWIP * 10) / 10,
    },
  };
}
