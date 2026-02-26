import { Badge } from '@/library';
import { useTranslation } from 'react-i18next';
import { sessionModeConfig } from '../../lib/session-utils';
import type { SessionMode } from '../../types/api';

interface SessionModeBadgeProps {
  mode: SessionMode | string;
}

export function SessionModeBadge({ mode }: SessionModeBadgeProps) {
  const { t } = useTranslation('common');
  const modeCfg = sessionModeConfig[mode as SessionMode];
  if (!modeCfg) return null;
  const ModeIcon = modeCfg.icon;

  return (
    <Badge
      variant="outline"
      className="flex items-center gap-1.5 w-fit border-transparent h-5 px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground"
    >
      <ModeIcon className="h-3.5 w-3.5" />
      {t(modeCfg.labelKey)}
    </Badge>
  );
}
