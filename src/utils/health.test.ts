import { describe, it, expect } from 'vitest';
import { calculateHealth, getHealthStatus } from './health.js';
import type { SpecInfo } from '../spec-loader.js';
import dayjs from 'dayjs';

describe('calculateHealth', () => {
  it('should calculate health score of 100% for all complete specs', () => {
    const specs: SpecInfo[] = [
      {
        path: 'spec-001',
        frontmatter: { status: 'complete', created: '2025-01-01', priority: 'high' },
        readme: '',
        yamlSource: '',
      },
      {
        path: 'spec-002',
        frontmatter: { status: 'complete', created: '2025-01-01', priority: 'medium' },
        readme: '',
        yamlSource: '',
      },
    ];

    const health = calculateHealth(specs);
    expect(health.score).toBe(100);
    expect(health.completeSpecs).toBe(2);
    expect(health.activeSpecs).toBe(0);
  });

  it('should calculate health score of 0% for all planned specs', () => {
    const specs: SpecInfo[] = [
      {
        path: 'spec-001',
        frontmatter: { status: 'planned', created: '2025-01-01', priority: 'high' },
        readme: '',
        yamlSource: '',
      },
      {
        path: 'spec-002',
        frontmatter: { status: 'planned', created: '2025-01-01', priority: 'medium' },
        readme: '',
        yamlSource: '',
      },
    ];

    const health = calculateHealth(specs);
    expect(health.score).toBe(0);
    expect(health.completeSpecs).toBe(0);
    expect(health.activeSpecs).toBe(2);
  });

  it('should weight critical specs higher than low priority', () => {
    const specsWithCritical: SpecInfo[] = [
      {
        path: 'spec-001',
        frontmatter: { status: 'complete', created: '2025-01-01', priority: 'critical' },
        readme: '',
        yamlSource: '',
      },
      {
        path: 'spec-002',
        frontmatter: { status: 'planned', created: '2025-01-01', priority: 'low' },
        readme: '',
        yamlSource: '',
      },
    ];

    const specsWithLow: SpecInfo[] = [
      {
        path: 'spec-001',
        frontmatter: { status: 'planned', created: '2025-01-01', priority: 'critical' },
        readme: '',
        yamlSource: '',
      },
      {
        path: 'spec-002',
        frontmatter: { status: 'complete', created: '2025-01-01', priority: 'low' },
        readme: '',
        yamlSource: '',
      },
    ];

    const healthWithCritical = calculateHealth(specsWithCritical);
    const healthWithLow = calculateHealth(specsWithLow);

    // Critical complete (4 points) + low planned (0 points) = 4/5 = 80%
    expect(healthWithCritical.score).toBe(80);
    
    // Critical planned (0 points) + low complete (1 point) = 1/5 = 20%
    expect(healthWithLow.score).toBe(20);
  });

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

    const health = calculateHealth(specs);
    expect(health.criticalIssues).toContain('spec-001');
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

    const health = calculateHealth(specs);
    expect(health.warnings).toContain('spec-001');
  });

  it('should exclude archived specs from health calculation', () => {
    const specs: SpecInfo[] = [
      {
        path: 'spec-001',
        frontmatter: { status: 'complete', created: '2025-01-01' },
        readme: '',
        yamlSource: '',
      },
      {
        path: 'spec-002',
        frontmatter: { status: 'archived', created: '2025-01-01' },
        readme: '',
        yamlSource: '',
      },
    ];

    const health = calculateHealth(specs);
    expect(health.totalSpecs).toBe(1); // Only non-archived
    expect(health.score).toBe(100); // 1 complete out of 1 total
  });
});

describe('getHealthStatus', () => {
  it('should return Good for score >= 70', () => {
    const status = getHealthStatus(75);
    expect(status.label).toBe('Good');
    expect(status.emoji).toBe('✓');
    expect(status.color).toBe('green');
  });

  it('should return Fair for score 40-69', () => {
    const status = getHealthStatus(50);
    expect(status.label).toBe('Fair');
    expect(status.emoji).toBe('⚠');
    expect(status.color).toBe('yellow');
  });

  it('should return Needs Attention for score < 40', () => {
    const status = getHealthStatus(30);
    expect(status.label).toBe('Needs Attention');
    expect(status.emoji).toBe('✗');
    expect(status.color).toBe('red');
  });
});
