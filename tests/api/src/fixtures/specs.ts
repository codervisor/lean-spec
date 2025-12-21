/**
 * Spec test fixtures
 *
 * Test data for spec-related tests.
 */

import type { TestSpecFixture } from './projects';

/**
 * Fixtures for testing search functionality
 */
export const searchTestFixtures: TestSpecFixture[] = [
  {
    name: 'authentication-api',
    title: 'Authentication API',
    status: 'complete',
    priority: 'critical',
    tags: ['api', 'security', 'auth'],
    content: '# Authentication API\n\nImplement JWT-based authentication for the API.',
  },
  {
    name: 'user-dashboard',
    title: 'User Dashboard',
    status: 'in-progress',
    priority: 'high',
    tags: ['ui', 'dashboard'],
    content: '# User Dashboard\n\nCreate a user dashboard with analytics widgets.',
  },
  {
    name: 'api-rate-limiting',
    title: 'API Rate Limiting',
    status: 'planned',
    priority: 'medium',
    tags: ['api', 'security'],
    dependsOn: ['001-authentication-api'],
    content: '# API Rate Limiting\n\nImplement rate limiting for the API endpoints.',
  },
  {
    name: 'notification-system',
    title: 'Notification System',
    status: 'planned',
    priority: 'low',
    tags: ['backend', 'notifications'],
    content: '# Notification System\n\nBuild a notification system with email and push support.',
  },
];

/**
 * Fixtures for testing validation
 */
export const validationTestFixtures: TestSpecFixture[] = [
  {
    name: 'valid-spec',
    title: 'Valid Spec',
    status: 'planned',
    priority: 'medium',
    tags: ['test'],
    content: '# Valid Spec\n\nThis is a valid spec with all required sections.\n\n## Overview\n\nShort overview.\n\n## Requirements\n\n- Requirement 1\n- Requirement 2',
  },
  {
    name: 'minimal-spec',
    title: 'Minimal Spec',
    status: 'planned',
    content: '# Minimal Spec\n\nA minimal spec with only required fields.',
  },
];

/**
 * Fixtures for testing stats calculations
 */
export const statsTestFixtures: TestSpecFixture[] = [
  // 2 planned
  {
    name: 'planned-one',
    title: 'Planned One',
    status: 'planned',
    priority: 'low',
    tags: ['feature'],
  },
  {
    name: 'planned-two',
    title: 'Planned Two',
    status: 'planned',
    priority: 'medium',
    tags: ['feature', 'api'],
  },
  // 2 in-progress
  {
    name: 'in-progress-one',
    title: 'In Progress One',
    status: 'in-progress',
    priority: 'high',
    tags: ['api'],
    assignee: 'dev1',
  },
  {
    name: 'in-progress-two',
    title: 'In Progress Two',
    status: 'in-progress',
    priority: 'critical',
    tags: ['core'],
    assignee: 'dev2',
  },
  // 3 complete
  {
    name: 'complete-one',
    title: 'Complete One',
    status: 'complete',
    priority: 'low',
    tags: ['docs'],
  },
  {
    name: 'complete-two',
    title: 'Complete Two',
    status: 'complete',
    priority: 'medium',
    tags: ['feature'],
  },
  {
    name: 'complete-three',
    title: 'Complete Three',
    status: 'complete',
    priority: 'high',
    tags: ['api', 'feature'],
  },
  // 1 archived
  {
    name: 'archived-one',
    title: 'Archived One',
    status: 'archived',
    priority: 'low',
    tags: ['legacy'],
  },
];
