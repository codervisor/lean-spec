import { useCallback, useEffect, useState } from 'react';
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@leanspec/ui-components';
import { useTranslation } from 'react-i18next';
import type { Session, SessionMode } from '../../types/api';
import { api } from '../../lib/api';

const MODES: SessionMode[] = ['guided', 'autonomous', 'ralph'];

interface SessionCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectPath?: string | null;
  defaultSpecId?: string | null;
  specOptions?: Array<{ id: string; label: string }>;
  onCreated?: (session: Session) => void;
}

export function SessionCreateDialog({
  open,
  onOpenChange,
  projectPath,
  defaultSpecId,
  specOptions,
  onCreated,
}: SessionCreateDialogProps) {
  const { t } = useTranslation('common');
  const [tools, setTools] = useState<string[]>([]);
  const [tool, setTool] = useState('claude');
  const [mode, setMode] = useState<SessionMode>('autonomous');
  const [specId, setSpecId] = useState(defaultSpecId ?? '');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = Boolean(projectPath);
  const showSpecSelect = (specOptions?.length ?? 0) > 0;

  useEffect(() => {
    setSpecId(defaultSpecId ?? '');
  }, [defaultSpecId]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    const loadTools = async () => {
      try {
        const available = await api.listAvailableTools();
        setTools(available.length ? available : ['claude', 'copilot', 'codex', 'opencode']);
      } catch {
        setTools(['claude', 'copilot', 'codex', 'opencode']);
      }
    };
    void loadTools();
  }, [open]);

  const runCreate = useCallback(async () => {
    if (!projectPath) return;
    setCreating(true);
    setError(null);
    try {
      const created = await api.createSession({
        projectPath,
        specId: showSpecSelect ? (specId || null) : (defaultSpecId ?? null),
        tool,
        mode,
      });
      await api.startSession(created.id);
      onCreated?.(created);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('sessions.errors.create'));
    } finally {
      setCreating(false);
    }
  }, [projectPath, showSpecSelect, specId, defaultSpecId, tool, mode, onCreated, onOpenChange, t]);

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
          {showSpecSelect && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t('sessions.labels.spec')}</label>
              <select
                value={specId}
                onChange={(event) => setSpecId(event.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">{t('sessions.labels.noSpec')}</option>
                {specOptions?.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t('sessions.labels.tool')}</label>
            <select
              value={tool}
              onChange={(event) => setTool(event.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {tools.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t('sessions.labels.mode')}</label>
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as SessionMode)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {MODES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
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
