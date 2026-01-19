import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@leanspec/ui-components';
import type { ChatConfig } from '../../types/chat-config';

interface ModelPickerProps {
  value?: { providerId: string; modelId: string };
  onChange: (value: { providerId: string; modelId: string }) => void;
  disabled?: boolean;
}

export function ModelPicker({ value, onChange, disabled }: ModelPickerProps) {
  const { t } = useTranslation('common');
  const [config, setConfig] = useState<ChatConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    return <div className="text-sm text-muted-foreground">{t('actions.loading')}</div>;
  }

  if (error || !config) {
    return <div className="text-sm text-destructive">{error || 'Failed to load config'}</div>;
  }

  const currentProvider = config.providers.find((p) => p.id === value?.providerId);
  const selectedProviderId = value?.providerId ?? config.settings.defaultProviderId;
  const selectedModelId = value?.modelId ?? config.settings.defaultModelId;

  const handleProviderChange = (providerId: string) => {
    const provider = config.providers.find((p) => p.id === providerId);
    const defaultModel = provider?.models.find((m) => m.default) ?? provider?.models[0];
    if (defaultModel) {
      onChange({ providerId, modelId: defaultModel.id });
    }
  };

  const handleModelChange = (modelId: string) => {
    onChange({ providerId: selectedProviderId, modelId });
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-muted-foreground whitespace-nowrap">
          {t('chat.settings.provider')}:
        </label>
        <Select value={selectedProviderId} onValueChange={handleProviderChange} disabled={disabled}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {config.providers.map((p) => (
              <SelectItem key={p.id} value={p.id} disabled={!p.hasApiKey}>
                {p.name}
                {!p.hasApiKey && <span className="text-muted-foreground ml-1">(no key)</span>}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1.5">
        <label className="text-xs text-muted-foreground whitespace-nowrap">
          {t('chat.settings.model')}:
        </label>
        <Select value={selectedModelId} onValueChange={handleModelChange} disabled={disabled}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {currentProvider?.models.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
