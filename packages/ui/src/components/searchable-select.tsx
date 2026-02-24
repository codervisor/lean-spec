import { useState } from 'react';
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
import { Check, ChevronsUpDown } from 'lucide-react';

export interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
}: SearchableSelectProps) {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value
            ? (options.find((option) => option.value === value)?.label ?? value)
            : placeholder ?? t('sessions.select.placeholder')}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder ?? t('sessions.select.search')} />
          <CommandList>
            <CommandEmpty>{emptyText ?? t('sessions.select.empty')}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  className="cursor-pointer"
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
