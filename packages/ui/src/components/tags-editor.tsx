/**
 * Tags editor component with add/remove functionality and autocomplete
 */

'use client';

import * as React from 'react';
import { X, Plus, Loader2, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface TagsEditorProps {
  specId: string;
  currentTags: string[];
  onUpdate?: (newTags: string[]) => void;
  disabled?: boolean;
  projectId: string;
}

export function TagsEditor({ 
  specId, 
  currentTags, 
  onUpdate,
  disabled = false,
  projectId 
}: TagsEditorProps) {
  const [tags, setTags] = React.useState<string[]>(currentTags || []);
  const [allTags, setAllTags] = React.useState<string[]>([]);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');

  // Fetch all available tags for autocomplete when popover opens
  React.useEffect(() => {
    if (isOpen && allTags.length === 0) {
      const fetchTags = async () => {
        try {
          const apiUrl = `/api/projects/${projectId}/tags`;
          const response = await fetch(apiUrl);
          if (response.ok) {
            const data = await response.json();
            setAllTags(data.tags || []);
          }
        } catch (err) {
          console.error('Failed to fetch tags:', err);
        }
      };
      fetchTags();
    }
  }, [isOpen, allTags.length, projectId]);

  const updateTags = async (newTags: string[]) => {
    const previousTags = tags;
    setTags(newTags); // Optimistic update
    setIsUpdating(true);
    setError(null);

    try {
      const apiUrl = `/api/projects/${projectId}/specs/${specId}/metadata`;
      
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

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (!trimmedTag) return;
    if (tags.includes(trimmedTag)) {
      setError('Tag already exists');
      return;
    }
    
    const newTags = [...tags, trimmedTag];
    updateTags(newTags);
    setSearchValue('');
    setIsOpen(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter(t => t !== tagToRemove);
    updateTags(newTags);
  };

  // Filter available tags: show tags that aren't already added and match search
  const availableTags = React.useMemo(() => {
    const lowercaseSearch = searchValue.toLowerCase();
    return allTags
      .filter(tag => !tags.includes(tag))
      .filter(tag => !lowercaseSearch || tag.toLowerCase().includes(lowercaseSearch));
  }, [allTags, tags, searchValue]);

  // Check if search value could be a new tag (not in available tags)
  const canCreateNewTag = searchValue.trim() && 
    !tags.includes(searchValue.trim().toLowerCase()) &&
    !allTags.includes(searchValue.trim().toLowerCase());

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
            <PopoverContent className="w-56 p-0" align="start">
              <Command>
                <CommandInput 
                  placeholder="Search or create tag..." 
                  value={searchValue}
                  onValueChange={setSearchValue}
                />
                <CommandList>
                  <CommandEmpty>
                    {canCreateNewTag ? (
                      <CommandItem
                        onSelect={() => handleAddTag(searchValue)}
                        className="cursor-pointer"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create &quot;{searchValue.trim().toLowerCase()}&quot;
                      </CommandItem>
                    ) : (
                      <span className="text-muted-foreground px-2 py-1.5 text-sm">
                        No tags found.
                      </span>
                    )}
                  </CommandEmpty>
                  {availableTags.length > 0 && (
                    <CommandGroup heading="Existing tags">
                      {availableTags.slice(0, 10).map((tag) => (
                        <CommandItem
                          key={tag}
                          value={tag}
                          onSelect={() => handleAddTag(tag)}
                          className="cursor-pointer"
                        >
                          {tag}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {canCreateNewTag && availableTags.length > 0 && (
                    <CommandGroup heading="Create new">
                      <CommandItem
                        onSelect={() => handleAddTag(searchValue)}
                        className="cursor-pointer"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create &quot;{searchValue.trim().toLowerCase()}&quot;
                      </CommandItem>
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
              {error && (
                <p className="text-xs text-destructive px-2 pb-2">{error}</p>
              )}
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
