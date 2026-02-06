import { PriorityBadge as UIPriorityBadge, cn } from '@leanspec/ui-components';
import { useTranslation } from 'react-i18next';
import { priorityConfig } from './badge-config';

interface PriorityBadgeProps {
  priority: string;
  className?: string;
  iconOnly?: boolean;
  responsive?: boolean;
  editable?: boolean;
  onChange?: (priority: string) => void;
}

export function PriorityBadge({ priority, className, iconOnly = false, responsive = true, editable = false, onChange }: PriorityBadgeProps) {
  const { t } = useTranslation('common');
  const config = priorityConfig[priority] || priorityConfig['medium'];
  
  // Get translated label
  const label = !iconOnly ? t(config.labelKey) : undefined;
  
  // Handle responsive mode by controlling iconOnly
  const isIconOnly = iconOnly || (responsive && false); // Note: responsive logic needs screen size detection

  return (
    <UIPriorityBadge
      priority={priority}
      className={cn(
        'h-5 px-2 py-0.5 text-xs font-medium border-transparent',
        responsive && !iconOnly && 'hidden sm:flex',
        className
      )}
      iconOnly={isIconOnly}
      label={label}
      editable={editable}
      onChange={onChange}
    />
  );
}
