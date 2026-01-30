import { useMemo, useState } from 'react';
import { Check, Plus, Search } from 'lucide-react';
import {
  Button,
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from '@leanspec/ui-components';
import type { Spec } from '../../types/api';

interface SpecSearchPickerProps {
  specs: Spec[];
  onSelect: (spec: Spec) => void;
  disabled?: boolean;
  excludeSpecNames?: string[];
  placeholder?: string;
  emptyLabel?: string;
}

const formatSpecNumber = (specNumber?: number | null) =>
  specNumber != null ? specNumber.toString().padStart(3, '0') : null;

export function SpecSearchPicker({
  specs,
  onSelect,
  disabled,
  excludeSpecNames = [],
  placeholder = 'Search specs...',
  emptyLabel = 'No specs found',
}: SpecSearchPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const excludeSet = useMemo(() => new Set(excludeSpecNames), [excludeSpecNames]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return specs
      .filter((spec) => !excludeSet.has(spec.specName))
      .filter((spec) => {
        if (!normalizedQuery) return true;
        const text = [spec.title, spec.specName, spec.specNumber?.toString()]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return text.includes(normalizedQuery);
      })
      .slice(0, 20);
  }, [excludeSet, query, specs]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-7 px-2 text-xs gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          {placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <div className="flex items-center px-3 border-b">
            <Search className="h-4 w-4 text-muted-foreground" />
            <CommandInput
              placeholder={placeholder}
              value={query}
              onValueChange={setQuery}
              className="border-0 focus:ring-0"
            />
          </div>
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            {filtered.map((spec) => {
              const specNumber = formatSpecNumber(spec.specNumber ?? null);
              const label = spec.title || spec.specName;
              return (
                <CommandItem
                  key={spec.specName}
                  value={`${specNumber ? `#${specNumber}` : ''} ${label}`.trim()}
                  onSelect={() => {
                    onSelect(spec);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <div className="flex items-start gap-2 w-full">
                    <Check
                      className={cn(
                        'mt-0.5 h-4 w-4 text-muted-foreground',
                        'opacity-0'
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {specNumber && (
                          <span className="text-xs font-mono text-muted-foreground">#{specNumber}</span>
                        )}
                        <span className="truncate text-sm font-medium">{label}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{spec.specName}</div>
                    </div>
                  </div>
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
