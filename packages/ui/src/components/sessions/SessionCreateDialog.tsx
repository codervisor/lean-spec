import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@leanspec/ui-components';
import { useTranslation } from 'react-i18next';
import { Check, ChevronsUpDown } from 'lucide-react';
import type { Session, SessionMode } from '../../types/api';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';

const MODES: SessionMode[] = ['guided', 'autonomous', 'ralph'];

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
}

function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value
            ? options.find((option) => option.value === value)?.label
            : placeholder ?? "Select..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder ?? "Search..."} />
          <CommandList>
            <CommandEmpty>{emptyText ?? "No results found."}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

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

  const specSelectOptions = [
    { value: '', label: t('sessions.labels.noSpec') },
    ...(specOptions?.map((o) => ({ value: o.id, label: o.label })) ?? []),
  ];
  const toolOptions = tools.map((t) => ({ value: t, label: t }));
  const modeOptions = MODES.map((m) => ({ value: m, label: m }));

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
              <SearchableSelect
                value={specId}
                onValueChange={setSpecId}
                options={specSelectOptions}
                placeholder={t('sessions.labels.spec')}
              />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t('sessions.labels.tool')}</label>
            <SearchableSelect
              value={tool}
              onValueChange={setTool}
              options={toolOptions}
              placeholder={t('sessions.labels.tool')}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t('sessions.labels.mode')}</label>
            <SearchableSelect
              value={mode}
              onValueChange={(val) => setMode(val as SessionMode)}
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
