import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../contexts';
import { cn, Button } from '@leanspec/ui-components';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: 'light' as const, icon: Sun, label: 'Light' },
    { value: 'dark' as const, icon: Moon, label: 'Dark' },
    { value: 'system' as const, icon: Monitor, label: 'System' },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-secondary rounded-lg">
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = theme === option.value;
        return (
          <Button
            key={option.value}
            onClick={() => setTheme(option.value)}
            title={option.label}
            variant="ghost"
            size="icon"
            className={cn(
              'h-7 w-7',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-4 h-4" />
          </Button>
        );
      })}
    </div>
  );
}
