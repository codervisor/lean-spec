import { useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { Badge, Button, Input } from '@leanspec/ui-components';
import { cn } from '../../lib/utils';
import { api, type Spec } from '../../lib/api';
import { useTranslation } from 'react-i18next';

interface TagsEditorProps {
  specName: string;
  value: Spec['tags'];
  onChange?: (tags: string[]) => void;
  disabled?: boolean;
  className?: string;
}

export function TagsEditor({ specName, value, onChange, disabled = false, className }: TagsEditorProps) {
  const [tags, setTags] = useState<string[]>(value || []);
  const [input, setInput] = useState('');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation('common');

  const persist = async (next: string[]) => {
    const previous = tags;
    setTags(next);
    setUpdating(true);
    setError(null);

    try {
      await api.updateSpec(specName, { tags: next });
      onChange?.(next);
    } catch (err) {
      setTags(previous);
      const message = err instanceof Error ? err.message : t('editors.tagsError');
      setError(message);
    } finally {
      setUpdating(false);
    }
  };

  const handleAdd = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (tags.includes(trimmed)) {
      setError(t('editors.tagExists'));
      return;
    }
    void persist([...tags, trimmed]);
    setInput('');
  };

  const handleRemove = (tag: string) => {
    void persist(tags.filter((t) => t !== tag));
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            className="text-xs pr-0.5 gap-1 h-6"
          >
            {tag}
            {!disabled && (
              <Button
                onClick={() => handleRemove(tag)}
                disabled={updating}
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 rounded-full hover:bg-muted ml-0.5"
                aria-label={t('editors.removeTag', { tag })}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </Badge>
        ))}
        {tags.length === 0 && <span className="text-xs text-muted-foreground">{t('editors.noTags')}</span>}
      </div>

      {!disabled && (
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder={t('editors.addTag')}
            className="h-9"
            aria-label={t('editors.addTag')}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAdd}
            disabled={updating}
            className="gap-1"
          >
            {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {t('actions.add')}
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
