import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, cn, statusConfig } from '@/library';
import { api } from '../../lib/api';
import type { Spec } from '../../types/api';
import { useTranslation } from 'react-i18next';
import { useInvalidateSpecs } from '../../hooks/useSpecsQuery';

const STATUS_OPTIONS = Object.entries(statusConfig)
  .map(([value, config]) => ({
    value: value as NonNullable<Spec['status']>,
    labelKey: config.labelKey,
    className: config.className,
    Icon: config.icon,
  }));

interface StatusEditorProps {
  specName: string;
  value: Spec['status'];
  onChange?: (status: NonNullable<Spec['status']>) => void;
  expectedContentHash?: string;
  disabled?: boolean;
  className?: string;
}

export function StatusEditor({
  specName,
  value,
  onChange,
  expectedContentHash,
  disabled = false,
  className,
}: StatusEditorProps) {
  const initial = value || 'planned';
  const [status, setStatus] = useState<NonNullable<Spec['status']>>(initial as NonNullable<Spec['status']>);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation('common');
  const invalidateSpecs = useInvalidateSpecs();

  useEffect(() => {
    setStatus((value || 'planned') as NonNullable<Spec['status']>);
    setUpdating(false);
    setError(null);
  }, [value, specName]);

  const option = STATUS_OPTIONS.find((opt) => opt.value === status) || STATUS_OPTIONS[0];

  const handleChange = async (next: NonNullable<Spec['status']>) => {
    if (next === status) return;
    const previous = status;
    setStatus(next);
    setUpdating(true);
    setError(null);

    try {
      await api.updateSpec(specName, { status: next, expectedContentHash });
      onChange?.(next);
      invalidateSpecs();
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
            'h-7 w-fit min-w-0 sm:min-w-[120px] border-0 px-2 text-xs font-medium justify-center sm:justify-start',
            option.className,
            className,
            updating && 'opacity-70'
          )}
          aria-label={t('editors.changeStatus')}
        >
          <div className="flex items-center gap-1.5">
            {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <option.Icon className="h-3.5 w-3.5" />}
            <SelectValue placeholder={t('specsPage.filters.status')}>
              <span className="hidden sm:inline">{t(option.labelKey)}</span>
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
