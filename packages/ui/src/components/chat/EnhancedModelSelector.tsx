import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandInput,
  CommandEmpty,
  Badge,
  ModelSelectorLogo
} from '@leanspec/ui-components';
import { useModelsRegistry } from '../../lib/use-models-registry';
import { Check, ChevronsUpDown, Cpu, Zap, Coins, Eye, Wrench, ChevronRight } from 'lucide-react';
import { cn } from '@leanspec/ui-components';

interface EnhancedModelSelectorProps {
  value?: { providerId: string; modelId: string };
  onChange: (value: { providerId: string; modelId: string }) => void;
  disabled?: boolean;
}

export function EnhancedModelSelector({ value, onChange, disabled }: EnhancedModelSelectorProps) {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [collapsedProviders, setCollapsedProviders] = useState<Set<string>>(new Set());
  const { providers, loading, error, defaultSelection } = useModelsRegistry();

  const toggleProvider = (providerId: string) => {
    setCollapsedProviders(prev => {
      const next = new Set(prev);
      if (next.has(providerId)) {
        next.delete(providerId);
      } else {
        next.add(providerId);
      }
      return next;
    });
  };

  if (loading) {
    return <Button variant="outline" disabled className="w-[200px] justify-between">{t('actions.loading')}</Button>;
  }

  if (error || providers.length === 0) {
    return (
      <Button variant="outline" disabled className="text-destructive w-[200px] justify-between">
        {t('chat.modelsLoadError')}
      </Button>
    );
  }

  const selectedProviderId = value?.providerId ?? defaultSelection?.providerId ?? '';
  const selectedModelId = value?.modelId ?? defaultSelection?.modelId ?? '';

  const selectedProvider = providers.find(p => p.id === selectedProviderId);
  const selectedModel = selectedProvider?.models.find(m => m.id === selectedModelId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[250px] justify-between"
          disabled={disabled}
        >
          {selectedModel ? (
            <div className="flex items-center gap-2 text-left">
               {selectedProviderId && (
                <ModelSelectorLogo provider={selectedProviderId} className="h-6 w-6 shrink-0 rounded-sm" />
               )}
               <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium leading-none">{selectedModel.name}</span>
                <span className="text-xs text-muted-foreground leading-none">{selectedProvider?.name}</span>
               </div>
            </div>
          ) : (
            t('chat.modelSelector.selectPlaceholder')
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start">
        <Command>
          <div className="border-b px-3 py-2 text-[11px] text-muted-foreground">
            {t('chat.availableProvidersSummary', {
              count: providers.length,
            })}
          </div>
          <CommandInput
            placeholder={t('chat.searchModels')}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[500px]">
            <CommandEmpty>{t('chat.noModelsFound')}</CommandEmpty>
            {providers.map(provider => {
              const isCollapsed = collapsedProviders.has(provider.id) && search.length === 0;
              return (
                <CommandGroup
                  key={provider.id}
                  heading={
                    <div
                      className="flex items-center justify-between cursor-pointer hover:bg-muted/50 -mx-2 -my-1.5 px-2 py-1.5 rounded-sm group"
                      onClick={(e) => {
                        e.preventDefault();
                        if (search.length === 0) toggleProvider(provider.id);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <ModelSelectorLogo provider={provider.id} className="h-4 w-4" />
                        <span className="font-medium text-foreground">{provider.name}</span>
                      </div>
                      {search.length === 0 && (
                        <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", !isCollapsed && "rotate-90")} />
                      )}
                    </div>
                  }
                >
                  {!isCollapsed ? (
                    provider.models.map(model => (
                      <CommandItem
                        key={`${provider.id}-${model.id}`}
                        value={`${provider.name} ${model.name}`}
                        onSelect={() => {
                          onChange({ providerId: provider.id, modelId: model.id });
                          setOpen(false);
                        }}
                        className="flex items-start gap-2 py-3 cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 mt-1",
                            selectedProviderId === provider.id && selectedModelId === model.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{model.name}</span>
                            {model.toolCall && (
                              <Badge variant="secondary" className="text-[10px] px-1 h-4">{t('chat.modelSelector.badges.tool')}</Badge>
                            )}
                            {model.reasoning && (
                              <Badge variant="secondary" className="text-[10px] px-1 h-4">{t('chat.modelSelector.badges.reasoning')}</Badge>
                            )}
                            {model.vision && (
                              <Badge variant="secondary" className="text-[10px] px-1 h-4">{t('chat.modelSelector.badges.vision')}</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-0.5" title={t('chat.modelSelector.metrics.contextWindow')}>
                              <Cpu className="h-3 w-3" />
                              {model.contextWindow ?? '—'}
                            </span>
                            <span className="flex items-center gap-0.5" title={t('chat.modelSelector.metrics.maxOutput')}>
                              <Wrench className="h-3 w-3" />
                              {model.maxOutput ?? '—'}
                            </span>
                            <span className="flex items-center gap-0.5" title={t('chat.modelSelector.metrics.inputCost')}>
                              <Coins className="h-3 w-3" />
                              {model.inputCost !== undefined ? `$${model.inputCost}/M` : '—'}
                            </span>
                            <span className="flex items-center gap-0.5" title={t('chat.modelSelector.metrics.outputCost')}>
                              <Zap className="h-3 w-3" />
                              {model.outputCost !== undefined ? `$${model.outputCost}/M` : '—'}
                            </span>
                            {model.vision && (
                              <span className="flex items-center gap-0.5" title={t('chat.modelSelector.metrics.vision')}>
                                <Eye className="h-3 w-3" />
                                {t('chat.modelSelector.metrics.vision')}
                              </span>
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    ))
                  ) : (
                    <CommandItem value={`${provider.id}-dummy`} className="hidden" disabled aria-hidden>
                      {t('chat.modelSelector.hiddenItem')}
                    </CommandItem>
                  )}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
