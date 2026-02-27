import { useMemo, useState } from 'react';
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
import { Check, Plus, X } from 'lucide-react';
import type { Spec } from '../types/api';

interface SpecContextAttachmentsProps {
  specs: Spec[];
  selectedSpecIds: string[];
  onSelectedSpecIdsChange: (next: string[]) => void;
  searchPlaceholder: string;
  emptyLabel: string;
  triggerLabel: string;
  className?: string;
}

/** Compact chip showing a selected spec as #NNN with a remove button. */
function SpecChip({ spec, onRemove }: { spec: Spec; onRemove: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
      title={spec.title ?? spec.specName}
    >
      #{spec.id}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-sm text-muted-foreground hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

/** Renders the selected spec chips. Place this above the textarea (e.g. in PromptInputHeader). */
export function SpecContextChips({
  specs,
  selectedSpecIds,
  onSelectedSpecIdsChange,
  className,
}: {
  specs: Spec[];
  selectedSpecIds: string[];
  onSelectedSpecIdsChange: (next: string[]) => void;
  className?: string;
}) {
  const selectedSpecs = useMemo(
    () => selectedSpecIds.map((id) => specs.find((spec) => spec.specName === id)).filter(Boolean) as Spec[],
    [selectedSpecIds, specs],
  );

  if (selectedSpecs.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {selectedSpecs.map((spec) => (
        <SpecChip
          key={spec.specName}
          spec={spec}
          onRemove={() => onSelectedSpecIdsChange(selectedSpecIds.filter((id) => id !== spec.specName))}
        />
      ))}
    </div>
  );
}

/** Plus-icon button that opens a searchable spec picker popover. */
export function SpecContextTrigger({
  specs,
  selectedSpecIds,
  onSelectedSpecIdsChange,
  searchPlaceholder,
  emptyLabel,
  triggerLabel,
  className,
}: SpecContextAttachmentsProps) {
  const [open, setOpen] = useState(false);

  const toggleSpec = (specId: string) => {
    if (selectedSpecIds.includes(specId)) {
      onSelectedSpecIdsChange(selectedSpecIds.filter((id) => id !== specId));
      return;
    }
    onSelectedSpecIdsChange([...selectedSpecIds, specId]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('h-6 w-6 rounded', className)}
          title={triggerLabel}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {specs.map((spec) => {
                const selected = selectedSpecIds.includes(spec.specName);
                return (
                  <CommandItem
                    key={spec.specName}
                    value={`${spec.specName} ${spec.title ?? ''}`}
                    onSelect={() => toggleSpec(spec.specName)}
                    className="cursor-pointer"
                  >
                    <Check className={cn('mr-2 h-4 w-4', selected ? 'opacity-100' : 'opacity-0')} />
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium">#{spec.id}</div>
                      {spec.title && <div className="truncate text-xs text-muted-foreground">{spec.title}</div>}
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

/**
 * @deprecated Use SpecContextTrigger + SpecContextChips separately for the new layout.
 */
export function SpecContextAttachments(props: SpecContextAttachmentsProps & { addLabel?: string }) {
  const { className, ...rest } = props;
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <SpecContextTrigger {...rest} />
      <SpecContextChips
        specs={rest.specs}
        selectedSpecIds={rest.selectedSpecIds}
        onSelectedSpecIdsChange={rest.onSelectedSpecIdsChange}
      />
    </div>
  );
}
