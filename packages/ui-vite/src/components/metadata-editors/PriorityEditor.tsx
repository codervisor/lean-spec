import { useState } from 'react';
import { AlertCircle, ArrowDown, ArrowUp, Loader2, Minus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@leanspec/ui-components';
import { cn } from '../../lib/utils';
import { api, type Spec } from '../../lib/api';

const PRIORITY_OPTIONS: Array<{ value: NonNullable<Spec['priority']>; label: string; className: string; Icon: React.ComponentType<{ className?: string }> }> = [
  { value: 'critical', label: 'Critical', className: 'bg-red-500/20 text-red-600 dark:text-red-400', Icon: AlertCircle },
  { value: 'high', label: 'High', className: 'bg-orange-500/20 text-orange-600 dark:text-orange-300', Icon: ArrowUp },
  { value: 'medium', label: 'Medium', className: 'bg-blue-500/20 text-blue-600 dark:text-blue-300', Icon: Minus },
  { value: 'low', label: 'Low', className: 'bg-gray-500/20 text-gray-600 dark:text-gray-300', Icon: ArrowDown },
];

interface PriorityEditorProps {
  specName: string;
  value: Spec['priority'];
  onChange?: (priority: NonNullable<Spec['priority']>) => void;
  disabled?: boolean;
  className?: string;
}

export function PriorityEditor({ specName, value, onChange, disabled = false, className }: PriorityEditorProps) {
  const initial = value || 'medium';
  const [priority, setPriority] = useState<NonNullable<Spec['priority']>>(initial as NonNullable<Spec['priority']>);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const option = PRIORITY_OPTIONS.find((opt) => opt.value === priority) || PRIORITY_OPTIONS[1];

  const handleChange = async (next: NonNullable<Spec['priority']>) => {
    if (next === priority) return;
    const previous = priority;
    setPriority(next);
    setUpdating(true);
    setError(null);

    try {
      await api.updateSpec(specName, { priority: next });
      onChange?.(next);
    } catch (err) {
      setPriority(previous);
      const message = err instanceof Error ? err.message : 'Failed to update priority';
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
            'h-8 w-fit min-w-[120px] border px-2 text-xs font-medium justify-start',
            option.className,
            className,
            updating && 'opacity-80'
          )}
          aria-label="Change priority"
        >
          <div className="flex items-center gap-2">
            {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <option.Icon className="h-3.5 w-3.5" />}
            <SelectValue placeholder="Priority" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {PRIORITY_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <opt.Icon className="h-4 w-4" />
                <span>{opt.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
