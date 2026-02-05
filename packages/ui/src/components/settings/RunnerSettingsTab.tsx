import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  CheckCircle,
  Plus,
  RefreshCw,
  Trash2,
  MoreVertical,
  Play,
  Terminal,
  Star,
  Loader2,
  Settings,
} from 'lucide-react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Textarea,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  cn,
} from '@leanspec/ui-components';
import { api } from '../../lib/api';
import type { RunnerDefinition, RunnerListResponse, RunnerScope } from '../../types/api';
import { useCurrentProject } from '../../hooks/useProjectQuery';
import { SearchFilterBar } from '../shared/SearchFilterBar';
import { useToast } from '../../contexts';
import { useRunnerFiltersStore } from '../../stores/settings-filters';

const DEFAULT_SCOPE: RunnerScope = 'project';

function Label({ htmlFor, children, className = '' }: { htmlFor?: string; children: ReactNode; className?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
    >
      {children}
    </label>
  );
}

type ValidationStatus = 'idle' | 'checking' | 'valid' | 'invalid';

interface RunnerValidationState {
  status: ValidationStatus;
  error?: string;
  checkedAt?: number;
}

const RUNNER_VALIDATION_TTL_MS = 5 * 60 * 1000;

const getRunnerValidationCacheKey = (projectPath?: string | null) =>
  `settings-runner-validation-cache:${projectPath ?? 'global'}`;

const formatTimestamp = (timestamp?: number) => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString();
};

const readRunnerValidationCache = (projectPath?: string | null): Record<string, { valid: boolean; error?: string | null; checkedAt: number }> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(getRunnerValidationCacheKey(projectPath));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, { valid: boolean; error?: string | null; checkedAt: number }>;
    }
  } catch {
    return {};
  }
  return {};
};

const writeRunnerValidationCache = (
  projectPath: string | null | undefined,
  cache: Record<string, { valid: boolean; error?: string | null; checkedAt: number }>
) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getRunnerValidationCacheKey(projectPath), JSON.stringify(cache));
};

