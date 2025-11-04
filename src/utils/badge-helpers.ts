/**
 * Get priority badge for displaying in terminal
 */
export function getPriorityBadge(priority?: string): string {
  if (!priority) return '';
  
  const badges: Record<string, string> = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢',
  };
  
  return badges[priority] || '';
}
