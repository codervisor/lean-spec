/**
 * SearchInput component
 * Input field with search icon and keyboard shortcut hint
 */

import * as React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  /** Current search value */
  value?: string;
  /** Callback when value changes */
  onChange?: (value: string) => void;
  /** Callback when search is submitted (Enter key) */
  onSearch?: (value: string) => void;
  /** Show keyboard shortcut hint */
  showShortcut?: boolean;
  /** Keyboard shortcut key (displayed in hint) */
  shortcutKey?: string;
  /** Show clear button when there's a value */
  clearable?: boolean;
  /** Additional CSS classes for the container */
  containerClassName?: string;
}

export function SearchInput({
  value = '',
  onChange,
  onSearch,
  showShortcut = true,
  shortcutKey = 'K',
  clearable = true,
  className,
  containerClassName,
  placeholder = 'Search...',
  ...props
}: SearchInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Handle keyboard shortcut
  React.useEffect(() => {
    if (!showShortcut) return;

    const down = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === shortcutKey.toLowerCase() && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [showShortcut, shortcutKey]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch?.(value);
    }
    if (e.key === 'Escape') {
      onChange?.('');
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    onChange?.('');
    inputRef.current?.focus();
  };

  return (
    <div className={cn('relative', containerClassName)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="search"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn('pl-9', clearable && value && 'pr-16', className)}
        {...props}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {clearable && value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleClear}
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
        {showShortcut && !value && (
          <kbd className="pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 hidden sm:inline-flex">
            <span className="text-xs">⌘</span>
            {shortcutKey}
          </kbd>
        )}
      </div>
    </div>
  );
}