export function RunnerSettingsTab() {
  const { t } = useTranslation('common');
  const { toast } = useToast();
  const { currentProject } = useCurrentProject();
  const projectPath = currentProject?.path;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runners, setRunners] = useState<RunnerDefinition[]>([]);
  const [defaultRunner, setDefaultRunner] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingRunner, setEditingRunner] = useState<RunnerDefinition | null>(null);
  const [validatingRunners, setValidatingRunners] = useState<Record<string, boolean>>({});
  const [runnerValidation, setRunnerValidation] = useState<Record<string, RunnerValidationState>>({});
  const [validatingAll, setValidatingAll] = useState(false);
  const [autoValidated, setAutoValidated] = useState(false);

  // Filter/Search State - persisted via zustand store
  const {
    searchQuery,
    sortBy,
    showUnavailable,
    sourceFilter,
    setSearchQuery,
    setSortBy,
    setShowUnavailable,
    setSourceFilter,
  } = useRunnerFiltersStore();

  const canManage = useMemo(() => Boolean(projectPath), [projectPath]);

  const applyResponse = (response: RunnerListResponse | undefined) => {
    if (!response) {
      setRunners([]);
      setDefaultRunner(null);
      return;
    }
    setRunners(Array.isArray(response.runners) ? response.runners : []);
    setDefaultRunner(response.default ?? null);
  };

  const loadRunners = useCallback(async () => {
    if (!projectPath) {
      setError(t('settings.runners.errors.noProject'));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.listRunners(projectPath);
      applyResponse(response);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.runners.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [projectPath, t]);

  useEffect(() => {
    void loadRunners();
  }, [loadRunners]);

  const runnerIdsKey = useMemo(() => runners.map((runner) => runner.id).join('|'), [runners]);

  useEffect(() => {
    setAutoValidated(false);
  }, [projectPath, runnerIdsKey]);

  useEffect(() => {
    setRunnerValidation({});
  }, [projectPath]);

  const updateRunnerValidationCache = useCallback(
    (runnerId: string, valid: boolean, error?: string | null) => {
      const cache = readRunnerValidationCache(projectPath);
      cache[runnerId] = {
        valid,
        error,
        checkedAt: Date.now(),
      };
      writeRunnerValidationCache(projectPath, cache);
    },
    [projectPath]
  );

  const validateRunner = useCallback(
    async (runner: RunnerDefinition) => {
      if (!projectPath || !runner.command) return;

      setValidatingRunners((prev) => ({ ...prev, [runner.id]: true }));
      setRunnerValidation((prev) => ({
        ...prev,
        [runner.id]: {
          ...prev[runner.id],
          status: 'checking',
        },
      }));

      try {
        const response = await api.validateRunner(runner.id, projectPath);
        updateRunnerValidationCache(runner.id, response.valid, response.error ?? null);
        setRunnerValidation((prev) => ({
          ...prev,
          [runner.id]: {
            status: response.valid ? 'valid' : 'invalid',
            error: response.error ?? undefined,
            checkedAt: Date.now(),
          },
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : t('settings.runners.errors.validateFailed');
        updateRunnerValidationCache(runner.id, false, message);
        setRunnerValidation((prev) => ({
          ...prev,
          [runner.id]: {
            status: 'invalid',
            error: message,
            checkedAt: Date.now(),
          },
        }));
        setError(message);
      } finally {
        setValidatingRunners((prev) => {
          const next = { ...prev };
          delete next[runner.id];
          return next;
        });
      }
    },
    [projectPath, t, updateRunnerValidationCache]
  );

  const handleRevalidateAll = useCallback(async () => {
    if (!projectPath) return;
    const runnable = runners.filter((runner) => Boolean(runner.command));
    if (runnable.length === 0) return;
    setValidatingAll(true);
    await Promise.allSettled(runnable.map((runner) => validateRunner(runner)));
    await loadRunners();
    setValidatingAll(false);
  }, [loadRunners, projectPath, runners, validateRunner]);

  useEffect(() => {
    if (loading || autoValidated || !projectPath) return;
    const cache = readRunnerValidationCache(projectPath);
    const now = Date.now();
    const cachedState: Record<string, RunnerValidationState> = {};
    const toValidate: RunnerDefinition[] = [];

    runners.forEach((runner) => {
      if (!runner.command) return;
      const cached = cache[runner.id];
      if (cached && now - cached.checkedAt < RUNNER_VALIDATION_TTL_MS) {
        cachedState[runner.id] = {
          status: cached.valid ? 'valid' : 'invalid',
          error: cached.error ?? undefined,
          checkedAt: cached.checkedAt,
        };
      } else {
        toValidate.push(runner);
      }
    });

    if (Object.keys(cachedState).length > 0) {
      setRunnerValidation((prev) => ({ ...prev, ...cachedState }));
    }

    if (toValidate.length === 0) {
      setAutoValidated(true);
      return;
    }

    setValidatingAll(true);
    Promise.allSettled(toValidate.map((runner) => validateRunner(runner)))
      .then(() => loadRunners())
      .finally(() => {
        setValidatingAll(false);
        setAutoValidated(true);
      });
  }, [autoValidated, loading, loadRunners, projectPath, runners, validateRunner]);

  const handleSaveRunner = async (payload: {
    id: string;
    name?: string | null;
    command?: string | null;
    args?: string[];
    env?: Record<string, string>;
  }) => {
    if (!projectPath) return;

    const trimmedCommand = payload.command?.trim() ?? '';
    const command = trimmedCommand.length > 0 ? trimmedCommand : undefined;

    try {
      const response = editingRunner
        ? await api.updateRunner(payload.id, {
          projectPath,
          runner: {
            name: payload.name ?? undefined,
            command,
            args: payload.args,
            env: payload.env,
          },
          scope: DEFAULT_SCOPE,
        })
        : await api.createRunner({
          projectPath,
          runner: {
            ...payload,
            command,
          },
          scope: DEFAULT_SCOPE,
        });

      applyResponse(response);
      setShowDialog(false);
      setEditingRunner(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.runners.errors.saveFailed'));
    }
  };

  const handleDeleteRunner = async (runner: RunnerDefinition) => {
    if (!projectPath) return;
    if (!confirm(t('settings.runners.confirmDelete', { id: runner.id }))) return;

    try {
      const response = await api.deleteRunner(runner.id, {
        projectPath,
        scope: DEFAULT_SCOPE,
      });
      applyResponse(response);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.runners.errors.deleteFailed'));
    }
  };

  const handleValidate = async (runner: RunnerDefinition) => {
    if (!projectPath) return;
    try {
      await validateRunner(runner);
      await loadRunners();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.runners.errors.validateFailed'));
    }
  };

  const handleSetDefault = async (runner: RunnerDefinition) => {
    if (!projectPath) return;

    try {
      const response = await api.setDefaultRunner({
        projectPath,
        runnerId: runner.id,
        scope: DEFAULT_SCOPE,
      });
      applyResponse(response);
      setError(null);
      toast({
        title: t('settings.runners.toasts.defaultRunner', { runner: runner.name || runner.id }),
        variant: 'success',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.runners.errors.defaultFailed'));
    }
  };

  // Filter and Sort Runners
  const filteredRunners = useMemo(() => {
    let result = [...runners];

    // Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.name?.toLowerCase().includes(q) ||
          r.command?.toLowerCase().includes(q)
      );
    }

    if (!showUnavailable) {
      // Only show available runners (or those without command like IDE extensions if handled that way, 
      // but here unavailable usually means command check failed)
      result = result.filter(r => r.available !== false);
    }

    if (sourceFilter !== 'all') {
      result = result.filter(r => r.source === sourceFilter);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'available') {
        // Available first
        if (a.available !== b.available) return (b.available ? 1 : 0) - (a.available ? 1 : 0);
      }
      // Default to name
      const nameA = a.name || a.id;
      const nameB = b.name || b.id;
      return nameA.localeCompare(nameB);
    });

    return result;
  }, [runners, searchQuery, showUnavailable, sourceFilter, sortBy]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-pulse text-muted-foreground">{t('actions.loading')}</div>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="p-6 border rounded-lg">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p>{t('settings.runners.errors.noProject')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] overflow-hidden">
      {/* Header Section */}
      <div className="flex-none space-y-4 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold">{t('settings.runners.title')}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{t('settings.runners.description')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => loadRunners()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('actions.refresh')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRevalidateAll}
              disabled={validatingAll || !runners.some((runner) => runner.command)}
            >
              <Loader2 className={`h-4 w-4 mr-2 ${validatingAll ? 'animate-spin' : ''}`} />
              {t('settings.runners.validation.revalidateAll')}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditingRunner(null);
                setShowDialog(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('settings.runners.addRunner')}
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t('settings.runners.searchPlaceholder')}
          sortBy={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { value: 'name', label: t('settings.runners.sort.name') },
            { value: 'available', label: t('settings.runners.sort.available') },
          ]}
          filters={[
            {
              label: t('settings.runners.filters.status'),
              options: [
                {
                  id: 'unavailable',
                  label: t('settings.runners.filters.showUnavailable'),
                  checked: showUnavailable,
                  onCheckedChange: setShowUnavailable
                }
              ]
            },
            {
              label: t('settings.runners.filters.source'),
              type: 'radio' as const,
              options: [],
              value: sourceFilter,
              onValueChange: (v: string) => setSourceFilter(v as 'all' | 'builtin' | 'custom'),
              radioOptions: [
                { value: 'all', label: t('settings.runners.filters.allSources') },
                { value: 'builtin', label: t('settings.runners.filters.builtin') },
                { value: 'custom', label: t('settings.runners.filters.custom') },
              ]
            }
          ]}
          resultCount={filteredRunners.length}
          totalCount={runners.length}
          filteredCountKey="settings.runners.filteredCount"
        />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-2">
        {filteredRunners.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
            {runners.length === 0 ? t('settings.runners.empty') : t('settings.runners.noResults')}
          </p>
        ) : (
          filteredRunners.map((runner) => {
            const validation = runnerValidation[runner.id];
            const lastCheckedLabel = formatTimestamp(validation?.checkedAt);

            const handleShortcut = (event: React.KeyboardEvent) => {
              if (event.key.toLowerCase() !== 'd') return;
              const target = event.target as HTMLElement | null;
              if (target && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName)) return;
              if (!runner.command || defaultRunner === runner.id) return;
              event.preventDefault();
              handleSetDefault(runner);
            };

            return (
              <div
                key={runner.id}
                className="border rounded-lg p-4 transition-colors hover:border-border/80 group"
                tabIndex={0}
                onKeyDown={handleShortcut}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="h-10 w-10 shrink-0 rounded-md bg-muted flex items-center justify-center">
                      <Terminal className="h-5 w-5 text-muted-foreground" />
                    </div>

                    <HoverCard openDelay={200} closeDelay={100}>
                      <HoverCardTrigger asChild>
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-medium leading-none">{runner.name || runner.id}</h4>
                            {defaultRunner === runner.id && (
                              <Badge variant="secondary" className="text-xs h-5 px-1.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800">
                                <Star className="h-3 w-3 mr-1 fill-current" />
                                {t('settings.runners.default')}
                              </Badge>
                            )}
                            {runner.command ? (
                              validatingRunners[runner.id] ? (
                                <Badge variant="outline" className="text-xs gap-1 h-5 px-1.5">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  {t('settings.runners.validation.checking')}
                                </Badge>
                              ) : runner.available ? (
                                <Badge variant="outline" className="text-xs gap-1 h-5 px-1.5 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800">
                                  <CheckCircle className="h-3 w-3" />
                                  {runner.version ? `v${runner.version}` : t('settings.runners.available')}
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-xs gap-1 h-5 px-1.5">
                                  <AlertCircle className="h-3 w-3" />
                                  {t('settings.runners.unavailable')}
                                </Badge>
                              )
                            ) : (
                              <Badge variant="secondary" className="text-xs h-5 px-1.5">
                                {t('settings.runners.ideOnly')}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded inline-block">
                            {runner.command ?? t('settings.runners.ideOnlyCommand')}
                          </p>
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-72">
                        <div className="space-y-2 text-sm">
                          <div className="font-semibold">{t('settings.runners.details.title')}</div>
                          <div className="text-xs text-muted-foreground">
                            {t('settings.runners.details.id')}: <span className="font-mono text-foreground">{runner.id}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t('settings.runners.details.source', { source: runner.source })}
                          </div>
                          {runner.version && (
                            <div className="text-xs text-muted-foreground">
                              {t('settings.runners.details.version')}: <span className="font-mono text-foreground">{runner.version}</span>
                            </div>
                          )}
                          {runner.command && lastCheckedLabel && (
                            <div className="text-xs text-muted-foreground">
                              {t('settings.runners.validation.lastChecked', { time: lastCheckedLabel })}
                            </div>
                          )}
                          {!runner.available && runner.command && (
                            <div className="text-xs text-destructive">{t('settings.runners.details.notFound')}</div>
                          )}
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 ml-2 text-muted-foreground hover:text-foreground hover:bg-muted"
                      onClick={() => {
                        setEditingRunner(runner);
                        setShowDialog(true);
                      }}
                    >
                      <Settings className="h-3.5 w-3.5 mr-1.5" />
                      {t('settings.ai.configure')}
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleSetDefault(runner)}
                          disabled={!runner.command || defaultRunner === runner.id}
                          className={cn(defaultRunner === runner.id && "text-yellow-500 focus:text-yellow-600")}
                        >
                          <Star className={cn("h-4 w-4 mr-2", defaultRunner === runner.id && "fill-current")} />
                          {t('settings.runners.setDefault')}
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => handleValidate(runner)}
                          disabled={Boolean(validatingRunners[runner.id]) || !runner.command}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          {t('actions.validate')}
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteRunner(runner)}
                          disabled={runner.source === 'builtin'}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('actions.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showDialog && (
        <RunnerDialog
          runner={editingRunner}
          existingIds={runners.map((runner) => runner.id)}
          onSave={handleSaveRunner}
          onCancel={() => {
            setShowDialog(false);
            setEditingRunner(null);
          }}
        />
      )}
    </div>
  );
}

interface RunnerDialogProps {
  runner: RunnerDefinition | null;
  existingIds: string[];
  onSave: (payload: {
    id: string;
    name?: string | null;
    command?: string | null;
    args?: string[];
    env?: Record<string, string>;
  }) => void;
  onCancel: () => void;
}

function RunnerDialog({ runner, existingIds, onSave, onCancel }: RunnerDialogProps) {
  const { t } = useTranslation('common');
  const isEditing = Boolean(runner);
  const [formData, setFormData] = useState({
    id: runner?.id ?? '',
    name: runner?.name ?? '',
    command: runner?.command ?? '',
    args: runner?.args?.join('\n') ?? '',
    env: runner?.env
      ? Object.entries(runner.env)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n')
      : '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!formData.id.trim()) {
      nextErrors.id = t('settings.runners.errors.idRequired');
    } else if (!isEditing && existingIds.includes(formData.id)) {
      nextErrors.id = t('settings.runners.errors.idExists');
    } else if (!/^[a-z0-9-]+$/.test(formData.id)) {
      nextErrors.id = t('settings.runners.errors.idInvalid');
    }

    if (formData.env.trim()) {
      const invalidLine = formData.env
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line.length > 0 && !line.includes('='));
      if (invalidLine) {
        nextErrors.env = t('settings.runners.errors.envInvalid');
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const args = formData.args
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean);

    const env: Record<string, string> = {};
    formData.env
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const [key, ...rest] = line.split('=');
        const value = rest.join('=').trim();
        if (key) {
          env[key.trim()] = value;
        }
      });

    onSave({
      id: formData.id.trim(),
      name: formData.name.trim() || null,
      command: formData.command.trim() || undefined,
      args: args.length ? args : undefined,
      env: Object.keys(env).length ? env : undefined,
    });
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('settings.runners.editRunner') : t('settings.runners.addRunner')}
          </DialogTitle>
          <DialogDescription>{t('settings.runners.dialogDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="runner-id">
              {t('settings.runners.fields.id')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="runner-id"
              value={formData.id}
              onChange={(event) => setFormData({ ...formData, id: event.target.value })}
              placeholder={t('settings.runners.placeholders.id')}
              disabled={isEditing}
            />
            {errors.id && <p className="text-xs text-destructive">{errors.id}</p>}
            <p className="text-xs text-muted-foreground">{t('settings.runners.fields.idHelp')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="runner-name">{t('settings.runners.fields.name')}</Label>
            <Input
              id="runner-name"
              value={formData.name}
              onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              placeholder={t('settings.runners.placeholders.name')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="runner-command">{t('settings.runners.fields.command')}</Label>
            <Input
              id="runner-command"
              value={formData.command}
              onChange={(event) => setFormData({ ...formData, command: event.target.value })}
              placeholder={t('settings.runners.placeholders.command')}
            />
            {errors.command && <p className="text-xs text-destructive">{errors.command}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="runner-args">{t('settings.runners.fields.args')}</Label>
            <Textarea
              id="runner-args"
              value={formData.args}
              onChange={(event) => setFormData({ ...formData, args: event.target.value })}
              placeholder={t('settings.runners.placeholders.args')}
            />
            <p className="text-xs text-muted-foreground">{t('settings.runners.fields.argsHelp')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="runner-env">{t('settings.runners.fields.env')}</Label>
            <Textarea
              id="runner-env"
              value={formData.env}
              onChange={(event) => setFormData({ ...formData, env: event.target.value })}
              placeholder={t('settings.runners.placeholders.env')}
            />
            {errors.env && <p className="text-xs text-destructive">{errors.env}</p>}
            <p className="text-xs text-muted-foreground">{t('settings.runners.fields.envHelp')}</p>
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
