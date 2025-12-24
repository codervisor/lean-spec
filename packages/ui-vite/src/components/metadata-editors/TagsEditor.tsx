import { useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { Badge, Button, Input } from '@leanspec/ui-components';
import { cn } from '../../lib/utils';
import { api, type Spec } from '../../lib/api';

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
      const message = err instanceof Error ? err.message : 'Failed to update tags';
      setError(message);
    } finally {
      setUpdating(false);
    }
  };

  const handleAdd = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (tags.includes(trimmed)) {
      setError('Tag already added');
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
            className="text-xs pr-1 gap-1"
          >
            {tag}
            {!disabled && (
              <button
                onClick={() => handleRemove(tag)}
                disabled={updating}
                className="ml-1 rounded-full hover:bg-muted p-0.5 transition-colors"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
        {tags.length === 0 && <span className="text-xs text-muted-foreground">No tags yet</span>}
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
            placeholder="Add tag"
            className="h-9"
            aria-label="Add tag"
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
            Add
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
