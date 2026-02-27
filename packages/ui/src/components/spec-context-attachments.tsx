import { useMemo, useState } from 'react';
import type { SourceDocumentUIPart } from 'ai';
import {
  Attachment,
  AttachmentInfo,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
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
import { AtSign, Check } from 'lucide-react';
import type { Spec } from '../types/api';

interface SpecContextAttachmentsProps {
  specs: Spec[];
  selectedSpecIds: string[];
  onSelectedSpecIdsChange: (next: string[]) => void;
  addLabel: string;
  searchPlaceholder: string;
  emptyLabel: string;
  triggerLabel: string;
  className?: string;
}

function toSourceDocument(spec: Spec): SourceDocumentUIPart & { id: string } {
  return {
    id: spec.specName,
    type: 'source-document',
    sourceId: spec.specName,
    title: spec.title ?? spec.specName,
    filename: spec.specName,
    mediaType: 'text/markdown',
  } as SourceDocumentUIPart & { id: string };
}

export function SpecContextAttachments({
  specs,
  selectedSpecIds,
  onSelectedSpecIdsChange,
  addLabel,
  searchPlaceholder,
  emptyLabel,
  triggerLabel,
  className,
}: SpecContextAttachmentsProps) {
  const [open, setOpen] = useState(false);
  const selectedSpecs = useMemo(
    () => selectedSpecIds.map((id) => specs.find((spec) => spec.specName === id)).filter(Boolean) as Spec[],
    [selectedSpecIds, specs]
  );

  const toggleSpec = (specId: string) => {
    if (selectedSpecIds.includes(specId)) {
      onSelectedSpecIdsChange(selectedSpecIds.filter((id) => id !== specId));
      return;
    }
    onSelectedSpecIdsChange([...selectedSpecIds, specId]);
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 rounded-full border border-border/70 px-3 text-xs"
            title={triggerLabel}
          >
            <AtSign className="h-3.5 w-3.5" />
            {addLabel}
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
                        <div className="truncate text-xs font-medium">{spec.specName}</div>
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

      {selectedSpecs.length > 0 && (
        <Attachments variant="inline" className="gap-1.5">
          {selectedSpecs.map((spec) => (
            <Attachment
              key={spec.specName}
              data={toSourceDocument(spec)}
              onRemove={() => onSelectedSpecIdsChange(selectedSpecIds.filter((id) => id !== spec.specName))}
            >
              <AttachmentPreview />
              <AttachmentInfo />
              <AttachmentRemove />
            </Attachment>
          ))}
        </Attachments>
      )}
    </div>
  );
}
