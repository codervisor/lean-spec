import { useState } from 'react';
import { Button, Popover, PopoverContent, PopoverTrigger } from '@leanspec/ui-components';
import { cn } from '@leanspec/ui-components';
import { useTranslation } from 'react-i18next';

const PROJECT_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#d946ef',
  '#ec4899',
  '#6b7280',
  '#78716c',
];

interface ColorPickerProps {
  value?: string | null;
  onChange: (color: string) => void;
  disabled?: boolean;
}

export function ColorPicker({ value, onChange, disabled }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation('common');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={disabled}
          aria-label={t('colorPicker.pickColor')}
        >
          <div
            className="h-4 w-4 rounded-full border"
            style={{ backgroundColor: value || '#666' }}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-3" align="start">
        <div className="grid grid-cols-6 gap-2">
          {PROJECT_COLORS.map((color) => (
            <button
              key={color}
              className={cn(
                'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
                value === color ? 'border-primary' : 'border-transparent'
              )}
              style={{ backgroundColor: color }}
              onClick={() => {
                onChange(color);
                setOpen(false);
              }}
              aria-label={t('colorPicker.selectColor', { color })}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
