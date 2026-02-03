import { useState, useEffect } from 'react';
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
import type { ChatConfig } from '../../types/chat-config';
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
  const [config, setConfig] = useState<ChatConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch('/api/chat/config')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load config');
        return res.json();
      })
      .then((data) => {
        setConfig(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

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

  if (error || !config) {
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

  const selectedProviderId = value?.providerId ?? config.settings.defaultProviderId;
  const selectedModelId = value?.modelId ?? config.settings.defaultModelId;

  const selectedProvider = config.providers.find((p) => p.id === selectedProviderId);
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
          <CommandInput placeholder={t('chat.searchModels')} className="h-9" />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>{t('chat.noModelsFound')}</CommandEmpty>
            {config.providers.map((provider) => (
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
                    disabled={!provider.hasApiKey}
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
                      {!provider.hasApiKey && (
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
