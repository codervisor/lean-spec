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
} from '@/library';
import { Plus, Trash2 } from 'lucide-react';
import type { Provider } from '../../../types/chat-config';

function Label({ htmlFor, children, className = '' }: { htmlFor?: string; children: React.ReactNode; className?: string }) {
  return <label htmlFor={htmlFor} className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}>{children}</label>;
}

export interface CustomProviderDialogProps {
  provider: Provider | null;
  existingIds: string[];
  onSave: (provider: Provider) => Promise<void>;
  onCancel: () => void;
}

export function CustomProviderDialog({ provider, existingIds, onSave, onCancel }: CustomProviderDialogProps) {
  const { t } = useTranslation('common');
  const [formData, setFormData] = useState({
    id: provider?.id ?? '',
    name: provider?.name ?? '',
    baseURL: provider?.baseURL ?? '',
    apiKey: '',
    models: provider?.models ?? [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showAddModel, setShowAddModel] = useState(false);
  const [newModel, setNewModel] = useState({ id: '', name: '' });
  const isEditing = !!provider;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.id.trim()) newErrors.id = t('settings.ai.errors.idRequired');
    else if (!isEditing && existingIds.includes(formData.id)) newErrors.id = t('settings.ai.errors.idExists');
    else if (!/^[a-z0-9-]+$/.test(formData.id)) newErrors.id = t('settings.ai.errors.idInvalid');
    if (!formData.name.trim()) newErrors.name = t('settings.ai.errors.nameRequired');
    if (formData.baseURL && !formData.baseURL.match(/^https?:\/\//)) newErrors.baseURL = t('settings.ai.errors.urlInvalid');
    if (!isEditing && !formData.apiKey.trim()) newErrors.apiKey = t('settings.ai.errors.apiKeyRequired');
    if (formData.models.length === 0) newErrors.models = t('settings.ai.errors.modelsRequired');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddModel = () => {
    if (!newModel.id.trim() || !newModel.name.trim()) return;
    if (formData.models.some((m) => m.id === newModel.id)) return;
    setFormData({ ...formData, models: [...formData.models, { id: newModel.id, name: newModel.name }] });
    setNewModel({ id: '', name: '' });
    setShowAddModel(false);
  };

  const handleRemoveModel = (modelId: string) => {
    setFormData({ ...formData, models: formData.models.filter((m) => m.id !== modelId) });
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      setSaving(true);
      await onSave({
        id: formData.id,
        name: formData.name,
        baseURL: formData.baseURL || undefined,
        models: formData.models,
        hasApiKey: true,
        apiKey: formData.apiKey || provider?.apiKey,
      });
    } catch { /* Error handled by parent */ } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('settings.ai.editCustomProvider') : t('settings.ai.addCustomProvider')}</DialogTitle>
          <DialogDescription>{t('settings.ai.customProviderDialogDescription')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="provider-id">{t('settings.ai.providerId')} <span className="text-destructive">*</span></Label>
            <Input id="provider-id" value={formData.id} onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase() })} placeholder={t('settings.ai.placeholders.customProviderId')} disabled={isEditing} />
            {errors.id && <p className="text-xs text-destructive">{errors.id}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="provider-name">{t('settings.ai.providerName')} <span className="text-destructive">*</span></Label>
            <Input id="provider-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder={t('settings.ai.placeholders.customProviderName')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="provider-baseurl">{t('settings.ai.baseURL')} <span className="text-destructive">*</span></Label>
            <Input id="provider-baseurl" value={formData.baseURL} onChange={(e) => setFormData({ ...formData, baseURL: e.target.value })} placeholder={t('settings.ai.placeholders.customProviderBaseUrl')} />
            {errors.baseURL && <p className="text-xs text-destructive">{errors.baseURL}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="provider-apikey">{t('settings.ai.apiKey')} {!isEditing && <span className="text-destructive">*</span>}</Label>
            <Input id="provider-apikey" type="password" value={formData.apiKey} onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })} placeholder={isEditing ? t('settings.ai.leaveEmptyToKeep') : t('settings.ai.placeholders.apiKeyPrefix')} />
            {errors.apiKey && <p className="text-xs text-destructive">{errors.apiKey}</p>}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('settings.ai.models')} <span className="text-destructive">*</span></Label>
              <Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => setShowAddModel(true)}><Plus className="h-3 w-3 mr-1" />{t('settings.ai.addModel')}</Button>
            </div>
            {errors.models && <p className="text-xs text-destructive">{errors.models}</p>}
            {showAddModel && (
              <div className="flex gap-2 p-2 border rounded bg-muted/30">
                <Input placeholder={t('settings.ai.modelId')} value={newModel.id} onChange={(e) => setNewModel({ ...newModel, id: e.target.value })} className="flex-1" />
                <Input placeholder={t('settings.ai.modelName')} value={newModel.name} onChange={(e) => setNewModel({ ...newModel, name: e.target.value })} className="flex-1" />
                <Button size="sm" onClick={handleAddModel}>{t('actions.add')}</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddModel(false)}>{t('actions.cancel')}</Button>
              </div>
            )}
            <div className="space-y-1">
              {formData.models.map((model) => (
                <div key={model.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-muted/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs text-muted-foreground">{model.id}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="truncate">{model.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleRemoveModel(model.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
              {formData.models.length === 0 && !showAddModel && (
                <p className="text-xs text-muted-foreground py-2 text-center">{t('settings.ai.noModelsAdded')}</p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel} disabled={saving}>{t('actions.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? t('actions.saving') : t('actions.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
