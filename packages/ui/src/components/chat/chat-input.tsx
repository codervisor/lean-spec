import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, cn } from '@/library';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSubmit, isLoading, disabled, placeholder }: ChatInputProps) {
  const { t } = useTranslation('common');
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed && !isLoading && !disabled) {
      onSubmit(trimmed);
      setInput('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const isDisabled = disabled || isLoading || !input.trim();

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex items-end gap-2 rounded-lg border bg-background p-2 shadow-sm focus-within:ring-1 focus-within:ring-ring">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t('chat.placeholder')}
          disabled={disabled}
          rows={1}
          className={cn(
            'flex-1 resize-none bg-transparent px-2 py-1.5 text-sm',
            'placeholder:text-muted-foreground',
            'focus:outline-none',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'min-h-[36px] max-h-[200px]'
          )}
        />
        <Button
          type="submit"
          size="icon"
          disabled={isDisabled}
          className="flex-shrink-0 h-9 w-9"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          <span className="sr-only">{t('chat.send')}</span>
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground text-center">
        {t('chat.helper')}
      </p>
    </form>
  );
}
