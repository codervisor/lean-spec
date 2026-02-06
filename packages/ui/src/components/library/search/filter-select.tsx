/**
 * FilterSelect component
 * Simple dropdown for filtering
 */

import * as React from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

export interface FilterOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface FilterSelectProps {
  /** Current selected value */
  value?: string;
  /** Available options */
  options: FilterOption[];
  /** Callback when selection changes */
  onChange?: (value: string) => void;
  /** Placeholder when no value selected */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
  /** Allow clearing selection */
  clearable?: boolean;
  /** Label for clear option */
  clearLabel?: string;
}

export function FilterSelect({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  className,
  clearable = true,
  clearLabel = 'All',
}: FilterSelectProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (optionValue: string) => {
    onChange?.(optionValue);
    setOpen(false);
  };

  const handleClear = () => {
    onChange?.('');
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className="w-full justify-between"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption?.icon}
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          className={cn('ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform', open && 'rotate-180')}
        />
      </Button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
          {clearable && (
            <button
              type="button"
              className={cn(
                'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                !value && 'bg-accent'
              )}
              onClick={handleClear}
            >
              <span className="flex-1 text-left">{clearLabel}</span>
              {!value && <Check className="h-4 w-4" />}
            </button>
          )}
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                'relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                value === option.value && 'bg-accent'
              )}
              onClick={() => handleSelect(option.value)}
            >
              {option.icon}
              <span className="flex-1 text-left">{option.label}</span>
              {value === option.value && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
