import { StatusBadge as UIStatusBadge, cn } from '@/library';
import { useTranslation } from 'react-i18next';
import { statusConfig } from './badge-config';

interface StatusBadgeProps {
  status: string;
  className?: string;
  iconOnly?: boolean;
  responsive?: boolean;
  editable?: boolean;
  onChange?: (status: string) => void;
}

export function StatusBadge({ status, className, iconOnly = false, responsive = true, editable = false, onChange }: StatusBadgeProps) {
  const { t } = useTranslation('common');
  const config = statusConfig[status] || statusConfig['planned'];
  
  // Get translated label
  const label = !iconOnly ? t(config.labelKey) : undefined;
  
  // Handle responsive mode by controlling iconOnly
  const isIconOnly = iconOnly || (responsive && false); // Note: responsive logic needs screen size detection

  return (
    <UIStatusBadge
      status={status}
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
