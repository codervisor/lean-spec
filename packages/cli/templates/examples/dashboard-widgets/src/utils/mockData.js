/**
 * Mock data generators for dashboard widgets
 */

export function getStats() {
  return [
    { label: 'Users', value: '2,453' },
    { label: 'Revenue', value: '$12.5K' },
    { label: 'Orders', value: '186' },
    { label: 'Growth', value: '+23%' },
  ];
}

export function getChartData() {
  return [
    { label: 'Mon', value: 45 },
    { label: 'Tue', value: 62 },
    { label: 'Wed', value: 38 },
    { label: 'Thu', value: 71 },
    { label: 'Fri', value: 55 },
    { label: 'Sat', value: 28 },
    { label: 'Sun', value: 34 },
  ];
}

// TODO: Add more mock data generators for new widgets
// Example:
// export function getActivityFeed() { ... }
// export function getPerformanceMetrics() { ... }
// export function getQuickActions() { ... }
