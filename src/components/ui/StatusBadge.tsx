import React from 'react';
import { Text } from 'ink';
import type { SpecStatus, SpecPriority } from '../../frontmatter.js';

interface StatusBadgeProps {
  status: SpecStatus;
}

interface PriorityBadgeProps {
  priority: SpecPriority;
}

const STATUS_CONFIG: Record<SpecStatus, { emoji: string; label: string; color: string }> = {
  planned: { emoji: '📅', label: 'Planned', color: 'cyan' },
  'in-progress': { emoji: '🔨', label: 'In Progress', color: 'yellow' },
  complete: { emoji: '✅', label: 'Complete', color: 'green' },
  archived: { emoji: '📦', label: 'Archived', color: 'gray' },
};

const PRIORITY_CONFIG: Record<SpecPriority, { emoji: string; label: string; color: string }> = {
  low: { emoji: '🟢', label: 'Low', color: 'gray' },
  medium: { emoji: '🟠', label: 'Medium', color: 'blue' },
  high: { emoji: '🟡', label: 'High', color: 'yellow' },
  critical: { emoji: '🔴', label: 'Critical', color: 'red' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = STATUS_CONFIG[status];
  return (
    <Text color={config.color}>
      {config.emoji} {config.label}
    </Text>
  );
};

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  const config = PRIORITY_CONFIG[priority];
  return (
    <Text color={config.color}>
      {config.emoji} {config.label}
    </Text>
  );
};

export const getStatusEmoji = (status: SpecStatus): string => {
  return STATUS_CONFIG[status]?.emoji || '❓';
};

export const getPriorityEmoji = (priority: SpecPriority): string => {
  return PRIORITY_CONFIG[priority]?.emoji || '';
};
