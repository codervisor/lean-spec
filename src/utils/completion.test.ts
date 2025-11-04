import { describe, it, expect } from 'vitest';
import { calculateCompletion, getCompletionStatus } from './completion.js';
import type { SpecInfo } from '../spec-loader.js';
import dayjs from 'dayjs';

describe('calculateCompletion', () => {
  it('should calculate completion score of 100% for all complete specs', () => {
    const specs = [
      {
        path: 'spec-001',
        frontmatter: { status: 'complete', created: '2025-01-01', priority: 'high' },
      } as SpecInfo,
      {
        path: 'spec-002',
        frontmatter: { status: 'complete', created: '2025-01-01', priority: 'medium' },
      } as SpecInfo,
    ];

    const completion = calculateCompletion(specs);
    expect(completion.score).toBe(100);
    expect(completion.completeSpecs).toBe(2);
    expect(completion.activeSpecs).toBe(0);
  });

  it('should calculate completion score of 0% for all planned specs', () => {
    const specs = [
      {
        path: 'spec-001',
        frontmatter: { status: 'planned', created: '2025-01-01', priority: 'high' },
      } as SpecInfo,
      {
        path: 'spec-002',
        frontmatter: { status: 'planned', created: '2025-01-01', priority: 'medium' },
      } as SpecInfo,
    ];

    const completion = calculateCompletion(specs);
    expect(completion.score).toBe(0);
    expect(completion.completeSpecs).toBe(0);
    expect(completion.activeSpecs).toBe(2);
  });

  it('should calculate simple completion rate regardless of priority', () => {
    const specs = [
      {
        path: 'spec-001',
        frontmatter: { status: 'complete', created: '2025-01-01', priority: 'critical' },
      } as SpecInfo,
      {
        path: 'spec-002',
        frontmatter: { status: 'planned', created: '2025-01-01', priority: 'low' },
      } as SpecInfo,
      {
        path: 'spec-003',
        frontmatter: { status: 'complete', created: '2025-01-01', priority: 'high' },
      } as SpecInfo,
      {
        path: 'spec-004',
        frontmatter: { status: 'in-progress', created: '2025-01-01', priority: 'medium' },
      } as SpecInfo,
    ];

    const completion = calculateCompletion(specs);
    
    // Simple: 2 complete out of 4 total = 50%
    expect(completion.score).toBe(50);
    expect(completion.completeSpecs).toBe(2);
    expect(completion.totalSpecs).toBe(4);
  });

  it('should detect critical overdue specs', () => {
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    const specs = [
      {
        path: 'spec-001',
        frontmatter: { 
          status: 'in-progress', 
          created: '2025-01-01', 
          priority: 'critical',
          due: yesterday,
        },
      } as SpecInfo,
    ];

    const completion = calculateCompletion(specs);
    expect(completion.criticalIssues).toContain('spec-001');
  });

  it('should detect long-running WIP specs', () => {
    const tenDaysAgo = dayjs().subtract(10, 'day').format('YYYY-MM-DD');
    const specs = [
      {
        path: 'spec-001',
        frontmatter: { 
          status: 'in-progress', 
          created: '2025-01-01',
          updated: tenDaysAgo,
        },
      } as SpecInfo,
    ];

    const completion = calculateCompletion(specs);
    expect(completion.warnings).toContain('spec-001');
  });

  it('should exclude archived specs from completion calculation', () => {
    const specs = [
      {
        path: 'spec-001',
        frontmatter: { status: 'complete', created: '2025-01-01' },
      } as SpecInfo,
      {
        path: 'spec-002',
        frontmatter: { status: 'archived', created: '2025-01-01' },
      } as SpecInfo,
    ];

    const completion = calculateCompletion(specs);
    expect(completion.totalSpecs).toBe(1); // Only non-archived
    expect(completion.score).toBe(100); // 1 complete out of 1 total
  });
});

describe('getCompletionStatus', () => {
  it('should return Good for score >= 70', () => {
    const status = getCompletionStatus(75);
    expect(status.label).toBe('Good');
    expect(status.emoji).toBe('✓');
    expect(status.color).toBe('green');
  });

  it('should return Fair for score 40-69', () => {
    const status = getCompletionStatus(50);
    expect(status.label).toBe('Fair');
    expect(status.emoji).toBe('⚠');
    expect(status.color).toBe('yellow');
  });

  it('should return Needs Attention for score < 40', () => {
    const status = getCompletionStatus(30);
    expect(status.label).toBe('Needs Attention');
    expect(status.emoji).toBe('✗');
    expect(status.color).toBe('red');
  });
});
