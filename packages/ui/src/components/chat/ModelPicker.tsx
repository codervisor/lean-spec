import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@leanspec/ui-components';
import { selectDefaultModelForProvider, useModelsRegistry } from '../../lib/use-models-registry';

interface ModelPickerProps {
  value?: { providerId: string; modelId: string };
  onChange: (value: { providerId: string; modelId: string }) => void;
  disabled?: boolean;
}

export function ModelPicker({ value, onChange, disabled }: ModelPickerProps) {
  const { t } = useTranslation('common');
  const { providers, loading, error, defaultSelection } = useModelsRegistry();

  if (loading) {
    return <div className="text-sm text-muted-foreground">{t('actions.loading')}</div>;
  }

  if (error || providers.length === 0) {
    return <div className="text-sm text-destructive">{error || t('chat.modelsLoadError')}</div>;
  }

  const selectedProviderId = value?.providerId ?? defaultSelection?.providerId ?? '';
  const selectedModelId = value?.modelId ?? defaultSelection?.modelId ?? '';
  const currentProvider = providers.find((provider) => provider.id === selectedProviderId);

  const handleProviderChange = (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    const defaultModel = provider ? selectDefaultModelForProvider(provider) : undefined;
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
            {providers.map((provider) => (
              <SelectItem
                key={provider.id}
                value={provider.id}
                disabled={!provider.isConfigured}
                className="cursor-pointer"
              >
                {provider.name}
                {!provider.isConfigured && (
                  <span className="text-muted-foreground ml-1">(no key)</span>
                )}
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
            {currentProvider?.models.map((model) => (
              <SelectItem key={model.id} value={model.id} className="cursor-pointer">
                {model.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
