import { EmptyState as UIEmptyState } from '@/library';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  tone?: 'muted' | 'error';
}

export function EmptyState({ icon, title, description, actions, className, tone = 'muted' }: EmptyStateProps) {
  return (
    <UIEmptyState
      icon={icon}
      title={title}
      description={description || ''}
      actions={actions}
      className={className}
      tone={tone}
      variant="card"
    />
  );
}
