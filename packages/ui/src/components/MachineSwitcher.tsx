import { useState } from 'react';
import { Check, ChevronsUpDown, Cpu, PlugZap, WifiOff } from 'lucide-react';
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from '@leanspec/ui-components';
import { useTranslation } from 'react-i18next';
import { useMachineStore } from '../stores/machine';

export function MachineSwitcher() {
  const { machineModeEnabled, machines, currentMachine, selectMachine, loading } = useMachineStore();
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);

  if (!machineModeEnabled) return null;

  const selectedLabel = currentMachine?.label || t('machines.noSelection');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-8 px-2 gap-2 text-xs"
          aria-label={t('machines.switcherLabel')}
          disabled={loading}
        >
          <Cpu className="h-3.5 w-3.5" />
          <span className="truncate max-w-[160px]">{selectedLabel}</span>
          {currentMachine?.status === 'offline' ? (
            <WifiOff className="h-3.5 w-3.5 text-destructive" />
          ) : (
            <PlugZap className="h-3.5 w-3.5 text-emerald-500" />
          )}
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0">
        <Command>
          <CommandList>
            <CommandEmpty>{t('machines.empty')}</CommandEmpty>
            <CommandGroup heading={t('machines.available')}
            >
              {machines.map((machine) => (
                <CommandItem
                  key={machine.id}
                  onSelect={() => {
                    selectMachine(machine.id);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2 w-full">
                    <Cpu className="h-4 w-4" />
                    <span className="truncate flex-1">{machine.label}</span>
                    <span
                      className={cn(
                        'text-[10px] uppercase tracking-wide',
                        machine.status === 'online' ? 'text-emerald-500' : 'text-destructive'
                      )}
                    >
                      {machine.status === 'online' ? t('machines.status.online') : t('machines.status.offline')}
                    </span>
                    <div
                      className={cn(
                        'mr-1 flex h-4 w-4 items-center justify-center',
                        currentMachine?.id === machine.id ? 'opacity-100' : 'opacity-0'
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </div>
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
