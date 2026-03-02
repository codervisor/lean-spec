import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  ModelSelectorLogo,
  cn,
} from '@/library';
import { CheckCircle, AlertCircle, Settings, ChevronDown, Zap, Brain, ImageIcon, MoreVertical, Star, ListFilter, Key } from 'lucide-react';
import type { RegistryProvider } from '../../../types/models-registry';
import { List, type RowComponentProps } from 'react-window';

export interface RegistryProviderCardProps {
  provider: RegistryProvider;
  isDefault: boolean;
  enabledModels?: string[];
  onSetDefault: () => void;
  onConfigureKey: () => void;
  onConfigureModels: () => void;
}

interface RowData {
  models: RegistryProvider['models'];
  t: (key: string, options?: Record<string, unknown>) => string;
}

function ModelRow({ index, style, models, t }: RowComponentProps<RowData>) {
  const model = models[index];
  return (
    <div style={style} className="flex items-center gap-2 text-xs">
      <span className="font-mono text-muted-foreground truncate flex-1">{model.id}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        {model.toolCall && (
          <span title={t('settings.ai.capabilities.toolCall')} className="text-blue-500"><Zap className="h-3 w-3" /></span>
        )}
        {model.reasoning && (
          <span title={t('settings.ai.capabilities.reasoning')} className="text-purple-500"><Brain className="h-3 w-3" /></span>
        )}
        {model.vision && (
          <span title={t('settings.ai.capabilities.vision')} className="text-green-500"><ImageIcon className="h-3 w-3" /></span>
        )}
        {model.contextWindow && (
          <span className="text-muted-foreground tabular-nums">{Math.round(model.contextWindow / 1000)}k</span>
        )}
      </div>
    </div>
  );
}

export function RegistryProviderCard({ provider, isDefault, enabledModels, onSetDefault, onConfigureKey, onConfigureModels }: RegistryProviderCardProps) {
  const { t } = useTranslation('common');
  const [expanded, setExpanded] = useState(false);

  const availableModels = useMemo(() => {
    if (!enabledModels) return provider.models;
    const enabledSet = new Set(enabledModels);
    return provider.models.filter(m => enabledSet.has(m.id));
  }, [provider.models, enabledModels]);

  const agenticModels = availableModels.filter((m) => m.toolCall);
  const modelCount = provider.models.length;
  const availableCount = availableModels.length;
  const isRestricted = !!enabledModels;
  const itemData = useMemo(() => ({ models: agenticModels, t }), [agenticModels, t]);

  return (
    <div className="border rounded-lg overflow-hidden transition-colors hover:border-border/80 group">
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="h-10 w-10 shrink-0 rounded-md bg-muted flex items-center justify-center">
              <ModelSelectorLogo provider={provider.id} className="size-5" />
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
                    <Badge variant="outline" className="text-xs gap-1 h-5 px-1.5"><Zap className="h-3 w-3" />{t('settings.ai.builtIn')}</Badge>
                    {provider.isConfigured ? (
                      <Badge variant="outline" className="text-xs gap-1 h-5 px-1.5 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800">
                        <CheckCircle className="h-3 w-3" />{t('settings.ai.keyConfigured')}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs gap-1 h-5 px-1.5"><AlertCircle className="h-3 w-3" />{t('settings.ai.noKey')}</Badge>
                    )}
                    {isRestricted && (
                      <Badge variant="secondary" className="text-xs gap-1 h-5 px-1.5"><ListFilter className="h-3 w-3" />{t('settings.ai.restricted')}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded inline-block">
                    <span>{provider.id}</span><span className="mx-1.5">•</span>
                    <span>{availableCount} {t('settings.ai.modelsAvailable')}</span>
                    {isRestricted && <span className="text-muted-foreground/60"> ({t('settings.ai.outOfTotal', { total: modelCount })})</span>}
                  </p>
                </div>
              </HoverCardTrigger>
              <HoverCardContent className="w-72">
                <div className="space-y-2 text-sm">
                  <div className="font-semibold">{t('settings.ai.details.title')}</div>
                  <div className="text-xs text-muted-foreground">{t('settings.ai.details.providerId')}: <span className="font-mono text-foreground">{provider.id}</span></div>
                  <div className="text-xs text-muted-foreground">{t('settings.ai.details.modelCount', { count: modelCount, agentic: agenticModels.length })}</div>
                </div>
              </HoverCardContent>
            </HoverCard>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button variant="outline" size="sm" className="h-8 ml-2 gap-1.5" onClick={(e) => { e.stopPropagation(); onConfigureKey(); }}>
              <Key className="h-3.5 w-3.5" />{t('settings.ai.apiKey')}
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={(e) => { e.stopPropagation(); onConfigureModels(); }}>
              <Settings className="h-3.5 w-3.5" />{t('settings.ai.models')}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"><MoreVertical className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onSetDefault} disabled={isDefault}>
                  <Star className={cn("h-4 w-4 mr-2", isDefault && "fill-current")} />{t('settings.ai.setDefault')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {agenticModels.length > 0 && (
          <div className="mt-4 pl-[56px]">
            <Button variant="ghost" size="sm" className="h-7 px-2 -ml-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => setExpanded(!expanded)}>
              <ChevronDown className={`h-3.5 w-3.5 mr-1.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              {expanded ? t('settings.ai.hideModels') : t('settings.ai.showModels')}
            </Button>
          </div>
        )}
      </div>

      {expanded && agenticModels.length > 0 && (
        <div className="border-t bg-muted/30 pl-[72px] pr-4 py-3">
          <List rowCount={agenticModels.length} rowHeight={28} rowProps={itemData} style={{ height: Math.min(agenticModels.length * 28, 400), width: '100%' }} rowComponent={ModelRow} />
        </div>
      )}
    </div>
  );
}
