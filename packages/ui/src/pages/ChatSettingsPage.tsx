import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Badge,
} from '@leanspec/ui-components';
import { ArrowLeft, Plus, Trash2, Edit2, CheckCircle, AlertCircle } from 'lucide-react';
import type { ChatConfig, Provider, Model } from '../types/chat-config';
import { PageContainer } from '../components/shared/PageContainer';

function Label({ htmlFor, children, className = '' }: { htmlFor?: string; children: React.ReactNode; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}>
      {children}
    </label>
  );
}

export function ChatSettingsPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [config, setConfig] = useState<ChatConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showProviderDialog, setShowProviderDialog] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [showModelDialog, setShowModelDialog] = useState(false);
  const [editingModel, setEditingModel] = useState<{ providerId: string; model: Model | null } | null>(null);
  const [providerToDelete, setProviderToDelete] = useState<string | null>(null);
  const [modelToDelete, setModelToDelete] = useState<{ providerId: string; modelId: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/chat/config');
      if (!res.ok) throw new Error('Failed to load config');
      const data = await res.json();
      setConfig(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (newConfig: ChatConfig) => {
    try {
      const res = await fetch('/api/chat/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      if (!res.ok) throw new Error('Failed to save config');
      const data = await res.json();
      setConfig(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  const handleDeleteProvider = (providerId: string) => {
    setProviderToDelete(providerId);
  };

  const executeDeleteProvider = async () => {
    if (!config || !providerToDelete) return;
    const providerId = providerToDelete;

    const newConfig = {
      ...config,
      providers: config.providers.filter((p) => p.id !== providerId),
    };

    // Update default provider if it was deleted
    if (config.settings.defaultProviderId === providerId) {
      newConfig.settings.defaultProviderId = newConfig.providers[0]?.id ?? '';
      newConfig.settings.defaultModelId = newConfig.providers[0]?.models[0]?.id ?? '';
    }

    await saveConfig(newConfig);
    setProviderToDelete(null);
  };

  const handleSaveProvider = async (provider: Provider) => {
    if (!config) return;

    const existingIndex = config.providers.findIndex((p) => p.id === provider.id);
    const newProviders = [...config.providers];

    if (existingIndex >= 0) {
      newProviders[existingIndex] = provider;
    } else {
      newProviders.push(provider);
    }

    await saveConfig({
      ...config,
      providers: newProviders,
    });

    setShowProviderDialog(false);
    setEditingProvider(null);
  };

  const handleSaveModel = async (providerId: string, model: Model) => {
    if (!config) return;

    const newProviders = config.providers.map((p) => {
      if (p.id !== providerId) return p;

      const existingIndex = p.models.findIndex((m) => m.id === model.id);
      const newModels = [...p.models];

      if (existingIndex >= 0) {
        newModels[existingIndex] = model;
      } else {
        newModels.push(model);
      }

      return { ...p, models: newModels };
    });

    await saveConfig({
      ...config,
      providers: newProviders,
    });

    setShowModelDialog(false);
    setEditingModel(null);
  };

  const handleDeleteModel = (providerId: string, modelId: string) => {
    setModelToDelete({ providerId, modelId });
  };

  const executeDeleteModel = async () => {
    if (!config || !modelToDelete) return;
    const { providerId, modelId } = modelToDelete;

    const newProviders = config.providers.map((p) => {
      if (p.id !== providerId) return p;
      return { ...p, models: p.models.filter((m) => m.id !== modelId) };
    });

    await saveConfig({
      ...config,
      providers: newProviders,
    });
    setModelToDelete(null);
  };

  const handleUpdateDefaults = async (field: 'maxSteps' | 'defaultProviderId' | 'defaultModelId', value: string | number) => {
    if (!config) return;

    const newSettings = { ...config.settings, [field]: value };

    // If changing provider, update model to first available
    if (field === 'defaultProviderId') {
      const provider = config.providers.find((p) => p.id === value);
      newSettings.defaultModelId = provider?.models[0]?.id ?? '';
    }

    await saveConfig({
      ...config,
      settings: newSettings,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">{t('actions.loading')}</div>
      </div>
    );
  }

  if (error || !config) {
    return (
      <PageContainer>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{error || 'Failed to load configuration'}</p>
            </div>
            <Button onClick={loadConfig} className="mt-4">
              {t('actions.retry')}
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <PageContainer contentClassName="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/chat')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t('chat.settings.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('chat.settings.description')}</p>
          </div>
        </div>

        {/* Providers Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('chat.settings.providers')}</CardTitle>
                <CardDescription>{t('chat.settings.providersDescription')}</CardDescription>
              </div>
              <Button
                onClick={() => {
                  setEditingProvider(null);
                  setShowProviderDialog(true);
                }}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('chat.settings.addProvider')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {config.providers.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                isDefault={config.settings.defaultProviderId === provider.id}
                onEdit={() => {
                  setEditingProvider(provider);
                  setShowProviderDialog(true);
                }}
                onDelete={() => handleDeleteProvider(provider.id)}
                onAddModel={() => {
                  setEditingModel({ providerId: provider.id, model: null });
                  setShowModelDialog(true);
                }}
                onEditModel={(model) => {
                  setEditingModel({ providerId: provider.id, model });
                  setShowModelDialog(true);
                }}
                onDeleteModel={(modelId) => handleDeleteModel(provider.id, modelId)}
              />
            ))}
          </CardContent>
        </Card>

        {/* Default Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t('chat.settings.defaults')}</CardTitle>
            <CardDescription>{t('chat.settings.defaultsDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="default-provider">{t('chat.settings.defaultProvider')}</Label>
                <Select
                  value={config.settings.defaultProviderId}
                  onValueChange={(value) => handleUpdateDefaults('defaultProviderId', value)}
                >
                  <SelectTrigger id="default-provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {config.providers.map((p) => (
                      <SelectItem key={p.id} value={p.id} disabled={!p.hasApiKey}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default-model">{t('chat.settings.defaultModel')}</Label>
                <Select
                  value={config.settings.defaultModelId}
                  onValueChange={(value) => handleUpdateDefaults('defaultModelId', value)}
                >
                  <SelectTrigger id="default-model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {config.providers
                      .find((p) => p.id === config.settings.defaultProviderId)
                      ?.models.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-steps">{t('chat.settings.maxSteps')}</Label>
                <Input
                  id="max-steps"
                  type="number"
                  min={1}
                  max={50}
                  value={config.settings.maxSteps}
                  onChange={(e) => handleUpdateDefaults('maxSteps', Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">{t('chat.settings.maxStepsHelp')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </PageContainer>

      {/* Provider Dialog */}
      {showProviderDialog && (
        <ProviderDialog
          provider={editingProvider}
          existingIds={config.providers.map((p) => p.id)}
          onSave={handleSaveProvider}
          onCancel={() => {
            setShowProviderDialog(false);
            setEditingProvider(null);
          }}
        />
      )}

      {/* Model Dialog */}
      {showModelDialog && editingModel && (
        <ModelDialog
          model={editingModel.model}
          providerId={editingModel.providerId}
          existingIds={
            config.providers.find((p) => p.id === editingModel.providerId)?.models.map((m) => m.id) ?? []
          }
          onSave={(model) => handleSaveModel(editingModel.providerId, model)}
          onCancel={() => {
            setShowModelDialog(false);
            setEditingModel(null);
          }}
        />
      )}

      {/* Delete Provider Confirmation */}
      <Dialog open={!!providerToDelete} onOpenChange={(open) => !open && setProviderToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Provider</DialogTitle>
            <DialogDescription>{t('chat.settings.confirmDeleteProvider')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProviderToDelete(null)}>{t('actions.cancel')}</Button>
            <Button variant="destructive" onClick={executeDeleteProvider}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Model Confirmation */}
      <Dialog open={!!modelToDelete} onOpenChange={(open) => !open && setModelToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Model</DialogTitle>
            <DialogDescription>{t('chat.settings.confirmDeleteModel')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModelToDelete(null)}>{t('actions.cancel')}</Button>
            <Button variant="destructive" onClick={executeDeleteModel}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ProviderCardProps {
  provider: Provider;
  isDefault: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAddModel: () => void;
  onEditModel: (model: Model) => void;
  onDeleteModel: (modelId: string) => void;
}

function ProviderCard({
  provider,
  isDefault,
  onEdit,
  onDelete,
  onAddModel,
  onEditModel,
  onDeleteModel,
}: ProviderCardProps) {
  const { t } = useTranslation('common');

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{provider.name}</h3>
            {isDefault && (
              <Badge variant="secondary" className="text-xs">
                {t('chat.settings.default')}
              </Badge>
            )}
            {provider.hasApiKey ? (
              <Badge variant="outline" className="text-xs gap-1">
                <CheckCircle className="h-3 w-3" />
                {t('chat.settings.keyConfigured')}
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-xs gap-1">
                <AlertCircle className="h-3 w-3" />
                {t('chat.settings.noKey')}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {provider.id} {provider.baseURL && `• ${provider.baseURL}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t('chat.settings.models')}</span>
          <Button variant="ghost" size="sm" onClick={onAddModel}>
            <Plus className="h-3 w-3 mr-1" />
            {t('chat.settings.addModel')}
          </Button>
        </div>
        <div className="space-y-1">
          {provider.models.map((model) => (
            <div key={model.id} className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted">
              <div>
                <span className="font-mono text-xs">{model.id}</span>
                <span className="mx-2 text-muted-foreground">•</span>
                <span>{model.name}</span>
                {model.maxTokens && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({model.maxTokens.toLocaleString()} tokens)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEditModel(model)}>
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDeleteModel(model.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface ProviderDialogProps {
  provider: Provider | null;
  existingIds: string[];
  onSave: (provider: Provider) => void;
  onCancel: () => void;
}

function ProviderDialog({ provider, existingIds, onSave, onCancel }: ProviderDialogProps) {
  const { t } = useTranslation('common');
  const [formData, setFormData] = useState({
    id: provider?.id ?? '',
    name: provider?.name ?? '',
    baseURL: provider?.baseURL ?? '',
    apiKey: '',
    hasApiKey: provider?.hasApiKey ?? false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!provider;

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.id.trim()) {
      newErrors.id = t('chat.settings.errors.idRequired');
    } else if (!isEditing && existingIds.includes(formData.id)) {
      newErrors.id = t('chat.settings.errors.idExists');
    } else if (!/^[a-z0-9-]+$/.test(formData.id)) {
      newErrors.id = t('chat.settings.errors.idInvalid');
    }

    if (!formData.name.trim()) {
      newErrors.name = t('chat.settings.errors.nameRequired');
    }

    if (formData.baseURL && !formData.baseURL.match(/^https?:\/\//)) {
      newErrors.baseURL = t('chat.settings.errors.urlInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const trimmedKey = formData.apiKey.trim();

    onSave({
      id: formData.id,
      name: formData.name,
      baseURL: formData.baseURL || undefined,
      models: provider?.models ?? [],
      hasApiKey: trimmedKey ? true : formData.hasApiKey,
      apiKey: trimmedKey || undefined,
    });
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('chat.settings.editProvider') : t('chat.settings.addProvider')}
          </DialogTitle>
          <DialogDescription>{t('chat.settings.providerDialogDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider-id">
              {t('chat.settings.providerId')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="provider-id"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              placeholder="openai"
              disabled={isEditing}
            />
            {errors.id && <p className="text-xs text-destructive">{errors.id}</p>}
            <p className="text-xs text-muted-foreground">{t('chat.settings.providerIdHelp')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider-name">
              {t('chat.settings.providerName')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="provider-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="OpenAI"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider-baseurl">{t('chat.settings.baseURL')}</Label>
            <Input
              id="provider-baseurl"
              value={formData.baseURL}
              onChange={(e) => setFormData({ ...formData, baseURL: e.target.value })}
              placeholder="https://api.openai.com/v1"
            />
            {errors.baseURL && <p className="text-xs text-destructive">{errors.baseURL}</p>}
            <p className="text-xs text-muted-foreground">{t('chat.settings.baseURLHelp')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider-apikey">{t('chat.settings.apiKey')}</Label>
            <Input
              id="provider-apikey"
              type="password"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              placeholder={isEditing ? '••••••••' : '${OPENAI_API_KEY}'}
            />
            <p className="text-xs text-muted-foreground">{t('chat.settings.apiKeyHelp')}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={handleSubmit}>{t('actions.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ModelDialogProps {
  model: Model | null;
  providerId: string;
  existingIds: string[];
  onSave: (model: Model) => void;
  onCancel: () => void;
}

function ModelDialog({ model, existingIds, onSave, onCancel }: ModelDialogProps) {
  const { t } = useTranslation('common');
  const [formData, setFormData] = useState({
    id: model?.id ?? '',
    name: model?.name ?? '',
    maxTokens: model?.maxTokens?.toString() ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!model;

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.id.trim()) {
      newErrors.id = t('chat.settings.errors.modelIdRequired');
    } else if (!isEditing && existingIds.includes(formData.id)) {
      newErrors.id = t('chat.settings.errors.modelIdExists');
    }

    if (!formData.name.trim()) {
      newErrors.name = t('chat.settings.errors.modelNameRequired');
    }

    if (formData.maxTokens && Number.isNaN(Number(formData.maxTokens))) {
      newErrors.maxTokens = t('chat.settings.errors.maxTokensInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    onSave({
      id: formData.id,
      name: formData.name,
      maxTokens: formData.maxTokens ? Number(formData.maxTokens) : undefined,
    });
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? t('chat.settings.editModel') : t('chat.settings.addModel')}</DialogTitle>
          <DialogDescription>{t('chat.settings.modelDialogDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="model-id">
              {t('chat.settings.modelId')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="model-id"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              placeholder="gpt-4o"
              disabled={isEditing}
            />
            {errors.id && <p className="text-xs text-destructive">{errors.id}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="model-name">
              {t('chat.settings.modelName')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="model-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="GPT-4o"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="model-maxtokens">{t('chat.settings.maxTokens')}</Label>
            <Input
              id="model-maxtokens"
              type="number"
              value={formData.maxTokens}
              onChange={(e) => setFormData({ ...formData, maxTokens: e.target.value })}
              placeholder="128000"
            />
            {errors.maxTokens && <p className="text-xs text-destructive">{errors.maxTokens}</p>}
            <p className="text-xs text-muted-foreground">{t('chat.settings.maxTokensHelp')}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={handleSubmit}>{t('actions.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
