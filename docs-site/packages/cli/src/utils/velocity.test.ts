import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import type { SpecInfo } from '../spec-loader.js';
import {
  calculateCycleTime,
  calculateLeadTime,
  calculateThroughput,
  calculateWIP,
  calculateVelocityMetrics,
} from './velocity.js';

describe('velocity utilities', () => {
  describe('calculateCycleTime', () => {
    it('should calculate cycle time for completed spec', () => {
      const spec: SpecInfo = {
        path: 'test-spec',
        name: 'test-spec',
        frontmatter: {
          status: 'complete',
          created: '2025-11-01',
          created_at: '2025-11-01T00:00:00Z',
          completed_at: '2025-11-05T00:00:00Z',
        },
      } as SpecInfo;

      const cycleTime = calculateCycleTime(spec);
      expect(cycleTime).toBe(4);
    });

    it('should return null for non-completed spec', () => {
      const spec: SpecInfo = {
        path: 'test-spec',
        name: 'test-spec',
        frontmatter: {
          status: 'in-progress',
          created: '2025-11-01',
        },
      } as SpecInfo;

      const cycleTime = calculateCycleTime(spec);
      expect(cycleTime).toBeNull();
    });

    it('should fallback to date fields if timestamps missing', () => {
      const spec: SpecInfo = {
        path: 'test-spec',
        name: 'test-spec',
        frontmatter: {
          status: 'complete',
          created: '2025-11-01',
          completed: '2025-11-05',
        },
      } as SpecInfo;

      const cycleTime = calculateCycleTime(spec);
      expect(cycleTime).toBe(4);
    });
  });

  describe('calculateLeadTime', () => {
    it('should calculate lead time between status transitions', () => {
      const spec: SpecInfo = {
        path: 'test-spec',
        name: 'test-spec',
        frontmatter: {
          status: 'complete',
          created: '2025-11-01',
          transitions: [
            { status: 'planned', at: '2025-11-01T00:00:00Z' },
            { status: 'in-progress', at: '2025-11-03T00:00:00Z' },
            { status: 'complete', at: '2025-11-07T00:00:00Z' },
          ],
        },
      } as SpecInfo;

      const leadTime = calculateLeadTime(spec, 'planned', 'in-progress');
      expect(leadTime).toBe(2);

      const leadTime2 = calculateLeadTime(spec, 'in-progress', 'complete');
      expect(leadTime2).toBe(4);
    });

    it('should return null if transitions missing', () => {
      const spec: SpecInfo = {
        path: 'test-spec',
        name: 'test-spec',
        frontmatter: {
          status: 'complete',
          created: '2025-11-01',
        },
      } as SpecInfo;

      const leadTime = calculateLeadTime(spec, 'planned', 'in-progress');
      expect(leadTime).toBeNull();
    });
  });

  describe('calculateThroughput', () => {
    it('should count specs completed in time period', () => {
      const specs: SpecInfo[] = [
        {
          path: 'spec1',
          name: 'spec1',
          frontmatter: {
            status: 'complete',
            created: '2025-10-01',
            completed_at: dayjs().subtract(3, 'day').toISOString(),
          },
        },
        {
          path: 'spec2',
          name: 'spec2',
          frontmatter: {
            status: 'complete',
            created: '2025-10-01',
            completed_at: dayjs().subtract(5, 'day').toISOString(),
          },
        },
        {
          path: 'spec3',
          name: 'spec3',
          frontmatter: {
            status: 'complete',
            created: '2025-10-01',
            completed_at: dayjs().subtract(10, 'day').toISOString(),
          },
        },
      ] as SpecInfo[];

      const throughput = calculateThroughput(specs, 7);
      expect(throughput).toBe(2); // 2 specs completed in last 7 days
    });

    it('should return 0 if no specs completed', () => {
      const specs: SpecInfo[] = [
        {
          path: 'spec1',
          name: 'spec1',
          frontmatter: {
            status: 'in-progress',
            created: '2025-10-01',
          },
        },
      ] as SpecInfo[];

      const throughput = calculateThroughput(specs, 7);
      expect(throughput).toBe(0);
    });
  });

  describe('calculateWIP', () => {
    it('should count specs in progress at a date', () => {
      const targetDate = dayjs('2025-11-05');
      const specs: SpecInfo[] = [
        {
          path: 'spec1',
          name: 'spec1',
          frontmatter: {
            status: 'in-progress',
            created: '2025-11-01',
            created_at: '2025-11-01T00:00:00Z',
          },
        },
        {
          path: 'spec2',
          name: 'spec2',
          frontmatter: {
            status: 'complete',
            created: '2025-11-02',
            created_at: '2025-11-02T00:00:00Z',
            completed_at: '2025-11-06T00:00:00Z', // Completed after target date
          },
        },
        {
          path: 'spec3',
          name: 'spec3',
          frontmatter: {
            status: 'complete',
            created: '2025-11-01',
            created_at: '2025-11-01T00:00:00Z',
            completed_at: '2025-11-04T00:00:00Z', // Completed before target date
          },
        },
      ] as SpecInfo[];

      const wip = calculateWIP(specs, targetDate);
      expect(wip).toBe(2); // spec1 and spec2 were in progress on 2025-11-05
    });
  });

  describe('calculateVelocityMetrics', () => {
    it('should calculate comprehensive velocity metrics', () => {
      const specs: SpecInfo[] = [
        {
          path: 'spec1',
          name: 'spec1',
          frontmatter: {
            status: 'complete',
            created: '2025-10-01',
            created_at: '2025-10-01T00:00:00Z',
            completed_at: dayjs().subtract(3, 'day').toISOString(),
            transitions: [
              { status: 'planned', at: '2025-10-01T00:00:00Z' },
              { status: 'in-progress', at: '2025-10-02T00:00:00Z' },
              { status: 'complete', at: dayjs().subtract(3, 'day').toISOString() },
            ],
          },
        },
        {
          path: 'spec2',
          name: 'spec2',
          frontmatter: {
            status: 'complete',
            created: '2025-10-01',
            created_at: '2025-10-01T00:00:00Z',
            completed_at: dayjs().subtract(5, 'day').toISOString(),
          },
        },
        {
          path: 'spec3',
          name: 'spec3',
          frontmatter: {
            status: 'in-progress',
            created: '2025-10-01',
            created_at: '2025-10-01T00:00:00Z',
          },
        },
      ] as SpecInfo[];

      const metrics = calculateVelocityMetrics(specs);

      expect(metrics.cycleTime).toBeDefined();
      expect(metrics.cycleTime.average).toBeGreaterThan(0);
      expect(metrics.throughput.perWeek).toBeGreaterThanOrEqual(0);
      expect(metrics.wip.current).toBeGreaterThanOrEqual(0);
      expect(['up', 'down', 'stable']).toContain(metrics.throughput.trend);
    });
  });
});
