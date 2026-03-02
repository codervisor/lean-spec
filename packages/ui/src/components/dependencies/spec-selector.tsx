import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
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
} from '@/library';
import { cn } from '@/library';
import type { DependencyGraph } from '../../types/api';

interface SpecSelectorProps {
  data: DependencyGraph;
  focusedNodeId: string | null;
  onSelectSpec: (specId: string) => void;
  onClearSelection: () => void;
  t: (key: string) => string;
}

export function SpecSelector({
  data,
  focusedNodeId,
  onSelectSpec,
  onClearSelection,
  t,
}: SpecSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const focusedSpec = useMemo(
    () => (focusedNodeId ? data.nodes.find((n) => n.id === focusedNodeId) : null),
    [focusedNodeId, data]
  );

  const filteredSpecs = useMemo(() => {
    const sortedNodes = [...data.nodes].sort((a, b) => b.number - a.number);
    if (!query.trim()) return sortedNodes.slice(0, 15);
    const q = query.toLowerCase();
    return sortedNodes
      .filter(
        (n) =>
          n.name.toLowerCase().includes(q) ||
          n.number.toString().includes(q) ||
          n.tags.some((tag) => tag.toLowerCase().includes(q))
      )
      .slice(0, 15);
  }, [data, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-[240px] h-9 justify-between px-3 text-xs',
            focusedNodeId && 'border-primary/60 bg-primary/10 text-foreground'
          )}
        >
          {focusedSpec ? (
            <span className="truncate flex items-center">
              <span className="text-muted-foreground mr-2 font-mono">#{focusedSpec.number}</span>
              <span className="truncate">{focusedSpec.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground font-normal">{t('dependenciesPage.selector.placeholder')}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="end">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('dependenciesPage.selector.filterPlaceholder')}
            value={query}
            onValueChange={setQuery}
            className="text-xs"
          />
          <CommandList>
            <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">
              {t('dependenciesPage.selector.empty')}
            </CommandEmpty>
            <CommandGroup>
              {focusedNodeId && (
                <CommandItem
                  onSelect={() => {
                    onClearSelection();
                    setOpen(false);
                    setQuery('');
                  }}
                  className="text-muted-foreground"
                >
                  <X className="mr-2 h-3.5 w-3.5" />
                  {t('dependenciesPage.selector.clearSelection')}
                </CommandItem>
              )}
              {filteredSpecs.map((spec) => (
                <CommandItem
                  key={spec.id}
                  value={spec.id}
                  onSelect={() => {
                    onSelectSpec(spec.id);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <span className="text-muted-foreground font-mono mr-2">#{spec.number}</span>
                  <span className="truncate flex-1">{spec.name}</span>
                  <span
                    className={cn(
                      'text-[9px] px-1 py-0.5 rounded uppercase font-medium ml-2 shrink-0',
                      spec.status === 'draft' && 'bg-slate-500/20 text-slate-600 dark:text-slate-300',
                      spec.status === 'planned' && 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
                      spec.status === 'in-progress' && 'bg-orange-500/20 text-orange-600 dark:text-orange-400',
                      spec.status === 'complete' && 'bg-green-500/20 text-green-600 dark:text-green-400',
                      spec.status === 'archived' && 'bg-gray-500/20 text-gray-500 dark:text-gray-400'
                    )}
                  >
                    {spec.status === 'in-progress' ? 'WIP' : spec.status.slice(0, 3)}
                  </span>
                  <div
                    className={cn(
                      'mr-2 flex h-4 w-4 items-center justify-center',
                      focusedNodeId === spec.id ? 'opacity-100' : 'opacity-0'
                    )}
                  >
                    <Check className="h-4 w-4" />
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
