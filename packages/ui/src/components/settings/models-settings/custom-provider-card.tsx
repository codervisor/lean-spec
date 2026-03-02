import { useTranslation } from 'react-i18next';
import {
  Button,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  cn,
} from '@/library';
import { Trash2, CheckCircle, AlertCircle, Settings, Wrench, MoreVertical, Star } from 'lucide-react';
import type { Provider } from '../../../types/chat-config';

export interface CustomProviderCardProps {
  provider: Provider;
  isDefault: boolean;
  onSetDefault: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function CustomProviderCard({ provider, isDefault, onSetDefault, onEdit, onDelete }: CustomProviderCardProps) {
  const { t } = useTranslation('common');
  return (
    <div className="border rounded-lg p-4 transition-colors hover:border-border/80 group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="h-10 w-10 shrink-0 rounded-md bg-muted flex items-center justify-center">
            <Wrench className="h-5 w-5 text-muted-foreground" />
          </div>

          <HoverCard openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-base font-medium leading-none">{provider.name}</h4>
                  {isDefault && (
                    <Badge variant="secondary" className="text-xs h-5 px-1.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800">
                      <Star className="h-3 w-3 mr-1 fill-current" />{t('settings.ai.default')}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs gap-1 h-5 px-1.5"><Wrench className="h-3 w-3" />{t('settings.ai.custom')}</Badge>
                  {provider.hasApiKey ? (
                    <Badge variant="outline" className="text-xs gap-1 h-5 px-1.5 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800">
                      <CheckCircle className="h-3 w-3" />{t('settings.ai.keyConfigured')}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs gap-1 h-5 px-1.5"><AlertCircle className="h-3 w-3" />{t('settings.ai.noKey')}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded inline-block">
                  <span>{provider.id}</span>
                  {provider.baseURL && (<><span className="mx-1.5">•</span><span className="truncate">{provider.baseURL}</span></>)}
                  <span className="mx-1.5">•</span>
                  <span>{provider.models.length} {t('settings.ai.models')}</span>
                </p>
              </div>
            </HoverCardTrigger>
            <HoverCardContent className="w-72">
              <div className="space-y-2 text-sm">
                <div className="font-semibold">{t('settings.ai.details.title')}</div>
                <div className="text-xs text-muted-foreground">{t('settings.ai.details.providerId')}: <span className="font-mono text-foreground">{provider.id}</span></div>
                {provider.baseURL && <div className="text-xs text-muted-foreground">{t('settings.ai.details.baseUrl')}: <span className="text-foreground">{provider.baseURL}</span></div>}
                <div className="text-xs text-muted-foreground">{t('settings.ai.details.modelCount', { count: provider.models.length, agentic: provider.models.length })}</div>
              </div>
            </HoverCardContent>
          </HoverCard>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="sm" className="h-8 ml-2 text-muted-foreground hover:text-foreground hover:bg-muted" onClick={onEdit}>
            <Settings className="h-3.5 w-3.5 mr-1.5" />{t('settings.ai.configure')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onSetDefault} disabled={isDefault}>
                <Star className={cn("h-4 w-4 mr-2", isDefault && "fill-current")} />{t('settings.ai.setDefault')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" />{t('actions.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
