import { useState, useEffect } from 'react';
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
import type { ChatConfig } from '../../types/chat-config';
import { Check, ChevronsUpDown, Cpu, Zap, Coins } from 'lucide-react';
import { cn } from '@leanspec/ui-components';

interface EnhancedModelSelectorProps {
  value?: { providerId: string; modelId: string };
  onChange: (value: { providerId: string; modelId: string }) => void;
  disabled?: boolean;
}

export function EnhancedModelSelector({ value, onChange, disabled }: EnhancedModelSelectorProps) {
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
    return <Button variant="outline" disabled className="w-[200px] justify-between">{t('actions.loading')}...</Button>;
  }

  if (error || !config) {
    return <Button variant="outline" disabled className="text-destructive w-[200px] justify-between">Error loading config</Button>;
  }

  const selectedProviderId = value?.providerId ?? config.settings.defaultProviderId;
  const selectedModelId = value?.modelId ?? config.settings.defaultModelId;
  
  const selectedProvider = config.providers.find(p => p.id === selectedProviderId);
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
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search models..." />
          <CommandList className="max-h-[500px]">
            <CommandEmpty>No model found.</CommandEmpty>
            {config.providers.map(provider => (
                <CommandGroup key={provider.id} heading={provider.name}>
                    {provider.models.map(model => (
                        <CommandItem
                            key={`${provider.id}-${model.id}`}
                            value={`${provider.name} ${model.name}`} // Searchable text
                            onSelect={() => {
                                onChange({ providerId: provider.id, modelId: model.id });
                                setOpen(false);
                            }}
                            className="flex items-start gap-2 py-3"
                            disabled={!provider.hasApiKey}
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
                                    {!provider.hasApiKey && <Badge variant="outline" className="text-[10px] px-1 h-4">No Key</Badge>}
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-0.5" title="Context Window">
                                        <Cpu className="h-3 w-3" />
                                        {model.contextWindow}
                                    </span>
                                    {/* Mock usage cost logic or if available in config */}
                                    <span className="flex items-center gap-0.5" title="Input Cost">
                                        <Coins className="h-3 w-3" />
                                        Input: ${model.pricing?.input}/M
                                    </span>
                                    <span className="flex items-center gap-0.5" title="Output Cost">
                                        <Zap className="h-3 w-3" />
                                        Output: ${model.pricing?.output}/M
                                    </span>
                                </div>
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
