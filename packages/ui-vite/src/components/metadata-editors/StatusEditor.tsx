import { useState } from 'react';
import { Archive, CheckCircle2, Clock, Loader2, PlayCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@leanspec/ui-components';
import { cn } from '../../lib/utils';
import { api, type Spec } from '../../lib/api';
import { useTranslation } from 'react-i18next';

const STATUS_OPTIONS: Array<{ value: NonNullable<Spec['status']>; labelKey: `status.${string}`; className: string; Icon: React.ComponentType<{ className?: string }> }> = [
  { value: 'planned', labelKey: 'status.planned', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', Icon: Clock },
  { value: 'in-progress', labelKey: 'status.inProgress', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', Icon: PlayCircle },
  { value: 'complete', labelKey: 'status.complete', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', Icon: CheckCircle2 },
  { value: 'archived', labelKey: 'status.archived', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400', Icon: Archive },
];

interface StatusEditorProps {
  specName: string;
  value: Spec['status'];
  onChange?: (status: NonNullable<Spec['status']>) => void;
  disabled?: boolean;
  className?: string;
}

export function StatusEditor({ specName, value, onChange, disabled = false, className }: StatusEditorProps) {
  const initial = value || 'planned';
  const [status, setStatus] = useState<NonNullable<Spec['status']>>(initial as NonNullable<Spec['status']>);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation('common');

  const option = STATUS_OPTIONS.find((opt) => opt.value === status) || STATUS_OPTIONS[0];

  const handleChange = async (next: NonNullable<Spec['status']>) => {
    if (next === status) return;
    const previous = status;
    setStatus(next);
    setUpdating(true);
    setError(null);

    try {
      await api.updateSpec(specName, { status: next });
      onChange?.(next);
    } catch (err) {
      setStatus(previous);
      const message = err instanceof Error ? err.message : t('editors.statusError');
      setError(message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-1">
      <Select value={status} onValueChange={(value) => handleChange(value as NonNullable<Spec['status']>)} disabled={disabled || updating}>
        <SelectTrigger
          className={cn(
            'h-7 w-fit min-w-[120px] border-0 px-2 text-xs font-medium justify-start',
            option.className,
            className,
            updating && 'opacity-70'
          )}
          aria-label={t('editors.changeStatus')}
        >
          <div className="flex items-center gap-1.5">
            {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <option.Icon className="h-3.5 w-3.5" />}
            <SelectValue placeholder={t('specsPage.filters.status')}>
              {t(option.labelKey)}
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <opt.Icon className="h-4 w-4" />
                <span>{t(opt.labelKey)}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
