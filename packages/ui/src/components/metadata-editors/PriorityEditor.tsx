import { useState } from 'react';
import { AlertCircle, ArrowDown, ArrowUp, Loader2, Minus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@leanspec/ui-components';
import { cn } from '@leanspec/ui-components';
import { api } from '../../lib/api';
import type { Spec } from '../../types/api';
import { useTranslation } from 'react-i18next';
import { useSpecs } from '../../contexts';

const PRIORITY_OPTIONS: Array<{ value: NonNullable<Spec['priority']>; labelKey: `priority.${string}`; className: string; Icon: React.ComponentType<{ className?: string }> }> = [
  { value: 'critical', labelKey: 'priority.critical', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', Icon: AlertCircle },
  { value: 'high', labelKey: 'priority.high', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', Icon: ArrowUp },
  { value: 'medium', labelKey: 'priority.medium', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', Icon: Minus },
  { value: 'low', labelKey: 'priority.low', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400', Icon: ArrowDown },
];

interface PriorityEditorProps {
  specName: string;
  value: Spec['priority'];
  onChange?: (priority: NonNullable<Spec['priority']>) => void;
  expectedContentHash?: string;
  disabled?: boolean;
  className?: string;
}

export function PriorityEditor({
  specName,
  value,
  onChange,
  expectedContentHash,
  disabled = false,
  className,
}: PriorityEditorProps) {
  const initial = value || 'medium';
  const [priority, setPriority] = useState<NonNullable<Spec['priority']>>(initial as NonNullable<Spec['priority']>);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation('common');
  const { triggerRefresh } = useSpecs();

  const option = PRIORITY_OPTIONS.find((opt) => opt.value === priority) || PRIORITY_OPTIONS[1];

  const handleChange = async (next: NonNullable<Spec['priority']>) => {
    if (next === priority) return;
    const previous = priority;
    setPriority(next);
    setUpdating(true);
    setError(null);

    try {
      await api.updateSpec(specName, { priority: next, expectedContentHash });
      onChange?.(next);
      triggerRefresh(); // Notify other components to refresh
    } catch (err) {
      setPriority(previous);
      const message = err instanceof Error ? err.message : t('editors.priorityError');
      setError(message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-1">
      <Select
        value={priority}
        onValueChange={(value) => handleChange(value as NonNullable<Spec['priority']>)}
        disabled={disabled || updating}
      >
        <SelectTrigger
          className={cn(
            'h-7 w-fit min-w-[100px] border-0 px-2 text-xs font-medium justify-start',
            option.className,
            className,
            updating && 'opacity-70'
          )}
          aria-label={t('editors.changePriority')}
        >
          <div className="flex items-center gap-1.5">
            {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <option.Icon className="h-3.5 w-3.5" />}
            <SelectValue placeholder={t('specsPage.filters.priority')}>
              {t(option.labelKey)}
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent>
          {PRIORITY_OPTIONS.map((opt) => (
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
