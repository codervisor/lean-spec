import { Badge, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, cn } from '@leanspec/ui-components';
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
  const config = statusConfig[status] || statusConfig['planned'];
  const Icon = config.icon;
  const { t } = useTranslation('common');

  const content = (
    <Badge
      variant="outline"
      className={cn(
        'flex items-center w-fit h-5 px-2 py-0.5 text-xs font-medium border-transparent',
        !iconOnly && 'gap-1.5',
        config.className,
        className,
        editable && "cursor-pointer hover:opacity-80 transition-opacity"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {!iconOnly && (
        responsive ? (
          <span className="hidden sm:inline">{t(config.labelKey)}</span>
        ) : (
          t(config.labelKey)
        )
      )}
    </Badge>
  );

  if (!editable || !onChange) {
    return content;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        {content}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
        {Object.entries(statusConfig).map(([key, config]) => {
          const ItemIcon = config.icon;
          return (
            <DropdownMenuItem
              key={key}
              onClick={(e) => {
                e.stopPropagation();
                onChange(key);
              }}
              className="gap-2"
            >
              <ItemIcon className={cn("h-3.5 w-3.5", key === status ? "opacity-100" : "opacity-50")} />
              {t(config.labelKey)}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
