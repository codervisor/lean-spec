/**
 * StatsOverview component
 * Displays an overview of project stats with multiple stat cards
 */

import { FileText, CheckCircle2, PlayCircle, Clock, Archive } from 'lucide-react';
import { StatsCard } from './stats-card';
import { cn } from '@/lib/utils';

export interface StatsData {
  totalSpecs: number;
  completedSpecs: number;
  inProgressSpecs: number;
  plannedSpecs: number;
  archivedSpecs?: number;
  completionRate: number;
}

export interface StatsOverviewProps {
  /** Stats data to display */
  stats: StatsData;
  /** Show archived specs card */
  showArchived?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Labels for localization */
  labels?: {
    total?: string;
    totalSubtitle?: string;
    completed?: string;
    completedSubtitle?: string;
    inProgress?: string;
    inProgressSubtitle?: string;
    planned?: string;
    plannedSubtitle?: string;
    archived?: string;
    archivedSubtitle?: string;
    completionRate?: string;
  };
}

const defaultLabels = {
  total: 'Total Specs',
  totalSubtitle: 'All specifications',
  completed: 'Completed',
  completedSubtitle: 'completion rate',
  inProgress: 'In Progress',
  inProgressSubtitle: 'Currently active',
  planned: 'Planned',
  plannedSubtitle: 'Not yet started',
  archived: 'Archived',
  archivedSubtitle: 'No longer active',
  completionRate: 'completion rate',
};

export function StatsOverview({
  stats,
  showArchived = false,
  className,
  labels = {},
}: StatsOverviewProps) {
  const l = { ...defaultLabels, ...labels };

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      <StatsCard
        title={l.total}
        value={stats.totalSpecs}
        subtitle={l.totalSubtitle}
        icon={FileText}
        iconColorClass="text-blue-600"
        gradientClass="from-blue-500/10"
      />
      <StatsCard
        title={l.completed}
        value={stats.completedSpecs}
        subtitle={`${stats.completionRate}% ${l.completedSubtitle}`}
        icon={CheckCircle2}
        iconColorClass="text-green-600"
        gradientClass="from-green-500/10"
      />
      <StatsCard
        title={l.inProgress}
        value={stats.inProgressSpecs}
        subtitle={l.inProgressSubtitle}
        icon={PlayCircle}
        iconColorClass="text-orange-600"
        gradientClass="from-orange-500/10"
      />
      <StatsCard
        title={l.planned}
        value={stats.plannedSpecs}
        subtitle={l.plannedSubtitle}
        icon={Clock}
        iconColorClass="text-blue-600"
        gradientClass="from-blue-500/10"
      />
      {showArchived && stats.archivedSpecs !== undefined && (
        <StatsCard
          title={l.archived}
          value={stats.archivedSpecs}
          subtitle={l.archivedSubtitle}
          icon={Archive}
          iconColorClass="text-gray-600"
          gradientClass="from-gray-500/10"
        />
      )}
    </div>
  );
}
