import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  CheckCircle,
  Edit2,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Textarea,
} from '@leanspec/ui-components';
import { api } from '../../lib/api';
import type { RunnerDefinition, RunnerListResponse, RunnerScope } from '../../types/api';
import { useCurrentProject } from '../../hooks/useProjectQuery';

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

export function RunnerSettingsTab() {
  const { t } = useTranslation('common');
  const { currentProject } = useCurrentProject();
  const projectPath = currentProject?.path;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runners, setRunners] = useState<RunnerDefinition[]>([]);
  const [defaultRunner, setDefaultRunner] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingRunner, setEditingRunner] = useState<RunnerDefinition | null>(null);
  const [validatingId, setValidatingId] = useState<string | null>(null);

  const canManage = useMemo(() => Boolean(projectPath), [projectPath]);

  const applyResponse = (response: RunnerListResponse) => {
    setRunners(response.runners);
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

  const handleSaveRunner = async (payload: {
    id: string;
    name?: string | null;
    command: string;
    args?: string[];
    env?: Record<string, string>;
  }) => {
    if (!projectPath) return;

    try {
      const response = editingRunner
        ? await api.updateRunner(payload.id, {
          projectPath,
          runner: {
            name: payload.name ?? undefined,
            command: payload.command,
            args: payload.args,
            env: payload.env,
          },
          scope: DEFAULT_SCOPE,
        })
        : await api.createRunner({
          projectPath,
          runner: payload,
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

    setValidatingId(runner.id);
    try {
      await api.validateRunner(runner.id, projectPath);
      await loadRunners();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.runners.errors.validateFailed'));
    } finally {
      setValidatingId(null);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.runners.errors.defaultFailed'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-pulse text-muted-foreground">{t('actions.loading')}</div>
      </div>
    );
  }

  if (!canManage) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>{t('settings.runners.errors.noProject')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>{t('settings.runners.title')}</CardTitle>
              <CardDescription>{t('settings.runners.description')}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => loadRunners()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('actions.refresh')}
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
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {runners.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('settings.runners.empty')}</p>
          ) : (
            runners.map((runner) => (
              <div key={runner.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{runner.name || runner.id}</h3>
                      {defaultRunner === runner.id && (
                        <Badge variant="secondary" className="text-xs">
                          {t('settings.runners.default')}
                        </Badge>
                      )}
                      {runner.available ? (
                        <Badge variant="outline" className="text-xs gap-1">
                          <CheckCircle className="h-3 w-3" />
                          {t('settings.runners.available')}
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {t('settings.runners.unavailable')}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs capitalize">
                        {runner.source}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {runner.command}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingRunner(runner);
                        setShowDialog(true);
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteRunner(runner)}
                      disabled={runner.source === 'builtin'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleValidate(runner)}
                    disabled={validatingId === runner.id}
                  >
                    {t('actions.validate')}
                  </Button>
                  {defaultRunner !== runner.id && (
                    <Button variant="outline" size="sm" onClick={() => handleSetDefault(runner)}>
                      {t('settings.runners.setDefault')}
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

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
    command: string;
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

    if (!formData.command.trim()) {
      nextErrors.command = t('settings.runners.errors.commandRequired');
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
      command: formData.command.trim(),
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
              placeholder="claude"
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
              placeholder="Claude Code"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="runner-command">
              {t('settings.runners.fields.command')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="runner-command"
              value={formData.command}
              onChange={(event) => setFormData({ ...formData, command: event.target.value })}
              placeholder="claude"
            />
            {errors.command && <p className="text-xs text-destructive">{errors.command}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="runner-args">{t('settings.runners.fields.args')}</Label>
            <Textarea
              id="runner-args"
              value={formData.args}
              onChange={(event) => setFormData({ ...formData, args: event.target.value })}
              placeholder="--dangerously-skip-permissions\n--print"
            />
            <p className="text-xs text-muted-foreground">{t('settings.runners.fields.argsHelp')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="runner-env">{t('settings.runners.fields.env')}</Label>
            <Textarea
              id="runner-env"
              value={formData.env}
              onChange={(event) => setFormData({ ...formData, env: event.target.value })}
              placeholder="ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}"
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
