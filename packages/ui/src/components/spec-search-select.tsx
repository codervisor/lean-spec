import { useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from '@/library';
import { useTranslation } from 'react-i18next';
import { Check, ChevronsUpDown, FileText } from 'lucide-react';
import type { Spec } from '../types/api';
import { StatusBadge } from './status-badge';
import { PriorityBadge } from './priority-badge';

export interface SpecSearchSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  specs: Spec[];
  placeholder?: string;
}

export function SpecSearchSelect({ value, onValueChange, specs, placeholder }: SpecSearchSelectProps) {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const fuse = useMemo(
    () =>
      new Fuse(specs, {
        keys: [
          { name: 'title', weight: 2 },
          { name: 'specNumber', weight: 1.5 },
          { name: 'specName', weight: 1 },
        ],
        threshold: 0.4,
        includeScore: true,
        minMatchCharLength: 2,
      }),
    [specs]
  );

  const results = useMemo(() => {
    if (!search) {
      return [...specs].sort((a, b) => (b.specNumber ?? 0) - (a.specNumber ?? 0)).slice(0, 10);
    }
    return fuse.search(search).map((r) => r.item).slice(0, 12);
  }, [search, fuse, specs]);

  const selectedSpec = specs.find((s) => s.specName === value);
  const selectedLabel = selectedSpec ? (selectedSpec.title || selectedSpec.specName) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedLabel ?? placeholder ?? t('sessions.labels.spec')}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={t('quickSearch.placeholder')}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{t('search.noResults')}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__no_spec__"
                onSelect={() => {
                  onValueChange('');
                  setOpen(false);
                  setSearch('');
                }}
              >
                <Check className={cn('mr-2 h-4 w-4', !value ? 'opacity-100' : 'opacity-0')} />
                {t('sessions.labels.noSpec')}
              </CommandItem>
              {results.map((spec) => {
                const specNumber =
                  spec.specNumber != null ? spec.specNumber.toString().padStart(3, '0') : null;
                const label = spec.title || spec.specName;
                return (
                  <CommandItem
                    key={spec.specName}
                    value={`${specNumber ? `#${specNumber}` : ''} ${label}`.trim()}
                    onSelect={() => {
                      onValueChange(spec.specName);
                      setOpen(false);
                      setSearch('');
                    }}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {specNumber && (
                            <span className="text-xs font-mono text-muted-foreground">#{specNumber}</span>
                          )}
                          <span className="truncate font-medium">{label}</span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{spec.specName}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {spec.status && <StatusBadge status={spec.status} />}
                        {spec.priority && <PriorityBadge priority={spec.priority} />}
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
