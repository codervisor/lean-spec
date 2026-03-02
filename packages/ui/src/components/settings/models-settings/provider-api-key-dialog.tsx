import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Badge,
  ModelSelectorLogo,
} from '@/library';
import { CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import type { RegistryProvider } from '../../../types/models-registry';

function Label({ htmlFor, children, className = '' }: { htmlFor?: string; children: React.ReactNode; className?: string }) {
  return <label htmlFor={htmlFor} className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}>{children}</label>;
}

export interface ProviderApiKeyDialogProps {
  provider: RegistryProvider;
  onSave: (apiKey: string, baseUrl?: string) => Promise<void>;
  onCancel: () => void;
}

export function ProviderApiKeyDialog({ provider, onSave, onCancel }: ProviderApiKeyDialogProps) {
  const { t } = useTranslation('common');
  const [apiKey, setApiKey] = useState('');
  const [resourceName, setResourceName] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  const requiredEnvVars = provider.requiredEnvVars ?? [];
  const isAzure = provider.id === 'azure' || requiredEnvVars.some(v => v.includes('AZURE_RESOURCE_NAME'));

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) { setKeyError(t('settings.ai.errors.apiKeyRequired')); return; }
    if (isAzure && !resourceName.trim()) { setKeyError(t('settings.ai.errors.azureResourceNameRequired')); return; }
    try {
      setSavingKey(true);
      setKeyError(null);
      let baseUrl: string | undefined;
      if (isAzure && resourceName.trim()) baseUrl = `https://${resourceName.trim()}.openai.azure.com/openai`;
      await onSave(apiKey.trim(), baseUrl);
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : t('settings.ai.errors.saveFailed'));
    } finally {
      setSavingKey(false);
    }
  };

  const handleClearApiKey = async () => {
    try {
      setSavingKey(true);
      setKeyError(null);
      await onSave('');
      setApiKey('');
      setResourceName('');
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : t('settings.ai.errors.saveFailed'));
    } finally {
      setSavingKey(false);
    }
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 shrink-0 rounded-md bg-muted flex items-center justify-center border">
              <ModelSelectorLogo provider={provider.id} className="size-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <DialogTitle>{t('settings.ai.configureProvider', { provider: provider.name })}</DialogTitle>
                {provider.isConfigured ? (
                  <Badge variant="outline" className="text-xs gap-1 h-5 px-1.5 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800">
                    <CheckCircle className="h-3 w-3" />{t('settings.ai.keyConfigured')}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs gap-1 h-5 px-1.5"><AlertCircle className="h-3 w-3" />{t('settings.ai.noKey')}</Badge>
                )}
              </div>
              <DialogDescription className="text-left">{t('settings.ai.configureProviderDescription')}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            {isAzure ? t('settings.ai.azureApiKeyDialogDescription', { provider: provider.name }) : t('settings.ai.apiKeyDialogDescription', { provider: provider.name })}
          </div>
          {isAzure && (
            <div className="space-y-2">
              <Label htmlFor="azure-resource-name">{t('settings.ai.azureResourceName')} <span className="text-destructive">*</span></Label>
              <Input id="azure-resource-name" type="text" value={resourceName} onChange={(e) => setResourceName(e.target.value)} placeholder={t('settings.ai.placeholders.azureResourceName')} />
              <p className="text-xs text-muted-foreground">{t('settings.ai.azureResourceNameHelp')}</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="api-key">{t('settings.ai.apiKey')} <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Input id="api-key" type={showKey ? 'text' : 'password'} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={t('settings.ai.placeholders.apiKeyEnv', { provider: isAzure ? 'AZURE' : provider.id.toUpperCase() })} className="pr-10" />
              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowKey(!showKey)}>
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {keyError && <p className="text-xs text-destructive">{keyError}</p>}
            <p className="text-xs text-muted-foreground">{t('settings.ai.apiKeyStorageNote')}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>{t('actions.close')}</Button>
          {provider.isConfigured && <Button variant="destructive" onClick={handleClearApiKey} disabled={savingKey}>{t('settings.ai.clearApiKey')}</Button>}
          <Button onClick={handleSaveApiKey} disabled={savingKey}>{savingKey ? t('actions.saving') : t('actions.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
