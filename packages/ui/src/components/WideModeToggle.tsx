import { useState } from 'react';
import { Monitor, Scan, Check } from 'lucide-react';
import { useLayout } from '../contexts';
import { Button, cn } from '@leanspec/ui-components';
import { useTranslation } from 'react-i18next';

export function WideModeToggle() {
  const { isWideMode, toggleWideMode } = useLayout();
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);

  const modes = [
    { value: 'normal', icon: Scan, label: t('wideMode.normal') },
    { value: 'wide', icon: Monitor, label: t('wideMode.wide') },
  ] as const;

  const currentMode = isWideMode ? 'wide' : 'normal';

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        aria-label={t('wideMode.toggle')}
        className={cn("h-9 w-9 sm:h-10 sm:w-10", open && "bg-accent")}
        data-tauri-drag-region="false"
      >
        {isWideMode ? (
          <Monitor className="h-5 w-5" />
        ) : (
          <Scan className="h-5 w-5" />
        )}
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-36 z-50 rounded-md border bg-popover p-1 shadow-md">
            {modes.map(({ value, icon: Icon, label }) => (
              <Button
                key={value}
                onClick={() => {
                  if ((value === 'wide') !== isWideMode) {
                    toggleWideMode();
                  }
                  setOpen(false);
                }}
                variant="ghost"
                size="sm"
                className={cn(
                  'w-full justify-start h-8 px-2',
                  currentMode === value && 'bg-accent'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{label}</span>
                {currentMode === value && <Check className="h-3 w-3 ml-2" />}
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
