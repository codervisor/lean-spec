import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
} from '@/library';
import { useTranslation } from 'react-i18next';
import type { Session, SessionMode, Spec } from '../../types/api';
import { api } from '../../lib/api';
import { SpecSearchSelect } from '../spec-search-select';
import { SearchableSelect } from '../searchable-select';

const MODES: SessionMode[] = ['guided', 'autonomous']; // 'ralph' is deprecated

interface SessionCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectPath?: string | null;
  defaultSpecId?: string | null;
  onCreated?: (session: Session) => void;
}

export function SessionCreateDialog({
  open,
  onOpenChange,
  projectPath,
  defaultSpecId,
  onCreated,
}: SessionCreateDialogProps) {
  const { t } = useTranslation('common');
  const [runners, setRunners] = useState<string[]>([]);
  const [runner, setRunner] = useState('claude');
  const [mode, setMode] = useState<SessionMode>('autonomous');
  const [specId, setSpecId] = useState(defaultSpecId ?? '');
  const [prompt, setPrompt] = useState('');
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = Boolean(projectPath);

  useEffect(() => {
    setSpecId(defaultSpecId ?? '');
  }, [defaultSpecId]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    const loadRunners = async () => {
      try {
        const available = await api.listAvailableRunners(projectPath ?? undefined);
        setRunners(available.length ? available : ['claude', 'copilot', 'codex', 'opencode', 'aider', 'cline']);
      } catch {
        setRunners(['claude', 'copilot', 'codex', 'opencode', 'aider', 'cline']);
      }
    };
    const loadSpecs = async () => {
      try {
        const data = await api.getSpecs();
        setSpecs(data);
      } catch {
        // Best-effort; spec picker will be empty
      }
    };
    void loadRunners();
    void loadSpecs();
  }, [open, projectPath]);

  const runCreate = useCallback(async () => {
    if (!projectPath) return;
    setCreating(true);
    setError(null);
    try {
      const specIds = specId.trim() ? [specId.trim()] : [];
      const created = await api.createSession({
        projectPath,
        specIds,
        prompt: prompt.trim() || null,
        runner,
        mode,
      });
      // Start the runtime in the background — the server returns immediately
      // and the session transitions from Pending to Running asynchronously.
      void api.startSession(created.id);
      onCreated?.(created);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('sessions.errors.create'));
    } finally {
      setCreating(false);
    }
  }, [projectPath, specId, prompt, runner, mode, onCreated, onOpenChange, t]);

  const runnerOptions = runners.map((value) => ({ value, label: value }));
  const modeOptions = MODES.map((value) => ({ value, label: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(520px,90vw)]">
        <DialogHeader>
          <DialogTitle>{t('sessions.dialogs.createTitle')}</DialogTitle>
          <DialogDescription>{t('sessions.dialogs.createDescription')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t('sessions.labels.spec')}</label>
            <SpecSearchSelect
              value={specId}
              onValueChange={setSpecId}
              specs={specs}
              placeholder={t('sessions.labels.noSpec')}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t('sessions.labels.prompt')}</label>
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t('sessions.labels.promptPlaceholder')}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t('sessions.labels.runner')}</label>
            <SearchableSelect
              value={runner}
              onValueChange={setRunner}
              options={runnerOptions}
              placeholder={t('sessions.labels.runner')}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t('sessions.labels.mode')}</label>
            <SearchableSelect
              value={mode}
              onValueChange={(value) => setMode(value as SessionMode)}
              options={modeOptions}
              placeholder={t('sessions.labels.mode')}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {t('actions.cancel')}
          </Button>
          <Button size="sm" onClick={() => void runCreate()} disabled={!canCreate || creating}>
            {creating ? t('actions.loading') : t('sessions.actions.run')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
