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
  Badge
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
  const { providers, loading, error, summary, defaultSelection } = useModelsRegistry();

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
            <div className="flex flex-col items-start gap-0.5 text-left">
              <span className="text-sm font-medium leading-none">{selectedModel.name}</span>
              <span className="text-xs text-muted-foreground leading-none">{selectedProvider?.name}</span>
            </div>
          ) : (
            "Select model..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start">
        <Command>
          <div className="border-b px-3 py-2 text-[11px] text-muted-foreground">
            {t('chat.providersSummary', {
              total: summary.total,
              configured: summary.configuredCount,
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
                      <span className="font-medium text-foreground">{provider.name}</span>
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
                        disabled={!provider.isConfigured}
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
                            {!provider.isConfigured && (
                              <Badge variant="outline" className="text-[10px] px-1 h-4">{t('chat.noKey')}</Badge>
                            )}
                            {model.toolCall && (
                              <Badge variant="secondary" className="text-[10px] px-1 h-4">Tool</Badge>
                            )}
                            {model.reasoning && (
                              <Badge variant="secondary" className="text-[10px] px-1 h-4">Reasoning</Badge>
                            )}
                            {model.vision && (
                              <Badge variant="secondary" className="text-[10px] px-1 h-4">Vision</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-0.5" title="Context Window">
                              <Cpu className="h-3 w-3" />
                              {model.contextWindow ?? '—'}
                            </span>
                            <span className="flex items-center gap-0.5" title="Max Output">
                              <Wrench className="h-3 w-3" />
                              {model.maxOutput ?? '—'}
                            </span>
                            <span className="flex items-center gap-0.5" title="Input Cost">
                              <Coins className="h-3 w-3" />
                              {model.inputCost !== undefined ? `$${model.inputCost}/M` : '—'}
                            </span>
                            <span className="flex items-center gap-0.5" title="Output Cost">
                              <Zap className="h-3 w-3" />
                              {model.outputCost !== undefined ? `$${model.outputCost}/M` : '—'}
                            </span>
                            {model.vision && (
                              <span className="flex items-center gap-0.5" title="Vision">
                                <Eye className="h-3 w-3" />
                                Vision
                              </span>
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    ))
                  ) : (
                    <CommandItem value={`${provider.id}-dummy`} className="hidden" disabled aria-hidden>dummy</CommandItem>
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
