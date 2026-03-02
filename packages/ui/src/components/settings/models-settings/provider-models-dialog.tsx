import { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Badge,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  Switch,
  cn,
} from '@/library';
import { CheckCircle, Check, ArrowUp, ArrowDown } from 'lucide-react';
import type { RegistryProvider } from '../../../types/models-registry';

function Label({ htmlFor, children, className = '' }: { htmlFor?: string; children: React.ReactNode; className?: string }) {
  return <label htmlFor={htmlFor} className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}>{children}</label>;
}

type ModelSortField = 'name' | 'tokens';
type ModelSortDirection = 'asc' | 'desc';

export interface ProviderModelsDialogProps {
  provider: RegistryProvider;
  initialEnabledModels: string[] | undefined;
  onSave: (models: string[] | undefined) => Promise<void>;
  onCancel: () => void;
}

export function ProviderModelsDialog({ provider, initialEnabledModels, onSave, onCancel }: ProviderModelsDialogProps) {
  const { t } = useTranslation('common');
  const [isRestricted, setIsRestricted] = useState(!!initialEnabledModels);
  const [enabledSet, setEnabledSet] = useState<Set<string>>(new Set(initialEnabledModels ?? provider.models.map(m => m.id)));
  const [savingModels, setSavingModels] = useState(false);
  const [sortField, setSortField] = useState<ModelSortField>('name');
  const [sortDirection, setSortDirection] = useState<ModelSortDirection>('asc');
  const hasUserInteracted = useRef(false);

  useEffect(() => {
    if (hasUserInteracted.current) return;
    if (isRestricted && enabledSet.size === 0 && !initialEnabledModels) {
      setEnabledSet(new Set(provider.models.map(m => m.id)));
    }
  }, [isRestricted, provider.models, initialEnabledModels, enabledSet.size]);

  const sortedModels = useMemo(() => {
    return [...provider.models].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') comparison = a.name.localeCompare(b.name);
      else if (sortField === 'tokens') comparison = (a.contextWindow ?? 0) - (b.contextWindow ?? 0);
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [provider.models, sortField, sortDirection]);

  const toggleSort = (field: ModelSortField) => {
    if (sortField === field) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };

  const toggleModel = (id: string) => {
    hasUserInteracted.current = true;
    const next = new Set(enabledSet);
    if (next.has(id)) next.delete(id); else next.add(id);
    setEnabledSet(next);
  };

  const toggleAll = () => {
    hasUserInteracted.current = true;
    setEnabledSet(enabledSet.size === provider.models.length ? new Set() : new Set(provider.models.map(m => m.id)));
  };

  const handleSaveModels = async () => {
    try {
      setSavingModels(true);
      await onSave(isRestricted ? Array.from(enabledSet) : undefined);
    } catch { /* Error handled by parent */ } finally {
      setSavingModels(false);
    }
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 shrink-0 border-b">
          <DialogTitle>{t('settings.ai.configureModels', { provider: provider.name })}</DialogTitle>
          <DialogDescription>{t('settings.ai.configureModelsDescription')}</DialogDescription>
        </DialogHeader>
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-6 py-2 shrink-0 flex items-center justify-between border-b bg-muted/20">
            <div className="flex items-center space-x-2">
              <Switch id="restrict-mode" checked={isRestricted} onCheckedChange={setIsRestricted} />
              <Label htmlFor="restrict-mode" className="font-medium">{t('settings.ai.restrictModels')}</Label>
            </div>
            {isRestricted && <div className="text-sm text-muted-foreground">{enabledSet.size} {t('settings.ai.selectedOf')} {provider.models.length}</div>}
          </div>
          <div className="flex-1 min-h-0 relative">
            {!isRestricted ? (
              <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-muted-foreground bg-muted/10">
                <div>
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <h3 className="text-lg font-medium text-foreground mb-2">{t('settings.ai.allModelsEnabled')}</h3>
                  <p className="max-w-xs mx-auto text-sm">{t('settings.ai.allModelsEnabledDesc')}</p>
                  <Button variant="outline" className="mt-6" onClick={() => setIsRestricted(true)}>{t('settings.ai.enableRestriction')}</Button>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col">
                <div className="p-2 border-b flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground mr-2">{t('settings.ai.modelSort.sortBy')}:</span>
                    <Button variant={sortField === 'name' ? 'secondary' : 'ghost'} size="sm" onClick={() => toggleSort('name')} className="text-xs h-7 gap-1">
                      {t('settings.ai.modelSort.name')}{sortField === 'name' && (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    </Button>
                    <Button variant={sortField === 'tokens' ? 'secondary' : 'ghost'} size="sm" onClick={() => toggleSort('tokens')} className="text-xs h-7 gap-1">
                      {t('settings.ai.modelSort.tokens')}{sortField === 'tokens' && (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    </Button>
                  </div>
                  <Button variant="ghost" size="sm" onClick={toggleAll} className="text-xs h-7">
                    {enabledSet.size === provider.models.length ? t('settings.ai.deselectAll') : t('settings.ai.selectAll')}
                  </Button>
                </div>
                <Command className="border-none">
                  <CommandInput placeholder={t('chat.searchModels')} className="border-none focus:ring-0" />
                  <CommandList className="max-h-full">
                    <CommandEmpty>{t('chat.noModelsFound')}</CommandEmpty>
                    <CommandGroup>
                      {sortedModels.map(model => (
                        <CommandItem key={model.id} value={`${model.name} ${model.id}`} onSelect={() => toggleModel(model.id)} className="flex items-center gap-3 py-2 cursor-pointer">
                          <div className={cn("flex h-4 w-4 items-center justify-center rounded-sm border border-primary", enabledSet.has(model.id) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                            <Check className="h-3 w-3" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{model.name}</span>
                              {model.toolCall && <Badge variant="secondary" className="text-[10px] h-4 px-1">{t('chat.modelSelector.badges.tool')}</Badge>}
                              {model.contextWindow && <Badge variant="outline" className="text-[10px] h-4 px-1 font-mono">{Math.round(model.contextWindow / 1000)}k</Badge>}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono truncate">{model.id}</div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </div>
            )}
          </div>
          <div className="p-4 border-t flex justify-end gap-2 bg-muted/10">
            <Button variant="outline" onClick={onCancel}>{t('actions.close')}</Button>
            <Button onClick={handleSaveModels} disabled={savingModels}>{savingModels ? t('actions.saving') : t('actions.save')}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
