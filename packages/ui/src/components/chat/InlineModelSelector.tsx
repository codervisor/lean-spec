import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
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
  Button,
} from '@leanspec/ui-components';
import { useModelsRegistry } from '../../lib/use-models-registry';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@leanspec/ui-components';

interface InlineModelSelectorProps {
  value?: { providerId: string; modelId: string };
  onChange: (value: { providerId: string; modelId: string }) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Compact inline model selector for use in the prompt input footer.
 * Displays provider/model as a button that opens a popover.
 */
export function InlineModelSelector({
  value,
  onChange,
  disabled,
  className,
}: InlineModelSelectorProps) {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const { providers, loading, error, summary, defaultSelection } = useModelsRegistry();

  if (loading) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        className={cn('h-7 gap-1 text-xs text-muted-foreground', className)}
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        {t('actions.loading')}
      </Button>
    );
  }

  if (error || providers.length === 0) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        className={cn('h-7 text-xs text-destructive', className)}
      >
        {t('chat.modelError')}
      </Button>
    );
  }

  const selectedProviderId = value?.providerId ?? defaultSelection?.providerId ?? '';
  const selectedModelId = value?.modelId ?? defaultSelection?.modelId ?? '';

  const selectedProvider = providers.find((p) => p.id === selectedProviderId);
  const selectedModel = selectedProvider?.models.find((m) => m.id === selectedModelId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'h-7 gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer',
            className
          )}
          disabled={disabled}
        >
          <span className="font-medium">{selectedModel?.name ?? 'Select model'}</span>
          <span className="text-muted-foreground">({selectedProvider?.name})</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command>
          <div className="border-b px-3 py-2 text-[11px] text-muted-foreground">
            {t('chat.providersSummary', {
              total: summary.total,
              configured: summary.configuredCount,
            })}
          </div>
          <CommandInput placeholder={t('chat.searchModels')} className="h-9" />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>{t('chat.noModelsFound')}</CommandEmpty>
            {providers.map((provider) => (
              <CommandGroup key={provider.id} heading={provider.name}>
                {provider.models.map((model) => (
                  <CommandItem
                    key={`${provider.id}-${model.id}`}
                    value={`${provider.name} ${model.name}`}
                    onSelect={() => {
                      onChange({ providerId: provider.id, modelId: model.id });
                      setOpen(false);
                    }}
                    className="flex items-center gap-2 py-2 cursor-pointer"
                    disabled={!provider.isConfigured}
                  >
                    <Check
                      className={cn(
                        'h-4 w-4',
                        selectedProviderId === provider.id && selectedModelId === model.id
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    <div className="flex-1">
                      <span className="font-medium text-sm">{model.name}</span>
                      {!provider.isConfigured && (
                        <Badge variant="outline" className="ml-2 text-[10px] px-1 h-4">
                          {t('chat.noKey')}
                        </Badge>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
