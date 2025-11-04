import { describe, it, expect } from 'vitest';
import { generateInsights, getSpecInsightDetails } from './insights.js';
import type { SpecInfo } from '../spec-loader.js';
import dayjs from 'dayjs';

describe('generateInsights', () => {
  it('should detect critical overdue specs', () => {
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    const specs: SpecInfo[] = [
      {
        path: 'spec-001',
        frontmatter: {
          status: 'in-progress',
          created: '2025-01-01',
          priority: 'critical',
          due: yesterday,
        },
        readme: '',
        yamlSource: '',
      },
    ];

    const insights = generateInsights(specs);
    expect(insights.length).toBeGreaterThan(0);
    expect(insights[0].severity).toBe('critical');
    expect(insights[0].message).toContain('critical');
    expect(insights[0].message).toContain('overdue');
  });

  it('should detect high priority overdue specs', () => {
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    const specs: SpecInfo[] = [
      {
        path: 'spec-001',
        frontmatter: {
          status: 'in-progress',
          created: '2025-01-01',
          priority: 'high',
          due: yesterday,
        },
        readme: '',
        yamlSource: '',
      },
    ];

    const insights = generateInsights(specs);
    const highOverdueInsight = insights.find(i => i.message.includes('high priority'));
    expect(highOverdueInsight).toBeDefined();
    expect(highOverdueInsight?.severity).toBe('warning');
  });

  it('should detect long-running WIP specs', () => {
    const tenDaysAgo = dayjs().subtract(10, 'day').format('YYYY-MM-DD');
    const specs: SpecInfo[] = [
      {
        path: 'spec-001',
        frontmatter: {
          status: 'in-progress',
          created: '2025-01-01',
          updated: tenDaysAgo,
        },
        readme: '',
        yamlSource: '',
      },
    ];

    const insights = generateInsights(specs);
    const longRunningInsight = insights.find(i => i.message.includes('in-progress'));
    expect(longRunningInsight).toBeDefined();
    expect(longRunningInsight?.message).toContain('7 days');
  });

  it('should detect critical specs not started', () => {
    const specs: SpecInfo[] = [
      {
        path: 'spec-001',
        frontmatter: {
          status: 'planned',
          created: '2025-01-01',
          priority: 'critical',
        },
        readme: '',
        yamlSource: '',
      },
    ];

    const insights = generateInsights(specs);
    const notStartedInsight = insights.find(i => i.message.includes('not started'));
    expect(notStartedInsight).toBeDefined();
    expect(notStartedInsight?.message).toContain('critical');
  });

  it('should return empty array when no issues', () => {
    const specs: SpecInfo[] = [
      {
        path: 'spec-001',
        frontmatter: {
          status: 'complete',
          created: '2025-01-01',
        },
        readme: '',
        yamlSource: '',
      },
    ];

    const insights = generateInsights(specs);
    expect(insights).toHaveLength(0);
  });

  it('should limit to top 5 insights', () => {
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    const tenDaysAgo = dayjs().subtract(10, 'day').format('YYYY-MM-DD');
    
    const specs: SpecInfo[] = [
      // 3 critical overdue
      ...Array.from({ length: 3 }, (_, i) => ({
        path: `spec-critical-${i}`,
        frontmatter: {
          status: 'in-progress' as const,
          created: '2025-01-01',
          priority: 'critical' as const,
          due: yesterday,
        },
        readme: '',
        yamlSource: '',
      })),
      // 2 high overdue
      ...Array.from({ length: 2 }, (_, i) => ({
        path: `spec-high-${i}`,
        frontmatter: {
          status: 'in-progress' as const,
          created: '2025-01-01',
          priority: 'high' as const,
          due: yesterday,
        },
        readme: '',
        yamlSource: '',
      })),
      // 5 long-running
      ...Array.from({ length: 5 }, (_, i) => ({
        path: `spec-long-${i}`,
        frontmatter: {
          status: 'in-progress' as const,
          created: '2025-01-01',
          updated: tenDaysAgo,
        },
        readme: '',
        yamlSource: '',
      })),
    ];

    const insights = generateInsights(specs);
    expect(insights.length).toBeLessThanOrEqual(5);
  });

  it('should not detect archived or complete specs as overdue', () => {
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    const specs: SpecInfo[] = [
      {
        path: 'spec-001',
        frontmatter: {
          status: 'complete',
          created: '2025-01-01',
          priority: 'critical',
          due: yesterday,
        },
        readme: '',
        yamlSource: '',
      },
      {
        path: 'spec-002',
        frontmatter: {
          status: 'archived',
          created: '2025-01-01',
          priority: 'critical',
          due: yesterday,
        },
        readme: '',
        yamlSource: '',
      },
    ];

    const insights = generateInsights(specs);
    expect(insights).toHaveLength(0);
  });
});

describe('getSpecInsightDetails', () => {
  it('should return overdue details for overdue specs', () => {
    const threeDaysAgo = dayjs().subtract(3, 'day').format('YYYY-MM-DD');
    const spec: SpecInfo = {
      path: 'spec-001',
      frontmatter: {
        status: 'in-progress',
        created: '2025-01-01',
        due: threeDaysAgo,
      },
      readme: '',
      yamlSource: '',
    };

    const details = getSpecInsightDetails(spec);
    expect(details).toContain('overdue by 3 days');
  });

  it('should return in-progress duration for long-running specs', () => {
    const tenDaysAgo = dayjs().subtract(10, 'day').format('YYYY-MM-DD');
    const spec: SpecInfo = {
      path: 'spec-001',
      frontmatter: {
        status: 'in-progress',
        created: '2025-01-01',
        updated: tenDaysAgo,
      },
      readme: '',
      yamlSource: '',
    };

    const details = getSpecInsightDetails(spec);
    expect(details).toContain('in-progress for 10 days');
  });

  it('should return null for specs with no issues', () => {
    const twoDaysAgo = dayjs().subtract(2, 'day').format('YYYY-MM-DD');
    const spec: SpecInfo = {
      path: 'spec-001',
      frontmatter: {
        status: 'in-progress',
        created: twoDaysAgo,
        updated: twoDaysAgo, // Recently updated
      },
      readme: '',
      yamlSource: '',
    };

    const details = getSpecInsightDetails(spec);
    expect(details).toBeNull();
  });

  it('should not flag short-running WIP specs', () => {
    const twoDaysAgo = dayjs().subtract(2, 'day').format('YYYY-MM-DD');
    const spec: SpecInfo = {
      path: 'spec-001',
      frontmatter: {
        status: 'in-progress',
        created: '2025-01-01',
        updated: twoDaysAgo,
      },
      readme: '',
      yamlSource: '',
    };

    const details = getSpecInsightDetails(spec);
    expect(details).toBeNull();
  });
});
