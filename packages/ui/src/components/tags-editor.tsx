/**
 * Tags editor component with add/remove functionality
 */

'use client';

import * as React from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface TagsEditorProps {
  specId: string;
  currentTags: string[];
  onUpdate?: (newTags: string[]) => void;
  disabled?: boolean;
  projectId?: string;
}

export function TagsEditor({ 
  specId, 
  currentTags, 
  onUpdate,
  disabled = false,
  projectId 
}: TagsEditorProps) {
  const [tags, setTags] = React.useState<string[]>(currentTags || []);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [newTag, setNewTag] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const updateTags = async (newTags: string[]) => {
    const previousTags = tags;
    setTags(newTags); // Optimistic update
    setIsUpdating(true);
    setError(null);

    try {
      const apiUrl = projectId
        ? `/api/projects/${projectId}/specs/${specId}/metadata`
        : `/api/specs/${specId}/metadata`;
      
      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: newTags }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update tags');
      }

      onUpdate?.(newTags);
      toast.success('Tags updated');
    } catch (err) {
      setTags(previousTags); // Rollback
      const errorMessage = err instanceof Error ? err.message : 'Failed to update';
      setError(errorMessage);
      toast.error('Failed to update tags', { description: errorMessage });
      console.error('Tags update failed:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddTag = () => {
    const trimmedTag = newTag.trim().toLowerCase();
    if (!trimmedTag) return;
    if (tags.includes(trimmedTag)) {
      setError('Tag already exists');
      return;
    }
    
    const newTags = [...tags, trimmedTag];
    updateTags(newTags);
    setNewTag('');
    setIsOpen(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter(t => t !== tagToRemove);
    updateTags(newTags);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex gap-1 flex-wrap items-center">
        {tags.map((tag) => (
          <Badge 
            key={tag} 
            variant="outline" 
            className={cn(
              "text-xs pr-1 gap-1",
              disabled && "opacity-50"
            )}
          >
            {tag}
            {!disabled && (
              <button
                onClick={() => handleRemoveTag(tag)}
                disabled={isUpdating}
                className="ml-1 rounded-full hover:bg-muted p-0.5 transition-colors"
                aria-label={`Remove ${tag} tag`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
        
        {!disabled && (
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-xs"
                disabled={isUpdating}
                aria-label="Add new tag"
              >
                {isUpdating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={newTag}
                  onChange={(e) => {
                    setNewTag(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Add tag..."
                  className="h-8 text-sm"
                  autoFocus
                />
                <Button
                  size="sm"
                  className="h-8 px-2"
                  onClick={handleAddTag}
                  disabled={!newTag.trim()}
                >
                  Add
                </Button>
              </div>
              {error && (
                <p className="text-xs text-destructive mt-1">{error}</p>
              )}
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
