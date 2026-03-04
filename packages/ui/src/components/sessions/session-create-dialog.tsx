import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/library';
import { useTranslation } from 'react-i18next';
import type { Session, SessionMode, Spec, RunnerDefinition } from '../../types/api';
import { api } from '../../lib/api';
import { SpecContextTrigger, SpecContextChips } from '../spec-context-attachments';
import { RunnerLogo } from '../library/ai-elements/runner-logo';
import { sessionModeConfig } from '../../lib/session-utils';
import { X } from 'lucide-react';

const MODES: SessionMode[] = ['guided', 'autonomous'];

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
  const [runnerDefs, setRunnerDefs] = useState<RunnerDefinition[]>([]);
  const [runner, setRunner] = useState('');
  const [runnerLoading, setRunnerLoading] = useState(false);
  const [model, setModel] = useState('');
  const [mode, setMode] = useState<SessionMode>('autonomous');
  const [selectedSpecIds, setSelectedSpecIds] = useState<string[]>(defaultSpecId ? [defaultSpecId] : []);
  const [promptTemplate, setPromptTemplate] = useState('');
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const canCreate = Boolean(projectPath);

  /** Get display label for a runner */
  const getRunnerLabel = useCallback(
    (runnerId: string) => {
      const key = `sessions.runners.${runnerId}` as const;
      const translated = t(key);
      // If i18n returns the key itself, fall back to the runner definition name or the id
      if (translated === key || translated === `sessions.runners.${runnerId}`) {
        const def = runnerDefs.find((r) => r.id === runnerId);
        return def?.name ?? runnerId;
      }
      return translated;
    },
    [t, runnerDefs],
  );

  useEffect(() => {
    setSelectedSpecIds(defaultSpecId ? [defaultSpecId] : []);
  }, [defaultSpecId]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    const loadRunners = async () => {
      try {
        setRunnerLoading(true);
        const resp = await api.listRunners(projectPath ?? undefined);
        const candidates = (resp.runners ?? []).filter((r) => Boolean(r.command) && r.available !== false);
        const defs = candidates.sort((a, b) => {
          if (resp.default && a.id === resp.default) return -1;
          if (resp.default && b.id === resp.default) return 1;
          const left = a.name ?? a.id;
          const right = b.name ?? b.id;
          return left.localeCompare(right);
        });
        setRunnerDefs(defs);
        const defaultId =
          defs.find((def) => def.id === resp.default)?.id ?? defs[0]?.id ?? '';
        setRunner((prev) => (prev && defs.some((d) => d.id === prev) ? prev : defaultId));
      } catch (err) {
        setError(err instanceof Error ? err.message : t('settings.runners.errors.loadFailed'));
        setRunnerDefs([]);
      } finally {
        setRunnerLoading(false);
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

  useEffect(() => {
    const selected = runnerDefs.find((def) => def.id === runner);
    const models = selected?.availableModels ?? [];
    if (!models.length) {
      setModel('');
      return;
    }
    const preferred = selected?.model ?? models[0] ?? '';
    setModel((prev) => (prev && models.includes(prev) ? prev : preferred));
  }, [runner, runnerDefs]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setError(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const runCreate = useCallback(async () => {
    if (!projectPath) return;
    setCreating(true);
    setError(null);
    try {
      const created = await api.createSession({
        projectPath,
        specIds: selectedSpecIds,
        prompt: promptTemplate.trim() || null,
        runner,
        mode,
        model: model || undefined,
      });
      // Start the runtime in the background — the server returns immediately
      // and the session transitions from Pending to Running asynchronously.
      void api.startSession(created.id);
      onCreated?.(created);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('sessions.errors.create'));
      throw err;
    } finally {
      setCreating(false);
    }
  }, [projectPath, selectedSpecIds, promptTemplate, runner, mode, model, onCreated, onOpenChange, t]);

  const selectedRunner = runnerDefs.find((def) => def.id === runner);
  const runnerModels = selectedRunner?.availableModels ?? [];

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/60 px-4 pt-20 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <div className="w-[min(860px,96vw)] rounded-xl border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">{t('sessions.dialogs.createTitle')}</h2>
            <p className="text-xs text-muted-foreground">{t('sessions.dialogs.createDescription')}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3 p-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <SpecContextChips
              specs={specs}
              selectedSpecIds={selectedSpecIds}
              onSelectedSpecIdsChange={setSelectedSpecIds}
              className="pb-2"
            />
          </div>

          <PromptInput onSubmit={() => void runCreate()}>
            <PromptInputBody>
              <PromptInputTextarea
                ref={inputRef}
                value={promptTemplate}
                onChange={(e) => setPromptTemplate(e.target.value)}
                placeholder={t('sessions.labels.promptPlaceholder')}
                disabled={creating}
                className="min-h-28"
              />
            </PromptInputBody>

            <PromptInputFooter>
              <div className="flex flex-wrap items-center gap-2">
                <SpecContextTrigger
                  specs={specs}
                  selectedSpecIds={selectedSpecIds}
                  onSelectedSpecIdsChange={setSelectedSpecIds}
                  searchPlaceholder={t('sessions.select.search')}
                  emptyLabel={t('sessions.select.empty')}
                  triggerLabel={t('sessions.labels.attachSpec')}
                />

                <PromptInputSelect value={runner} onValueChange={setRunner}>
                  <PromptInputSelectTrigger className="h-8 w-auto rounded-full border border-border/70 px-3 py-1.5 text-xs">
                    <span className="flex items-center gap-1.5">
                      <RunnerLogo runnerId={runner} size={16} className="rounded-sm" />
                      <PromptInputSelectValue placeholder={t('sessions.labels.runner')} />
                    </span>
                  </PromptInputSelectTrigger>
                  <PromptInputSelectContent>
                    {runnerDefs.map((def) => (
                      <PromptInputSelectItem key={def.id} value={def.id}>
                        <span className="flex items-center gap-2">
                          <RunnerLogo runnerId={def.id} size={16} className="rounded-sm" />
                          {getRunnerLabel(def.id)}
                          {def.available !== true && (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px] text-muted-foreground">
                              {t('settings.runners.validation.checking')}
                            </Badge>
                          )}
                        </span>
                      </PromptInputSelectItem>
                    ))}
                  </PromptInputSelectContent>
                </PromptInputSelect>

                {runnerModels.length > 0 && (
                  <PromptInputSelect value={model} onValueChange={setModel}>
                    <PromptInputSelectTrigger className="h-8 w-auto rounded-full border border-border/70 px-3 py-1.5 text-xs">
                      <PromptInputSelectValue placeholder={t('sessions.labels.model')} />
                    </PromptInputSelectTrigger>
                    <PromptInputSelectContent>
                      {runnerModels.map((modelId) => (
                        <PromptInputSelectItem key={modelId} value={modelId}>
                          {modelId}
                        </PromptInputSelectItem>
                      ))}
                    </PromptInputSelectContent>
                  </PromptInputSelect>
                )}

                {runnerLoading && (
                  <span className="text-xs text-muted-foreground">{t('settings.runners.validation.checking')}</span>
                )}

                <PromptInputSelect value={mode} onValueChange={(value) => setMode(value as SessionMode)}>
                  <PromptInputSelectTrigger className="h-8 w-auto rounded-full border border-border/70 px-3 py-1.5 text-xs">
                    <span className="flex items-center gap-1.5">
                      {(() => {
                        const ModeIcon = sessionModeConfig[mode]?.icon;
                        return ModeIcon ? <ModeIcon className="h-3.5 w-3.5" /> : null;
                      })()}
                      <PromptInputSelectValue placeholder={t('sessions.labels.mode')} />
                    </span>
                  </PromptInputSelectTrigger>
                  <PromptInputSelectContent>
                    {MODES.map((modeValue) => {
                      const ModeIcon = sessionModeConfig[modeValue]?.icon;
                      return (
                        <PromptInputSelectItem key={modeValue} value={modeValue}>
                          <span className="flex items-center gap-2">
                            {ModeIcon && <ModeIcon className="h-3.5 w-3.5" />}
                            {t(`sessions.modes.${modeValue}`)}
                          </span>
                        </PromptInputSelectItem>
                      );
                    })}
                  </PromptInputSelectContent>
                </PromptInputSelect>
              </div>

              <PromptInputSubmit
                disabled={!canCreate || !runner || creating || (!promptTemplate.trim() && selectedSpecIds.length === 0)}
                status={creating ? 'submitted' : undefined}
              />
            </PromptInputFooter>
          </PromptInput>

        </div>
      </div>
    </div>
  );
}
