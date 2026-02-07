/**
 * Tags editor component with add/remove functionality and autocomplete
 * Framework-agnostic version that accepts callbacks
 */

import * as React from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command';
import { cn } from '../../lib/utils';

export interface TagsEditorProps {
  currentTags: string[];
  availableTags?: string[];
  onTagsChange: (newTags: string[]) => Promise<void> | void;
  onFetchAvailableTags?: () => Promise<string[]> | string[];
  disabled?: boolean;
  className?: string;
  labels?: {
    addTag?: string;
    removeTag?: string;
    searchTag?: string;
    createTag?: string;
    noResults?: string;
    existingTags?: string;
    createSection?: string;
    tagExists?: string;
  };
}

const DEFAULT_LABELS = {
  addTag: 'Add tag',
  removeTag: 'Remove tag',
  searchTag: 'Search tags...',
  createTag: 'Create "{tag}"',
  noResults: 'No tags found',
  existingTags: 'Existing tags',
  createSection: 'Create new',
  tagExists: 'Tag already exists',
};

export function TagsEditor({ 
  currentTags, 
  availableTags: initialAvailableTags = [],
  onTagsChange,
  onFetchAvailableTags,
  disabled = false,
  className,
  labels: customLabels,
}: TagsEditorProps) {
  const labels = { ...DEFAULT_LABELS, ...customLabels };
  const [tags, setTags] = React.useState<string[]>(currentTags || []);
  const [allTags, setAllTags] = React.useState<string[]>(initialAvailableTags);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');
  const [isFetchingTags, setIsFetchingTags] = React.useState(false);

  // Update local state when prop changes
  React.useEffect(() => {
    setTags(currentTags || []);
  }, [currentTags]);

  // Fetch available tags when popover opens
  React.useEffect(() => {
    if (isOpen && allTags.length === 0 && onFetchAvailableTags && !isFetchingTags) {
      setIsFetchingTags(true);
      Promise.resolve(onFetchAvailableTags())
        .then((fetchedTags) => {
          setAllTags(fetchedTags);
        })
        .catch((err) => {
          console.error('Failed to fetch tags:', err);
        })
        .finally(() => {
          setIsFetchingTags(false);
        });
    }
  }, [isOpen, allTags.length, onFetchAvailableTags, isFetchingTags]);

  const updateTags = async (newTags: string[]) => {
    const previousTags = tags;
    setTags(newTags); // Optimistic update
    setIsUpdating(true);
    setError(null);

    try {
      await onTagsChange(newTags);
    } catch (err) {
      setTags(previousTags); // Rollback
      const errorMessage = err instanceof Error ? err.message : 'Failed to update';
      setError(errorMessage);
      console.error('Tags update failed:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (!trimmedTag) return;
    if (tags.includes(trimmedTag)) {
      setError(labels.tagExists);
      setTimeout(() => setError(null), 3000);
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

  // Check if search value could be a new tag
  const canCreateNewTag = searchValue.trim() && 
    !tags.includes(searchValue.trim().toLowerCase()) &&
    !allTags.includes(searchValue.trim().toLowerCase());

  return (
    <div className={cn('relative', className)}>
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
                aria-label={labels.removeTag.replace('{tag}', tag)}
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
                aria-label={labels.addTag}
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
                  placeholder={labels.searchTag}
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
                        {labels.createTag.replace('{tag}', searchValue.trim().toLowerCase())}
                      </CommandItem>
                    ) : (
                      <span className="text-muted-foreground px-2 py-1.5 text-sm">
                        {labels.noResults}
                      </span>
                    )}
                  </CommandEmpty>
                  {availableTags.length > 0 && (
                    <CommandGroup heading={labels.existingTags}>
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
                    <CommandGroup heading={labels.createSection}>
                      <CommandItem
                        onSelect={() => handleAddTag(searchValue)}
                        className="cursor-pointer"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {labels.createTag.replace('{tag}', searchValue.trim().toLowerCase())}
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
